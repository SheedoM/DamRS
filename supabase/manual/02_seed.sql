-- ============================================================================
-- DamRS — PRODUCTION SEED (STEP 3 of 3)
-- ============================================================================
-- Prerequisites:
--   • 01_reset.sql has been run.
--   • The 3 auth users were created in Authentication → Users → "Add user"
--     (Auto Confirm checked), with EXACTLY these emails/passwords:
--       wael.admin@damrs.edu  /  WaelAdmin#2026
--       wael.panel@damrs.edu  /  WaelPanel#2026
--       20210001@damrs.edu    /  30203150100015
--
-- This block resolves those users by email and inserts their profiles plus the
-- minimum bootstrap rows the app needs (active cycle, submission window, grading
-- window, app settings, eligible-students roster). Idempotent-ish: re-running
-- after a fresh reset is fine; running twice without a reset will error on the
-- one-cycle / unique constraints, which is intended.
-- ============================================================================

do $$
declare
  v_admin   uuid;
  v_panel   uuid;
  v_student uuid;
  v_cycle   uuid;
  v_dept    text := 'كلية الحاسبات والمعلومات بدمياط';
begin
  -- Resolve the auth users created via the dashboard.
  select id into v_admin   from auth.users where email = 'wael.admin@damrs.edu';
  select id into v_panel   from auth.users where email = 'wael.panel@damrs.edu';
  select id into v_student from auth.users where email = '20210001@damrs.edu';

  if v_admin is null or v_panel is null or v_student is null then
    raise exception 'Missing auth user(s). Create the 3 users in Authentication → Add user first (admin: %, panel: %, student: %).',
      v_admin, v_panel, v_student;
  end if;

  -- Profiles ----------------------------------------------------------------
  insert into public.profiles (id, full_name, email, role, department)
  values (v_admin, 'Wael Abd El Kader', 'wael.admin@damrs.edu', 'admin', v_dept);

  insert into public.profiles (id, full_name, email, role, department, panel_member_type, temp_password)
  values (v_panel, 'Wael Abd El Kader', 'wael.panel@damrs.edu', 'panel_member', v_dept, 'committee_head', 'WaelPanel#2026');

  insert into public.profiles (id, full_name, email, role, student_id, national_id, program)
  values (v_student, 'محمود سامي', '20210001@damrs.edu', 'student', '20210001', '30203150100015', 'computer_science');

  -- Active discussion cycle -------------------------------------------------
  insert into public.discussion_cycles (name, academic_year, department, created_by, is_active)
  values ('مشاريع التخرج 2025/2026', '2025/2026', v_dept, v_admin, true)
  returning id into v_cycle;

  -- Submission window (open now, closes in 30 days) -------------------------
  insert into public.submission_windows
    (cycle_id, opens_at, closes_at, allow_late_submission, allow_edit_after_submit, created_by)
  values
    (v_cycle, now() - interval '1 day', now() + interval '30 days', false, true, v_admin);

  -- Grading window (closed; the admin opens it from the dashboard) ----------
  insert into public.grading_windows (cycle_id, is_open, created_by)
  values (v_cycle, false, v_admin);

  -- App settings singleton --------------------------------------------------
  insert into public.app_settings (id, max_team_members, updated_by)
  values (true, 10, v_admin)
  on conflict (id) do update set max_team_members = excluded.max_team_members, updated_by = excluded.updated_by;

  -- Eligible-students roster ------------------------------------------------
  -- Seeded student (already claimed) + 2 unclaimed IDs for a self-registration demo.
  insert into public.eligible_students
    (cycle_id, university_id, national_id, full_name, created_by, claimed_by, claimed_at)
  values
    (v_cycle, '20210001', '30203150100015', 'محمود سامي', v_admin, v_student, now());

  insert into public.eligible_students
    (cycle_id, university_id, national_id, full_name, created_by)
  values
    (v_cycle, '20210002', '30203150100023', 'طالب للتسجيل الذاتي', v_admin),
    (v_cycle, '20210003', '30203150100031', 'طالب للتسجيل الذاتي', v_admin);

  raise notice 'Seed complete. admin=%, panel=%, student=%, cycle=%', v_admin, v_panel, v_student, v_cycle;
end $$;
