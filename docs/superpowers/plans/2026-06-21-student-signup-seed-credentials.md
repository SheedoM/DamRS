# Student Signup And Seed Credentials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-login newly registered students after a short success message and generate CSV-listed dummy university IDs for sheet-seeded projects without leaders.

**Architecture:** Keep server actions responsible for account creation and project claiming. Let the client page sign in with the new credentials and redirect after a timer. Extract pure seed helpers so missing-leader ID generation and CSV output are testable without Supabase.

**Tech Stack:** Next.js 16 App Router, React 19 `useActionState`, Supabase SSR/browser clients, Vitest, Node ESM scripts.

---

### Task 1: Student Signup Auto-Login

**Files:**
- Modify: `src/app/register/register-ui.test.ts`
- Modify: `src/app/register/actions.ts`
- Modify: `src/app/register/page.tsx`
- Modify: `src/lib/actions.ts`

- [ ] **Step 1: Write failing UI test**

Check that the register page imports router/effect/Supabase browser auth, signs in after success, and redirects without a login link in the success message.

- [ ] **Step 2: Verify red**

Run: `npm test -- src/app/register/register-ui.test.ts`
Expected: fails because the page still links to `/login` after success and has no auto-login code.

- [ ] **Step 3: Implement minimal signup auto-login**

Extend the success result with `email` and `password`, return those from `registerStudentAction`, then use `useEffect` on the register page to sign in and redirect after two seconds.

- [ ] **Step 4: Verify green**

Run: `npm test -- src/app/register/register-ui.test.ts src/app/register/registration.test.ts`
Expected: all tests pass.

### Task 2: Seed Dummy IDs For Missing Leaders

**Files:**
- Create: `scripts/seed-from-sheet-helpers.mjs`
- Create: `scripts/seed-from-sheet-helpers.test.mjs`
- Modify: `scripts/seed-from-sheet.mjs`

- [ ] **Step 1: Write failing helper tests**

Test that missing leaders receive generated dummy university IDs and that CSV rows include email but no password columns.

- [ ] **Step 2: Verify red**

Run: `npm test -- scripts/seed-from-sheet-helpers.test.mjs`
Expected: fails because the helper module does not exist.

- [ ] **Step 3: Implement helper module and script integration**

Move CSV escaping to the helper. Add functions for generating missing leader placeholders, deriving matched leader CSV rows, and producing the final CSV content. In the seed loop, fill `leader_university_id` for missing leaders while leaving `team_leader_id` empty for self-registration.

- [ ] **Step 4: Verify green**

Run: `npm test -- scripts/seed-from-sheet-helpers.test.mjs`
Expected: all helper tests pass.

### Task 3: Full Verification

**Files:**
- Existing changed files only.

- [ ] **Step 1: Run focused tests**

Run: `npm test -- src/app/register/register-ui.test.ts src/app/register/registration.test.ts scripts/seed-from-sheet-helpers.test.mjs`
Expected: all focused tests pass.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no lint errors from the touched files.
