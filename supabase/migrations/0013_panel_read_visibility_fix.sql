-- Fix: panel members could not see their assigned projects when the grading
-- window was closed. Migration 0008 gated the panel READ policies on
-- is_project_grading_open(), which is false by default. That hid assignments,
-- team members and files entirely instead of only blocking grade entry.
--
-- Correct model: panel members may always READ their assigned projects/team/
-- files; only WRITES (reviews, discussion scores) stay gated by the grading
-- window (those write policies are unchanged and remain gated).

-- Projects: visible whenever assigned, regardless of grading window.
drop policy if exists "Panel members can read assigned projects" on public.projects;
create policy "Panel members can read assigned projects"
on public.projects
for select
to authenticated
using (
  public.is_panel_assigned_to_project(id)
);

drop policy if exists "Panel members can read team members for assigned projects" on public.team_members;
create policy "Panel members can read team members for assigned projects"
on public.team_members
for select
to authenticated
using (
  public.is_panel_assigned_to_project(project_id)
);

drop policy if exists "Panel members can read files for assigned projects" on public.project_files;
create policy "Panel members can read files for assigned projects"
on public.project_files
for select
to authenticated
using (
  public.is_panel_assigned_to_project(project_id)
);

-- Panel members read their own discussion scores whenever assigned (so saved
-- drafts remain visible after the window closes). Writes stay window-gated.
drop policy if exists "Panel members read own discussion scores" on public.student_discussion_scores;
create policy "Panel members read own discussion scores"
on public.student_discussion_scores
for select
to authenticated
using (
  panel_member_id = auth.uid()
  and public.is_panel_assigned_to_project(project_id)
);

-- can_read_project gates storage/file reads. Restore unconditional panel read
-- for assigned projects (no grading-window requirement).
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
    or public.is_panel_assigned_to_project(target_project_id)
$$;

-- Allow panel members to read the team-leader profile of projects they are
-- assigned to, so team_leader_name resolves instead of showing "unknown".
drop policy if exists "Panel members can read team leader profiles" on public.profiles;
create policy "Panel members can read team leader profiles"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    join public.panel_assignments pa on pa.project_id = p.id
    where p.team_leader_id = public.profiles.id
      and pa.panel_member_id = auth.uid()
      and pa.is_active = true
      and pa.revoked_at is null
  )
);
