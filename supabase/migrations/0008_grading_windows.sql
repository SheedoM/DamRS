-- Admin-controlled grading window: gates panel-member access to reviews.
create table if not exists public.grading_windows (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.discussion_cycles(id) on delete cascade,
  is_open boolean not null default false,
  allow_edit_after_final boolean not null default false,
  opened_at timestamptz,
  closed_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grading_windows_one_per_cycle unique (cycle_id)
);

create trigger grading_windows_set_updated_at
before update on public.grading_windows
for each row
execute function public.set_updated_at();

-- True when the grading window for the given cycle is currently open.
create or replace function public.is_grading_open(target_cycle_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.grading_windows gw
    where gw.cycle_id = target_cycle_id
      and gw.is_open = true
  )
$$;

-- True when the grading window for the project's cycle is open.
create or replace function public.is_project_grading_open(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.projects p
    join public.grading_windows gw on gw.cycle_id = p.cycle_id
    where p.id = target_project_id
      and gw.is_open = true
  )
$$;

-- True when panel members may edit reviews even after their own final submission.
create or replace function public.grading_allows_edit_after_final(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.projects p
    join public.grading_windows gw on gw.cycle_id = p.cycle_id
    where p.id = target_project_id
      and gw.is_open = true
      and gw.allow_edit_after_final = true
  )
$$;

alter table public.grading_windows enable row level security;

create policy "Admins can manage grading windows"
on public.grading_windows
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Authenticated users can read grading windows"
on public.grading_windows
for select
to authenticated
using (public.is_admin() or exists (
  select 1
  from public.discussion_cycles dc
  where dc.id = grading_windows.cycle_id
    and dc.is_active = true
));

-- Gate panel review access on the grading window being open.
drop policy if exists "Panel members can read own reviews for assigned projects" on public.reviews;
create policy "Panel members can read own reviews for assigned projects"
on public.reviews
for select
to authenticated
using (
  panel_member_id = auth.uid()
  and public.is_panel_assigned_to_project(project_id)
  and public.is_project_grading_open(project_id)
);

drop policy if exists "Panel members can manage own reviews for assigned projects" on public.reviews;
create policy "Panel members can manage own reviews for assigned projects"
on public.reviews
for insert
to authenticated
with check (
  panel_member_id = auth.uid()
  and public.current_user_role() = 'panel_member'
  and public.is_panel_assigned_to_project(project_id)
  and public.is_project_grading_open(project_id)
);

drop policy if exists "Panel members can update own reviews for assigned projects" on public.reviews;
create policy "Panel members can update own reviews for assigned projects"
on public.reviews
for update
to authenticated
using (
  panel_member_id = auth.uid()
  and public.current_user_role() = 'panel_member'
  and public.is_panel_assigned_to_project(project_id)
  and public.is_project_grading_open(project_id)
  and (final_submitted_at is null or public.grading_allows_edit_after_final(project_id))
)
with check (
  panel_member_id = auth.uid()
  and public.current_user_role() = 'panel_member'
  and public.is_panel_assigned_to_project(project_id)
  and public.is_project_grading_open(project_id)
);

-- Panel members may only read projects/team/files while the grading window is open.
drop policy if exists "Panel members can read assigned projects" on public.projects;
create policy "Panel members can read assigned projects"
on public.projects
for select
to authenticated
using (
  public.is_panel_assigned_to_project(id)
  and public.is_project_grading_open(id)
);

drop policy if exists "Panel members can read team members for assigned projects" on public.team_members;
create policy "Panel members can read team members for assigned projects"
on public.team_members
for select
to authenticated
using (
  public.is_panel_assigned_to_project(project_id)
  and public.is_project_grading_open(project_id)
);

drop policy if exists "Panel members can read files for assigned projects" on public.project_files;
create policy "Panel members can read files for assigned projects"
on public.project_files
for select
to authenticated
using (
  public.is_panel_assigned_to_project(project_id)
  and public.is_project_grading_open(project_id)
);

-- Panel storage/file reads (via can_read_project) also respect the grading window.
create or replace function public.can_read_project(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.is_admin(), false)
    or exists (
      select 1
      from public.projects p
      where p.id = target_project_id
        and p.team_leader_id = auth.uid()
    )
    or (
      public.is_panel_assigned_to_project(target_project_id)
      and public.is_project_grading_open(target_project_id)
    )
$$;

grant execute on function public.is_grading_open(uuid) to authenticated;
grant execute on function public.is_project_grading_open(uuid) to authenticated;
grant execute on function public.grading_allows_edit_after_final(uuid) to authenticated;
grant select, insert, update, delete on public.grading_windows to authenticated;
