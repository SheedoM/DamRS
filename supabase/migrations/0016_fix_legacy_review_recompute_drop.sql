-- Fix: migration 0014 tried to remove the legacy reviews status-sync machinery
-- but dropped the wrong signature — it ran
--   drop function ... recompute_project_review_status()      -- no args
-- while the real function is
--   recompute_project_review_status(uuid)                    -- migration 0004
-- so `drop function if exists` matched nothing and the function survived, along
-- with its wrapper trigger functions and the panel_assignments trigger. That
-- trigger still queries the dropped public.reviews table, so every insert/update
-- on panel_assignments fails with: relation "public.reviews" does not exist.
--
-- Drop them with the correct signatures. CASCADE also removes the dependent
-- panel_assignments_recompute_project_status trigger.

drop trigger if exists panel_assignments_recompute_project_status on public.panel_assignments;
drop function if exists public.recompute_project_review_status_from_assignment() cascade;
drop function if exists public.recompute_project_review_status_from_review() cascade;
drop function if exists public.recompute_project_review_status(uuid) cascade;
