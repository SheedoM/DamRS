create or replace function public.sync_project_status_after_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.submitted_at is null then
    return new;
  end if;

  if new.review_type = 'final' then
    update public.projects
    set
      status = 'final_reviewed',
      submitted_at = coalesce(submitted_at, now())
    where id = new.project_id
      and status <> 'completed';
  elsif new.review_type = 'draft' then
    update public.projects
    set
      status = 'draft_reviewed',
      submitted_at = coalesce(submitted_at, now())
    where id = new.project_id
      and status in ('draft', 'submitted', 'assigned');
  end if;

  return new;
end;
$$;

drop trigger if exists reviews_sync_project_status on public.reviews;

create trigger reviews_sync_project_status
after insert or update of review_type, submitted_at on public.reviews
for each row
execute function public.sync_project_status_after_review();

-- Backfill final reviews for projects reviewed before the trigger existed.
update public.projects
set
  status = 'final_reviewed',
  submitted_at = coalesce(submitted_at, now())
where status <> 'completed'
  and exists (
    select 1
    from public.reviews
    where reviews.project_id = projects.id
      and reviews.review_type = 'final'
      and reviews.submitted_at is not null
  );

-- Backfill draft reviews without downgrading final-reviewed or completed projects.
update public.projects
set
  status = 'draft_reviewed',
  submitted_at = coalesce(submitted_at, now())
where status in ('draft', 'submitted', 'assigned')
  and exists (
    select 1
    from public.reviews
    where reviews.project_id = projects.id
      and reviews.review_type = 'draft'
      and reviews.submitted_at is not null
  );

grant execute on function public.sync_project_status_after_review() to authenticated;

