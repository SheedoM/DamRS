# Phase 4 Admin Assignments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the admin project management and panel assignment workflow.

**Architecture:** Server Components load admin-only data through Supabase RLS. Client table components use TanStack Table for filtering submitted projects. Server actions create panel accounts, assign/revoke panel members, update submission windows, and write audit logs.

**Tech Stack:** Next.js App Router, Supabase Auth/Postgres/Storage metadata, TanStack Table, Zod, Tailwind CSS, Vitest.

---

## Files

- Create `src/lib/admin/admin-projects.ts`: pure table helpers and assignment status helpers.
- Create `src/lib/admin/admin-projects.test.ts`: failing tests first.
- Create `src/lib/admin/queries.ts`: admin dashboard/project/panel/window queries.
- Create `src/lib/supabase/admin.ts`: server-only service-role admin client for creating auth users.
- Create `src/app/admin/actions.ts`: server actions for panel accounts, assignments, revocations, and submission windows.
- Create `src/app/admin/projects/projects-table.tsx`: TanStack project table.
- Create admin route pages under `/admin/projects`, `/admin/projects/[projectId]`, `/admin/panel-members`, `/admin/assignments`, `/admin/submission-window`.
- Modify `/admin` dashboard to use real counts.
- Modify `.env.example` and `README.md` for `SUPABASE_SERVICE_ROLE_KEY`.

## Tasks

- [ ] Add red tests for assignment status and project filtering.
- [ ] Implement admin helper functions and pass tests.
- [ ] Install `@tanstack/react-table`.
- [ ] Add server-only Supabase admin client.
- [ ] Add admin queries and server actions.
- [ ] Add admin project table and detail pages.
- [ ] Add panel member account creation page.
- [ ] Add assignment and revocation page.
- [ ] Add submission window settings page.
- [ ] Update admin dashboard counts and README.
- [ ] Verify with `npm test`, `npm run lint`, and `npm run build`.
