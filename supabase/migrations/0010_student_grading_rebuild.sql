-- Rebuild grading to the dean's official model: per-student discussion scores
-- (single 20-mark form, 5 criteria, summed across evaluators) plus admin-entered
-- first-semester (10) and supervision (30) grades. Final per student = /100.

-- Discussion evaluation: one row per (evaluator, student).
create table if not exists public.student_discussion_scores (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  panel_member_id uuid not null references public.profiles(id) on delete restrict,
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  project_document numeric(4,2) not null default 0 check (project_document between 0 and 5),
  presentation_quality numeric(4,2) not null default 0 check (presentation_quality between 0 and 5),
  scientific_mastery numeric(4,2) not null default 0 check (scientific_mastery between 0 and 5),
  feasibility numeric(4,2) not null default 0 check (feasibility between 0 and 3),
  competition numeric(4,2) not null default 0 check (competition between 0 and 2),
  total numeric(5,2) generated always as (
    project_document + presentation_quality + scientific_mastery + feasibility + competition
  ) stored,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_discussion_scores_unique_evaluator_student unique (panel_member_id, team_member_id)
);

create trigger student_discussion_scores_set_updated_at
before update on public.student_discussion_scores
for each row
execute function public.set_updated_at();

create index if not exists student_discussion_scores_project_idx
  on public.student_discussion_scores (project_id);
create index if not exists student_discussion_scores_member_idx
  on public.student_discussion_scores (team_member_id);

-- Admin-entered grades: one row per student.
create table if not exists public.student_supervision_grades (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  first_semester_score numeric(5,2) not null default 0 check (first_semester_score between 0 and 10),
  supervision_score numeric(5,2) not null default 0 check (supervision_score between 0 and 30),
  entered_by uuid not null references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  constraint student_supervision_grades_unique_student unique (team_member_id)
);

create trigger student_supervision_grades_set_updated_at
before update on public.student_supervision_grades
for each row
execute function public.set_updated_at();

create index if not exists student_supervision_grades_project_idx
  on public.student_supervision_grades (project_id);

alter table public.student_discussion_scores enable row level security;
alter table public.student_supervision_grades enable row level security;

-- Discussion scores: admins manage everything.
create policy "Admins can manage discussion scores"
on public.student_discussion_scores
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Panel members read their own scores for assigned projects while grading is open.
create policy "Panel members read own discussion scores"
on public.student_discussion_scores
for select
to authenticated
using (
  panel_member_id = auth.uid()
  and public.is_panel_assigned_to_project(project_id)
  and public.is_project_grading_open(project_id)
);

-- Panel members insert/update their own scores only while grading is open.
create policy "Panel members insert own discussion scores"
on public.student_discussion_scores
for insert
to authenticated
with check (
  panel_member_id = auth.uid()
  and public.current_user_role() = 'panel_member'
  and public.is_panel_assigned_to_project(project_id)
  and public.is_project_grading_open(project_id)
);

create policy "Panel members update own discussion scores"
on public.student_discussion_scores
for update
to authenticated
using (
  panel_member_id = auth.uid()
  and public.current_user_role() = 'panel_member'
  and public.is_panel_assigned_to_project(project_id)
  and public.is_project_grading_open(project_id)
)
with check (
  panel_member_id = auth.uid()
  and public.current_user_role() = 'panel_member'
  and public.is_panel_assigned_to_project(project_id)
  and public.is_project_grading_open(project_id)
);

-- Supervision/first-semester grades: admin-only.
create policy "Admins can manage supervision grades"
on public.student_supervision_grades
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.student_discussion_scores to authenticated;
grant select, insert, update, delete on public.student_supervision_grades to authenticated;
