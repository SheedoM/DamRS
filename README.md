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

## Routes

- `/login`
- `/logout`
- `/admin`
- `/student`
- `/panel`

Role routing:

- `admin` -> `/admin`
- `student` -> `/student`
- `panel_member` -> `/panel`

## Verification

```bash
npm test
npm run build
```

## Phase 1 Scope

Included:

- Real Supabase login foundation
- Profile-based role routing
- Protected admin, student, and panel dashboards
- Damietta University and FCAI branding
- PWA manifest foundation
- Initial `profiles` schema and RLS

Not included yet:

- Project submissions
- File uploads
- Panel assignments
- Reviews and grades
- Reports and Excel exports
- Full offline service worker
