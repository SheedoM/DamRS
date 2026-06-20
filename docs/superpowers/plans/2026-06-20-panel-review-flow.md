# Panel Review Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MVP panel member review workflow with assigned projects, project details, draft reviews, and final reviews.

**Architecture:** Keep panel access server-rendered and RLS-backed. Add small pure helper modules for review validation/status calculations, then wire them into Supabase server queries and server actions. Reuse the existing App Router, AppShell, Card, Button, Badge, and signed file URL helper patterns.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase Auth/Postgres/Storage/RLS, Zod, Vitest, Tailwind, shadcn-style local UI components.

---

### Task 1: Review Helpers

**Files:**
- Create: `src/lib/review/review.schema.ts`
- Create: `src/lib/review/review.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests for score bounds, draft payload normalization, final payload normalization, total score calculation, and review status summaries.

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- src/lib/review/review.test.ts`

Expected: fail because `src/lib/review/review.schema.ts` does not exist.

- [ ] **Step 3: Implement review helper module**

Create:
- `reviewTypeSchema`
- `draftReviewFormSchema`
- `finalReviewFormSchema`
- `reviewScoreLimits`
- `calculateReviewTotal(input)`
- `getPanelProjectReviewStatus(reviews)`
- `getPanelDashboardStats(projects)`
- `buildDraftReviewPayload(form, projectId, panelMemberId)`
- `buildFinalReviewPayload(form, projectId, panelMemberId)`

Draft payload sets presentation and discussion scores to `0`.

Final payload sets documentation, implementation, code quality, and innovation scores to `0`.

- [ ] **Step 4: Run helper tests**

Run: `npm test -- src/lib/review/review.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit message: `feat: add panel review helpers`

### Task 2: Panel Data Queries

**Files:**
- Create: `src/lib/panel/queries.ts`
- Test: `src/lib/review/review.test.ts`
- Modify: `src/app/panel/page.tsx`

- [ ] **Step 1: Add query types and functions**

Create RLS-backed query functions:
- `getPanelProjects(panelMemberId)`
- `getPanelProjectDetail(projectId)`
- `getPanelDashboardData(panelMemberId)`

The detail query loads project, team members, files with signed URLs, and current panel member reviews.

- [ ] **Step 2: Update panel dashboard**

Use `getPanelDashboardData(profile.id)` to render real dashboard counts.

- [ ] **Step 3: Run tests and lint**

Run: `npm test -- src/lib/review/review.test.ts`

Expected: pass.

- [ ] **Step 4: Commit**

Commit message: `feat: add panel project queries`

### Task 3: Review Server Actions

**Files:**
- Create: `src/app/panel/projects/[projectId]/review-actions.ts`

- [ ] **Step 1: Add draft and final server actions**

Create:
- `saveDraftReviewAction(previousState, formData)`
- `saveFinalReviewAction(previousState, formData)`

Both actions:
- call `requireRole(["panel_member"])`
- validate `project_id`
- validate scores through review schemas
- upsert into `reviews` on `(project_id, panel_member_id, review_type)`
- set `submitted_at` to current timestamp
- write audit logs
- revalidate panel/admin project paths
- redirect to `/panel/projects/[projectId]`

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: no lint errors.

- [ ] **Step 3: Commit**

Commit message: `feat: add panel review actions`

### Task 4: Panel Routes And Forms

**Files:**
- Create: `src/app/panel/projects/page.tsx`
- Create: `src/app/panel/projects/[projectId]/page.tsx`
- Create: `src/app/panel/projects/[projectId]/draft-review/page.tsx`
- Create: `src/app/panel/projects/[projectId]/final-review/page.tsx`
- Create: `src/app/panel/projects/[projectId]/review-form.tsx`

- [ ] **Step 1: Build assigned projects page**

Render assigned projects with project title, status, assignment date, draft/final review badges, and an `Open` action.

- [ ] **Step 2: Build project detail page**

Render overview, team, file links, GitHub/demo links, and review action buttons.

- [ ] **Step 3: Build draft review page**

Render documentation, implementation, code quality, innovation, notes, and questions.

- [ ] **Step 4: Build final review page**

Render presentation, discussion, notes, and questions.

- [ ] **Step 5: Run build verification**

Run: `npm run build`

Expected: build succeeds and panel routes appear in route output.

- [ ] **Step 6: Commit**

Commit message: `feat: add panel review pages`

### Task 5: Final Verification

**Files:**
- All modified source files

- [ ] **Step 1: Run full tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: no lint errors.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: build succeeds.

- [ ] **Step 4: Restart dev server**

Run the dev server on `127.0.0.1:3000` and verify `GET /login` returns `200`.

- [ ] **Step 5: Final status**

Report changed behavior, verification results, current branch, and manual test scenario.

