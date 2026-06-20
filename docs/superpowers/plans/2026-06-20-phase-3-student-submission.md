# Phase 3 Student Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the student project submission workflow backed by Supabase tables, Storage, validation, and audit logs.

**Architecture:** Server Components load the authenticated student's project state. Client form components use React Hook Form and Zod for project/team validation, then call focused server actions for database and Storage writes. Pure helper functions cover missing requirements and storage path generation with Vitest tests.

**Tech Stack:** Next.js App Router, React Hook Form, Zod, Supabase Auth/Postgres/Storage, Tailwind CSS, Vitest.

---

## Files

- Create `src/lib/project/submission.schema.ts`: Zod schemas, missing requirement checks, file metadata helpers.
- Create `src/lib/project/storage.ts`: bucket mapping and storage path generation.
- Create `src/lib/project/submission.test.ts`: red-green tests for missing requirements and storage path behavior.
- Create `src/app/student/project/actions.ts`: server actions for create/update/upload/submit.
- Create `src/app/student/project/project-form.tsx`: React Hook Form project/team editor.
- Create `src/app/student/project/file-upload-form.tsx`: upload controls for PDF, ZIP, presentation.
- Create `src/app/student/project/project-summary.tsx`: detail/status/files rendering.
- Create `src/app/student/project/page.tsx`: project overview route.
- Create `src/app/student/project/new/page.tsx`: create route.
- Create `src/app/student/project/edit/page.tsx`: edit route.
- Create `src/app/student/project/status/page.tsx`: status route.
- Modify `src/app/student/page.tsx`: live project status cards and links.
- Modify `src/components/ui/button.tsx`: export button variants for link styling.
- Modify `package.json`: add React Hook Form and resolver dependencies.

## Task 1: Validation And Storage Helpers

- [ ] Add tests for required fields, required file types, required team members, and storage path sanitization.
- [ ] Run `npm test` and confirm the new tests fail.
- [ ] Implement `submission.schema.ts` and `storage.ts`.
- [ ] Run `npm test` and confirm all tests pass.

## Task 2: Dependencies And UI Primitives

- [ ] Install `react-hook-form` and `@hookform/resolvers`.
- [ ] Export button variants for link-style buttons.
- [ ] Add small textarea/select UI primitives if needed.
- [ ] Run `npm run lint`.

## Task 3: Student Project Server Actions

- [ ] Implement project creation and update actions.
- [ ] Implement file upload action using private Supabase Storage buckets.
- [ ] Implement final submit action with missing requirement checks.
- [ ] Add audit log inserts for creation, updates, uploads, and submission.
- [ ] Run `npm run build`.

## Task 4: Student Routes And Forms

- [ ] Build `/student/project` overview.
- [ ] Build `/student/project/new` with React Hook Form and Zod.
- [ ] Build `/student/project/edit` with React Hook Form and Zod.
- [ ] Build `/student/project/status`.
- [ ] Update `/student` dashboard to show real project status when available.
- [ ] Run `npm run build`.

## Task 5: Verification And Documentation

- [ ] Update `README.md` with Phase 3 prerequisites: active cycle, open submission window, student profile.
- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Commit Phase 3.
