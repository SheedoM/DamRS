-- Admin-provisioned projects with a human-readable project number.
--
-- New flow (Option A):
--   1. Admin pre-creates a project shell with a project_number + the leader's
--      university ID (+ name/program). team_leader_id stays NULL ("awaiting leader").
--   2. The leader signs up with university ID + national ID (their password);
--      registration links them to the pending project (sets team_leader_id) and
--      they complete + submit it once.
--
-- The leader fills the descriptive fields after claiming, so those columns must
-- be nullable on the pending shell. Completeness is enforced at submit time in
-- the application layer (getMissingSubmissionRequirements), not by a DB check,
-- to avoid breaking already-submitted rows that predate title_en.

-- New columns ---------------------------------------------------------------
alter table public.projects add column if not exists project_number text;
alter table public.projects add column if not exists title_en text;
alter table public.projects add column if not exists leader_university_id text;
alter table public.projects add column if not exists leader_full_name text;
alter table public.projects add column if not exists leader_program public.program;

-- Allow pending shells: leader account and descriptive fields are filled later.
alter table public.projects alter column team_leader_id drop not null;
alter table public.projects alter column title drop not null;
alter table public.projects alter column abstract drop not null;
alter table public.projects alter column supervisor_name drop not null;

-- One project per number per cycle. Partial so fallback projects (created by a
-- student before a number is assigned) may leave project_number NULL.
create unique index if not exists projects_unique_number_per_cycle
on public.projects (cycle_id, project_number)
where project_number is not null;

-- Find a pending (unclaimed) project for a university ID in the active cycle.
-- Used by the registration server action (runs as service role) to decide
-- whether a sign-up may claim a pre-created project.
create index if not exists projects_pending_leader_idx
on public.projects (cycle_id, leader_university_id)
where team_leader_id is null;
