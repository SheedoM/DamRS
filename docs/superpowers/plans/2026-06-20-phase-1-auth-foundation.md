# Phase 1 Auth Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the auth-first Next.js/Supabase foundation for the Damietta FCAI Graduation Project Audit System.

**Architecture:** A Next.js App Router application will use Supabase Auth for real login, server-side profile lookup for role routing, and protected dashboard layouts for admin, student, and panel members. Phase 1 keeps future project data as static dashboard cards while avoiding fake data from unbuilt tables.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Supabase Auth, Supabase Postgres, shadcn/ui-style components, lucide-react, Vitest.

---

## File Structure

- Create/modify `package.json`: scripts and dependencies.
- Create/modify `src/app/*`: App Router routes, layouts, login, logout, role dashboards.
- Create `src/components/layout/*`: `AppShell`, `Sidebar`, `Topbar`.
- Create `src/components/dashboard/dashboard-card.tsx`: reusable card component.
- Create `src/components/ui/*`: minimal local UI primitives following shadcn/ui conventions.
- Create `src/lib/supabase/*`: browser/server clients and environment validation.
- Create `src/lib/auth/*`: profile lookup, role routing, route guards.
- Create `src/lib/auth/role-routing.test.ts`: focused tests for role redirect behavior.
- Create `supabase/migrations/0001_profiles.sql`: user role enum, profiles table, RLS policies.
- Create `public/brand/*`: Damietta University and FCAI logos copied from provided attachments.
- Create `public/manifest.webmanifest`: PWA manifest.
- Create `.env.example`: required Supabase variables.

## Task 1: Scaffold Next.js

- [ ] Create the Next.js app in the repository root using TypeScript, App Router, Tailwind, ESLint, and `src/`.
- [ ] Install runtime dependencies: `@supabase/ssr`, `@supabase/supabase-js`, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`, `zod`.
- [ ] Install test dependency: `vitest`.
- [ ] Confirm `npm run build` reaches the expected initial scaffold result.
- [ ] Commit scaffold.

## Task 2: Add Supabase Environment And Role Tests

- [ ] Create `.env.example` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Create `src/lib/supabase/env.ts` that validates public Supabase environment variables.
- [ ] Create `src/lib/auth/roles.ts` with `UserRole`, dashboard path mapping, and `getDashboardPathForRole`.
- [ ] Write `src/lib/auth/role-routing.test.ts` before implementation expectations are complete.
- [ ] Run the test and confirm it fails if the role helper is missing or incorrect.
- [ ] Implement the role helper.
- [ ] Run the test and confirm it passes.
- [ ] Commit environment and role logic.

## Task 3: Add Supabase Clients And Auth Helpers

- [ ] Create `src/lib/supabase/browser.ts` using `createBrowserClient`.
- [ ] Create `src/lib/supabase/server.ts` using `createServerClient` and Next cookies.
- [ ] Create `src/lib/auth/get-current-profile.ts` to fetch the current user and profile.
- [ ] Create `src/lib/auth/require-role.ts` to redirect unauthenticated users to `/login` and mismatched users to their correct dashboard.
- [ ] Create `middleware.ts` for Supabase session refresh.
- [ ] Run `npm run build`.
- [ ] Commit Supabase auth helpers.

## Task 4: Build Branded UI Foundation

- [ ] Copy the provided Damietta University and FCAI logo files into `public/brand/`.
- [ ] Create `src/lib/utils.ts` for class name merging.
- [ ] Create minimal shadcn-style UI primitives needed for Phase 1: `Button`, `Card`, `Input`, `Label`, `Alert`.
- [ ] Create `AppShell`, `Sidebar`, `Topbar`, and `DashboardCard`.
- [ ] Update global CSS and Tailwind theme with FCAI/Damietta colors.
- [ ] Run `npm run build`.
- [ ] Commit branded UI foundation.

## Task 5: Build Auth Routes And Dashboards

- [ ] Create `/login` email/password form using Supabase Auth.
- [ ] Create `/logout` route handler using Supabase sign out.
- [ ] Create `/admin`, `/student`, and `/panel` dashboards guarded by server-side role checks.
- [ ] Add root route behavior that sends authenticated users to their dashboard and unauthenticated users to `/login`.
- [ ] Add missing-profile and unauthorized error states.
- [ ] Run `npm run build`.
- [ ] Commit auth routes and dashboards.

## Task 6: Add Database Migration And PWA Metadata

- [ ] Create `supabase/migrations/0001_profiles.sql` with enum, profiles table, updated_at trigger, and RLS policies.
- [ ] Create `public/manifest.webmanifest`.
- [ ] Add app metadata and manifest link in `src/app/layout.tsx`.
- [ ] Add setup notes to `README.md`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Commit database and PWA foundation.

## Verification

- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] Git status contains only intentional changes.
- [ ] Final response includes setup instructions for Supabase env vars and applying the SQL migration.
