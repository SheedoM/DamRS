-- Term-aware grading + a committee/supervisor role on panel assignments.
--
-- - Each cycle is a single term: 'second' grades out of 90 (discussion 60 +
--   أعمال السنة 30), 'first' grades out of 10 (أعمال الفصل only).
-- - Panel assignments now carry a role: 'committee' (discussion evaluator) or
--   'supervisor' (enters أعمال السنة / أعمال الفصل). A person may hold BOTH on the
--   same project, so the active-uniqueness now includes the role.
-- - Supervision grades move from admin-entered to supervisor-entered.

-- Term on the cycle -----------------------------------------------------------
do $$
begin
  create type public.cycle_term as enum ('first', 'second');
exception
  when duplicate_object then null;
end $$;

alter table public.discussion_cycles
  add column if not exists term public.cycle_term not null default 'second';

grant usage on type public.cycle_term to authenticated;

-- Role on panel assignments ---------------------------------------------------
alter table public.panel_assignments
  add column if not exists role text not null default 'committee';

do $$
begin
  alter table public.panel_assignments
    add constraint panel_assignments_role_check check (role in ('committee', 'supervisor'));
exception
  when duplicate_object then null;
end $$;

-- Replace the (project, member, is_active) uniqueness with one that includes the
-- role, so the same person can be both a committee member and a supervisor.
alter table public.panel_assignments
  drop constraint if exists panel_assignments_member_unique_active;

create unique index if not exists panel_assignments_member_role_unique_active
  on public.panel_assignments (project_id, panel_member_id, role)
  where is_active = true;

-- Helper: is the current user an active supervisor for this project?
create or replace function public.is_supervisor_for_project(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.panel_assignments pa
    where pa.project_id = target_project_id
      and pa.panel_member_id = auth.uid()
      and pa.role = 'supervisor'
      and pa.is_active = true
      and pa.revoked_at is null
  )
$$;

grant execute on function public.is_supervisor_for_project(uuid) to authenticated;

-- Supervision grades: supervisor-entered ------------------------------------
-- Supervisors read their projects' supervision rows (any time, so saved values
-- remain visible) and write them while the grading window is open. Admins keep
-- full management (and override).
drop policy if exists "Supervisors read supervision grades for their projects" on public.student_supervision_grades;
create policy "Supervisors read supervision grades for their projects"
on public.student_supervision_grades
for select
to authenticated
using (public.is_supervisor_for_project(project_id));

drop policy if exists "Supervisors insert supervision grades for their projects" on public.student_supervision_grades;
create policy "Supervisors insert supervision grades for their projects"
on public.student_supervision_grades
for insert
to authenticated
with check (
  public.is_supervisor_for_project(project_id)
  and entered_by = auth.uid()
  and public.is_project_grading_open(project_id)
);

drop policy if exists "Supervisors update supervision grades for their projects" on public.student_supervision_grades;
create policy "Supervisors update supervision grades for their projects"
on public.student_supervision_grades
for update
to authenticated
using (
  public.is_supervisor_for_project(project_id)
  and public.is_project_grading_open(project_id)
)
with check (
  public.is_supervisor_for_project(project_id)
  and public.is_project_grading_open(project_id)
);
