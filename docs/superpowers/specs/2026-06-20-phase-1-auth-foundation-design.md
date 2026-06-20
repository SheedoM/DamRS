# Phase 1 Auth Foundation Design

## Product

The product is a production-quality MVP PWA named **Graduation Project Audit System**, with the shorter product label **GP Review** used in compact navigation and mobile contexts.

The app is branded for **Damietta University - Faculty of Computers and Artificial Intelligence (FCAI)**. The interface should feel institutional, operational, and trustworthy: clean dashboard layouts, restrained colors, clear status surfaces, and no marketing-style landing page.

## Phase Goal

Phase 1 builds the secure application foundation:

- Next.js App Router project
- React + TypeScript
- Tailwind CSS
- shadcn/ui-compatible component structure
- Real Supabase Auth from day one
- Supabase profile-based role routing
- Protected dashboards for `admin`, `student`, and `panel_member`
- Reusable authenticated layout components
- Initial PWA metadata and manifest foundation

Project submission, project files, panel assignments, reviews, reports, and storage uploads are intentionally out of scope for Phase 1.

## Stack

- Next.js App Router
- React
- TypeScript in strict mode
- Tailwind CSS
- shadcn/ui patterns
- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- lucide-react for icons
- Vitest or Node test runner for focused utility tests

## Required Routes

Public routes:

- `/login`
- `/logout`

Authenticated role routes:

- `/student`
- `/panel`
- `/admin`

After login:

- `admin` users are redirected to `/admin`
- `student` users are redirected to `/student`
- `panel_member` users are redirected to `/panel`

If a signed-in user has no matching profile row, the app shows a clear account setup error and does not guess a role.

## Authentication Design

The application requires real Supabase configuration from the beginning:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The app does not include mock login or fake users. Missing environment variables should produce a clear setup error in development.

Supabase clients are split by execution environment:

- Browser client for login/logout and client-side interactions
- Server client for route protection, session checks, and profile lookup
- Middleware helper for session refresh and route gating

The login page supports email/password authentication using Supabase Auth. Additional providers are not part of Phase 1.

## Role Model

Supported roles:

- `admin`
- `student`
- `panel_member`

The role source of truth is `public.profiles.role`, not client state and not route assumptions.

Role enforcement happens in server-side route utilities and layout guards. The frontend may hide irrelevant navigation, but hidden UI is never treated as authorization.

## Minimal Database Schema

Phase 1 requires the initial profile schema because role routing depends on it.

```sql
create type public.user_role as enum ('admin', 'student', 'panel_member');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role public.user_role not null,
  department text,
  student_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
```

Required policies:

- Users can read their own profile.
- Admins can read all profiles.
- Admins can update profile roles and profile details.

The first admin may need to be inserted manually in Supabase SQL editor or through a controlled seed script after creating the auth user.

## UI Structure

Reusable layout components:

- `AppShell`: authenticated dashboard frame
- `Sidebar`: role-aware navigation
- `Topbar`: page title, user identity, logout affordance
- `RoleGuard`: server-side role enforcement wrapper/helper
- `DashboardCard`: compact dashboard metric/action component

Dashboard home pages:

- Student dashboard shows static cards for submission status, deadline, project status, uploaded files, and primary actions.
- Panel dashboard shows static cards for assigned projects, reviewed projects, pending draft reviews, and pending final reviews.
- Admin dashboard shows static cards for total projects, submitted projects, incomplete projects, unassigned projects, draft reviews, and final reviews.

These cards are intentionally non-data-backed in Phase 1. They must not fake data from future tables.

## Branding

The provided Damietta University and FCAI logos should be copied into the app's public assets folder during implementation.

Visual direction:

- Primary navy inspired by the FCAI seal
- University blue as a supporting accent
- Academic yellow for highlights and small state accents
- White and neutral gray for the main dashboard surface
- Compact, functional cards with modest radius
- Dense but readable layouts suitable for repeated administrative use

The login screen should immediately signal Damietta University and FCAI through the logos and product title. It should not be a generic SaaS landing page.

## PWA Foundation

Phase 1 includes the base PWA metadata:

- Web app manifest
- App name and short name
- Theme color
- Basic icons or temporary generated app icons derived from the brand colors
- Mobile-friendly viewport behavior

A full service worker, offline fallback, push notifications, and install prompt polish are deferred to the later PWA phase.

## Error Handling

Expected setup and auth errors must be explicit:

- Missing Supabase URL/key
- Failed login
- Signed-in user has no profile
- Signed-in user has a role that does not match the requested route
- Expired session or missing session

The app should redirect unauthenticated users to `/login`. Role mismatches should route users back to their correct dashboard when possible, or show an unauthorized page if the role cannot be resolved.

## Testing And Verification

Phase 1 verification includes:

- TypeScript compile/build passes.
- Lint passes if configured by the scaffold.
- Role-to-dashboard redirect logic has focused automated tests.
- Grade/project/review behavior is not tested in Phase 1 because it is not implemented yet.
- Manual auth verification path:
  - Create Supabase auth users.
  - Insert matching `profiles` rows.
  - Sign in as each role.
  - Confirm redirect to the correct dashboard.
  - Confirm direct access to another role route is blocked.

## Scope Boundaries

Phase 1 does not build:

- Student project submission forms
- Team member management
- File uploads
- Supabase Storage buckets
- Panel assignment workflows
- Review forms
- Grade calculations
- Excel reports
- Audit log UI
- Full offline behavior
- Push notifications

These belong to later phases after the auth and role foundation is working.
