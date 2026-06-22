-- Add a third panel-assignment role: 'committee_head' (رئيس اللجنة).
--
-- A committee head grades exactly like a committee member (discussion evaluator);
-- it is a designation/label only. Grading code already treats any role that is
-- not 'supervisor' as a discussion grader, so no scoring changes are needed.
--
-- Rule: at most ONE active committee head per project.

-- Allow the new value on the role check ---------------------------------------
alter table public.panel_assignments
  drop constraint if exists panel_assignments_role_check;

alter table public.panel_assignments
  add constraint panel_assignments_role_check
  check (role in ('committee', 'committee_head', 'supervisor'));

-- At most one active committee head per project --------------------------------
create unique index if not exists panel_assignments_one_active_head_per_project
  on public.panel_assignments (project_id)
  where role = 'committee_head' and is_active = true;
