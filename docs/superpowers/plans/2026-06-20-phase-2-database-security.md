# Phase 2 Database Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the full Supabase schema, RLS policies, private Storage buckets, and schema verification tests for Phase 2.

**Architecture:** SQL migrations define tables, enums, helper functions, policies, grants, and storage buckets. Static Vitest checks verify the migration contains the required security primitives so future edits do not accidentally remove critical RLS or bucket behavior.

**Tech Stack:** Supabase Postgres SQL, Supabase Storage metadata tables, Row Level Security, Next.js repo with Vitest verification.

---

## Task 1: Add Failing Schema Verification Test

- [ ] Create `src/lib/database/schema-security.test.ts`.
- [ ] Assert that `supabase/migrations/0002_core_schema_rls_storage.sql` exists.
- [ ] Assert all required tables, enums, RLS statements, policy names, buckets, and grants are present.
- [ ] Run `npm test` and verify the new test fails because the migration does not exist yet.

## Task 2: Add Core Schema Migration

- [ ] Create `supabase/migrations/0002_core_schema_rls_storage.sql`.
- [ ] Add enum creation blocks for project status, review type, and file type.
- [ ] Add helper functions for role checks and project access checks.
- [ ] Create all Phase 2 tables with foreign keys, timestamps, checks, and useful indexes.
- [ ] Enable RLS on every public table.
- [ ] Add admin, student, and panel policies.
- [ ] Create private storage buckets and storage object policies.
- [ ] Add authenticated grants for environments where automatic table exposure is disabled.
- [ ] Run `npm test` and verify the schema test passes.

## Task 3: Document Supabase Application Steps

- [ ] Update `README.md` with Phase 2 migration instructions.
- [ ] Include storage bucket notes and the expected Supabase dashboard toggles.
- [ ] Run `npm run lint`, `npm test`, and `npm run build`.
- [ ] Commit the Phase 2 schema and docs.

## Verification

- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] Working tree is clean except intentionally ignored dev logs.
