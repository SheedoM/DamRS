-- Consolidate grading onto the per-student model (student_discussion_scores +
-- student_supervision_grades, migration 0010). The legacy per-project `reviews`
-- table and the `project_grade_overrides` table are no longer written or read by
-- the application, so they are removed as the single-source-of-truth cleanup.
--
-- Destructive: drops both tables and their dependent triggers/functions.

drop table if exists public.project_grade_overrides cascade;
drop table if exists public.reviews cascade;

-- Trigger functions that existed only to maintain the legacy reviews table.
drop function if exists public.sync_project_status_after_review() cascade;
drop function if exists public.recompute_project_review_status() cascade;
