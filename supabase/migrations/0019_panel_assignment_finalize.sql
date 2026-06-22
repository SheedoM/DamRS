-- Let evaluators (committee/supervisor) finalize their grading per assignment.
-- A null finalized_at means "draft" (saved but still editable / not submitted);
-- a non-null value means the evaluator has submitted their final grades for that
-- assignment (role-specific, since assignments are per role after 0017).
--
-- Reads: covered by the existing "Panel members can read their active
-- assignments" select policy (all columns). Writes are performed by the server
-- action via the service-role client after authorizing the member, so no new
-- panel-member update policy is required.

alter table public.panel_assignments
  add column if not exists finalized_at timestamptz;
