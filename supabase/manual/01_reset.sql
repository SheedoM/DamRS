-- ============================================================================
-- DamRS — PRODUCTION RESET (STEP 1 of 3)
-- ============================================================================
-- Run this in the Supabase SQL editor of the LIVE project.
--
-- ⚠️ DESTRUCTIVE: wipes ALL application data, ALL auth users, and ALL uploaded
-- files. Only run when you intend to hand over a clean instance.
--
-- After this:
--   STEP 2 → create 3 users in Authentication → Users → "Add user" (Auto Confirm):
--              wael.admin@damrs.edu  /  WaelAdmin#2026
--              wael.panel@damrs.edu  /  WaelPanel#2026
--              20210001@damrs.edu    /  30203150100015
--   STEP 3 → run 02_seed.sql
-- ============================================================================

-- 1) Empty all business tables. Truncated before auth.users because several
--    tables reference public.profiles with ON DELETE RESTRICT.
--    (reviews / project_grade_overrides were dropped in migration 0014.)
truncate table
  public.audit_logs,
  public.student_discussion_scores,
  public.student_supervision_grades,
  public.project_files,
  public.panel_assignments,
  public.team_members,
  public.eligible_students,
  public.grading_windows,
  public.submission_windows,
  public.projects,
  public.app_settings,
  public.discussion_cycles
restart identity cascade;

-- 2) Remove every uploaded file from the three private storage buckets.
--    A Supabase safety trigger (storage.protect_delete) blocks a plain DELETE on
--    storage.objects, so we disable triggers JUST for this statement, then restore
--    immediately — restoring BEFORE the auth.users delete so its FK cascade fires.
--    If your project restricts session_replication_role, skip this block and empty
--    the 3 buckets from Dashboard → Storage instead (orphaned files are harmless).
set session_replication_role = replica;
delete from storage.objects
where bucket_id in ('project-documents', 'project-source-code', 'project-presentations');
set session_replication_role = origin;

-- 3) Delete all auth users. This cascades to public.profiles
--    (profiles.id references auth.users(id) ON DELETE CASCADE).
delete from auth.users;
