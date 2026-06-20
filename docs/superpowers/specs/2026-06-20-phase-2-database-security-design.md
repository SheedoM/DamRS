# Phase 2 Database And Security Design

## Goal

Phase 2 implements the core Supabase database schema, Row Level Security policies, and private Storage bucket policies for the Graduation Project Audit System.

This phase does not build student submission screens, admin assignment screens, panel review screens, or reports. It creates the secure backend foundation those flows will use.

## Schema Scope

Phase 2 adds:

- `discussion_cycles`
- `submission_windows`
- `projects`
- `team_members`
- `project_files`
- `panel_assignments`
- `reviews`
- `audit_logs`

Phase 2 also adds enums:

- `project_status`
- `review_type`
- `project_file_type`

The existing Phase 1 `user_role` enum and `profiles` table remain the source of truth for roles.

## Security Model

All public tables must have RLS enabled.

Admins can read and write operational tables. Students can see and manage only their own project rows, team rows, and file metadata. Panel members can see only actively assigned projects and related metadata. Revoked assignments remove panel access through `panel_assignments.is_active = true` and `revoked_at is null` checks.

Storage buckets are private:

- `project-documents`
- `project-source-code`
- `project-presentations`

Storage object names follow:

```text
cycle-id/project-id/file-name.ext
```

Storage access is controlled by policies that derive `project_id` from the second path segment and reuse project access helper functions.

## Helper Functions

Phase 2 uses SQL helper functions to keep policies readable:

- `public.is_admin()`
- `public.is_panel_assigned_to_project(project_id uuid)`
- `public.can_read_project(project_id uuid)`
- `public.can_manage_project(project_id uuid)`
- `public.project_id_from_storage_name(object_name text)`

These functions are `security definer` where needed and use `auth.uid()` to evaluate the active Supabase user.

## Submission Window Enforcement

Students can create one project per active cycle. Student edits are allowed while the project is `draft`, and submitted projects are protected from student edits unless a later phase intentionally adds an edit-after-submit workflow.

Deadline enforcement is represented by RLS helper logic against `submission_windows`. UI validation will be added in the student submission phase.

## Review Rules

Panel members can create and update only their own reviews for actively assigned projects. They cannot review unassigned projects, cannot edit another panel member's review, and cannot create reviews after assignment revocation.

`reviews.total_score` is stored as a generated column that sums rubric fields. This supports MVP Option B: system-calculated totals.

## Storage Rules

Students can upload files only for projects they manage. Panel members can read files only for assigned projects. Admins can read/write all project files.

No bucket is public. App code should use authenticated downloads or signed URLs in later phases.

## Audit Logs

Audit logs are append-only from application code. Admins can read all audit logs. Users can insert audit entries where `actor_id = auth.uid()`.

## Compatibility Note

Because Supabase's "Automatically expose new tables" option may be disabled, migrations explicitly grant table usage to the `authenticated` role. RLS still determines which rows are accessible.
