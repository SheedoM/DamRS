do $$
begin
  create type public.review_status as enum ('draft_reviewed', 'final_reviewed');
exception
  when duplicate_object then null;
end $$;

drop trigger if exists reviews_sync_project_status on public.reviews;
drop function if exists public.sync_project_status_after_review();

alter table public.reviews
  drop constraint if exists reviews_one_type_per_panel_member;

alter table public.reviews add column if not exists status public.review_status;
alter table public.reviews add column if not exists draft_notes text;
alter table public.reviews add column if not exists draft_questions text;
alter table public.reviews add column if not exists draft_submitted_at timestamptz;
alter table public.reviews add column if not exists final_notes text;
alter table public.reviews add column if not exists final_submitted_at timestamptz;

update public.reviews
set
  draft_notes = notes,
  draft_questions = questions,
  draft_submitted_at = submitted_at,
  status = 'draft_reviewed'
where review_type = 'draft';

update public.reviews
set
  final_notes = notes,
  final_submitted_at = submitted_at,
  status = 'final_reviewed'
where review_type = 'final';

with final_reviews as (
  select
    project_id,
    panel_member_id,
    presentation_score,
    discussion_score,
    final_notes,
    final_submitted_at
  from public.reviews
  where review_type = 'final'
)
update public.reviews draft_reviews
set
  presentation_score = final_reviews.presentation_score,
  discussion_score = final_reviews.discussion_score,
  final_notes = final_reviews.final_notes,
  final_submitted_at = final_reviews.final_submitted_at,
  status = case
    when final_reviews.final_submitted_at is not null then 'final_reviewed'::public.review_status
    else coalesce(draft_reviews.status, 'draft_reviewed'::public.review_status)
  end
from final_reviews
where draft_reviews.project_id = final_reviews.project_id
  and draft_reviews.panel_member_id = final_reviews.panel_member_id
  and draft_reviews.review_type = 'draft';

delete from public.reviews final_reviews
using public.reviews draft_reviews
where final_reviews.project_id = draft_reviews.project_id
  and final_reviews.panel_member_id = draft_reviews.panel_member_id
  and final_reviews.review_type = 'final'
  and draft_reviews.review_type = 'draft';

update public.reviews
set status = coalesce(status, 'draft_reviewed'::public.review_status);

alter table public.reviews
  alter column status set default 'draft_reviewed',
  alter column status set not null;

alter table public.reviews drop column if exists review_type;
alter table public.reviews drop column if exists notes;
alter table public.reviews drop column if exists questions;
alter table public.reviews drop column if exists submitted_at;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviews_one_per_panel_member_per_project'
  ) then
    alter table public.reviews
      add constraint reviews_one_per_panel_member_per_project unique (project_id, panel_member_id);
  end if;
end $$;

create table if not exists public.project_grade_overrides (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  documentation_score numeric(5,2) not null default 0 check (documentation_score between 0 and 20),
  implementation_score numeric(5,2) not null default 0 check (implementation_score between 0 and 25),
  code_quality_score numeric(5,2) not null default 0 check (code_quality_score between 0 and 20),
  innovation_score numeric(5,2) not null default 0 check (innovation_score between 0 and 15),
  presentation_score numeric(5,2) not null default 0 check (presentation_score between 0 and 10),
  discussion_score numeric(5,2) not null default 0 check (discussion_score between 0 and 10),
  total_score numeric(6,2) generated always as (
    documentation_score
    + implementation_score
    + code_quality_score
    + innovation_score
    + presentation_score
    + discussion_score
  ) stored,
  reason text not null,
  overridden_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  is_active boolean not null default true
);

create unique index if not exists project_grade_overrides_one_active_per_project
on public.project_grade_overrides (project_id)
where is_active = true;

alter table public.project_grade_overrides enable row level security;

drop policy if exists "Admins can manage project grade overrides" on public.project_grade_overrides;

create policy "Admins can manage project grade overrides"
on public.project_grade_overrides
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.recompute_project_review_status(target_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  active_assignment_count integer;
  next_status public.project_status;
  current_status public.project_status;
begin
  select status
  into current_status
  from public.projects
  where id = target_project_id;

  if current_status is null or current_status = 'completed' then
    return;
  end if;

  select count(*)
  into active_assignment_count
  from public.panel_assignments
  where project_id = target_project_id
    and is_active = true
    and revoked_at is null;

  if active_assignment_count = 0 then
    next_status := case
      when current_status = 'draft' then 'draft'::public.project_status
      else 'submitted'::public.project_status
    end;
  elsif not exists (
    select 1
    from public.panel_assignments pa
    left join public.reviews r
      on r.project_id = pa.project_id
      and r.panel_member_id = pa.panel_member_id
    where pa.project_id = target_project_id
      and pa.is_active = true
      and pa.revoked_at is null
      and coalesce(r.status::text, '') <> 'final_reviewed'
  ) then
    next_status := 'final_reviewed';
  elsif not exists (
    select 1
    from public.panel_assignments pa
    left join public.reviews r
      on r.project_id = pa.project_id
      and r.panel_member_id = pa.panel_member_id
    where pa.project_id = target_project_id
      and pa.is_active = true
      and pa.revoked_at is null
      and coalesce(r.status::text, '') not in ('draft_reviewed', 'final_reviewed')
  ) then
    next_status := 'draft_reviewed';
  else
    next_status := 'assigned';
  end if;

  update public.projects
  set
    status = next_status,
    submitted_at = case
      when next_status = 'draft' then submitted_at
      else coalesce(submitted_at, now())
    end
  where id = target_project_id;
end;
$$;

create or replace function public.recompute_project_review_status_from_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_project_review_status(new.project_id);
  return new;
end;
$$;

create or replace function public.recompute_project_review_status_from_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_project_review_status(new.project_id);
  return new;
end;
$$;

drop trigger if exists reviews_recompute_project_status on public.reviews;

create trigger reviews_recompute_project_status
after insert or update of status, draft_submitted_at, final_submitted_at on public.reviews
for each row
execute function public.recompute_project_review_status_from_review();

drop trigger if exists panel_assignments_recompute_project_status on public.panel_assignments;

create trigger panel_assignments_recompute_project_status
after insert or update of is_active, revoked_at on public.panel_assignments
for each row
execute function public.recompute_project_review_status_from_assignment();

do $$
declare
  project_record record;
begin
  for project_record in
    select distinct p.id
    from public.projects p
    left join public.panel_assignments pa on pa.project_id = p.id
    left join public.reviews r on r.project_id = p.id
    where pa.id is not null or r.id is not null
  loop
    perform public.recompute_project_review_status(project_record.id);
  end loop;
end $$;

grant usage on type public.review_status to authenticated;
grant select, insert, update, delete on public.project_grade_overrides to authenticated;
grant execute on function public.recompute_project_review_status(uuid) to authenticated;
grant execute on function public.recompute_project_review_status_from_review() to authenticated;
grant execute on function public.recompute_project_review_status_from_assignment() to authenticated;

