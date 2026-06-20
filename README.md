# GP Review

Damietta University FCAI Graduation Project Audit System.

This is the Phase 1 auth foundation for a PWA-based graduation project submission and review system. It uses real Supabase Auth from day one and routes users to dashboards based on `public.profiles.role`.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres with RLS
- shadcn/ui-style local components
- Vitest

## Local Setup

Install dependencies:

```bash
npm install
```

Create local environment values:

```bash
copy .env.example .env.local
```

Set:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Apply the Phase 1 SQL migration in Supabase:

```text
supabase/migrations/0001_profiles.sql
```

You can paste it into the Supabase SQL editor or run it with the Supabase CLI after linking the project.

Then apply the Phase 2 schema and security migration:

```text
supabase/migrations/0002_core_schema_rls_storage.sql
```

Run Phase 1 first, then Phase 2. Phase 2 depends on `profiles`, `user_role`, and the `set_updated_at` helper from Phase 1.

## Supabase API Security Settings

For this app, use these Supabase Data API settings:

```text
Enable Data API                 ON
Automatically expose new tables OFF
Enable automatic RLS            ON
```

The migrations explicitly grant authenticated access to the required tables and functions. Row Level Security still controls which rows each user can read or write.

## Storage Buckets

Phase 2 creates these private Supabase Storage buckets:

- `project-documents`
- `project-source-code`
- `project-presentations`

The buckets are not public. Storage object paths must follow this pattern:

```text
cycle-id/project-id/file-name.ext
```

Storage policies derive `project_id` from the second path segment and enforce the same project access rules as the database.

## First Admin

1. Create the first admin user in Supabase Auth.
2. Copy that user's UUID.
3. Insert the first profile from the Supabase SQL editor:

```sql
insert into public.profiles (id, full_name, email, role, department)
values (
  'AUTH_USER_UUID_HERE',
  'Admin User',
  'admin@example.com',
  'admin',
  'Faculty of Computers and Artificial Intelligence'
);
```

After the first admin profile exists, that admin can create and manage additional profiles in later phases.

## Phase 3 Student Submission Prerequisites

Until the admin cycle/window UI is built, create an active discussion cycle and open submission window from the Supabase SQL editor.

Replace `ADMIN_PROFILE_UUID` with an admin profile id:

```sql
insert into public.discussion_cycles (
  name,
  academic_year,
  department,
  created_by,
  is_active
)
values (
  'Graduation Projects 2025/2026',
  '2025/2026',
  'Faculty of Computers and Artificial Intelligence',
  'ADMIN_PROFILE_UUID',
  true
)
returning id;
```

Copy the returned cycle id, then run:

```sql
insert into public.submission_windows (
  cycle_id,
  opens_at,
  closes_at,
  allow_late_submission,
  allow_edit_after_submit,
  created_by
)
values (
  'CYCLE_UUID_FROM_PREVIOUS_QUERY',
  now() - interval '1 day',
  now() + interval '30 days',
  false,
  false,
  'ADMIN_PROFILE_UUID'
);
```

Students need:

- A Supabase Auth user
- A matching `public.profiles` row with `role = 'student'`
- An active submission window

Then they can use:

- `/student/project`
- `/student/project/new`
- `/student/project/edit`
- `/student/project/status`

## Routes

- `/login`
- `/logout`
- `/admin`
- `/student`
- `/panel`
- `/student/project`
- `/student/project/new`
- `/student/project/edit`
- `/student/project/status`

Role routing:

- `admin` -> `/admin`
- `student` -> `/student`
- `panel_member` -> `/panel`

## Verification

```bash
npm test
npm run lint
npm run build
```

## Current Scope

Included:

- Real Supabase login foundation
- Profile-based role routing
- Protected admin, student, and panel dashboards
- Damietta University and FCAI branding
- PWA manifest foundation
- Initial `profiles` schema and RLS
- Full Phase 2 database schema
- Private Storage buckets and policies
- RLS policies for students, admins, and assigned panel members
- Student project creation and editing
- Team member management
- Required PDF, ZIP, and presentation uploads
- Demo video URL capture
- Final project submission with missing requirement checks

Not included yet:

- Panel assignment UI
- Review and grade UI
- Reports and Excel exports
- Full offline service worker
