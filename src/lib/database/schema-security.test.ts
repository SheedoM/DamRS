import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "0002_core_schema_rls_storage.sql",
);
const reviewStatusMigrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "0003_review_status_sync.sql",
);
const unifiedReviewMigrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "0004_unified_reviews_and_overrides.sql",
);
const adminEnteredReviewMigrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "0005_admin_entered_review_fields.sql",
);

function readMigration() {
  return readFileSync(migrationPath, "utf8").toLowerCase();
}

function readReviewStatusMigration() {
  return readFileSync(reviewStatusMigrationPath, "utf8").toLowerCase();
}

function readUnifiedReviewMigration() {
  return readFileSync(unifiedReviewMigrationPath, "utf8").toLowerCase();
}

function readAdminEnteredReviewMigration() {
  return readFileSync(adminEnteredReviewMigrationPath, "utf8").toLowerCase();
}

describe("phase 2 schema migration", () => {
  it("exists", () => {
    expect(existsSync(migrationPath)).toBe(true);
  });

  it("creates all required tables and enums", () => {
    const sql = readMigration();

    for (const enumName of ["project_status", "review_type", "project_file_type"]) {
      expect(sql).toContain(enumName);
    }

    for (const tableName of [
      "discussion_cycles",
      "submission_windows",
      "projects",
      "team_members",
      "project_files",
      "panel_assignments",
      "reviews",
      "audit_logs",
    ]) {
      expect(sql).toContain(`create table public.${tableName}`);
      expect(sql).toContain(`alter table public.${tableName} enable row level security`);
    }
  });

  it("contains required project access helper functions", () => {
    const sql = readMigration();

    for (const functionName of [
      "public.is_admin",
      "public.is_panel_assigned_to_project",
      "public.can_read_project",
      "public.can_manage_project",
      "public.project_id_from_storage_name",
    ]) {
      expect(sql).toContain(functionName);
    }
  });

  it("contains policies for admin, student, panel, and revoked assignment behavior", () => {
    const sql = readMigration();

    for (const phrase of [
      "admins can manage projects",
      "students can manage their own draft projects",
      "students can read team members for own project",
      "students can read files for own project",
      "panel members can read assigned projects",
      "panel members can manage own reviews for assigned projects",
      "revoked_at is null",
      "is_active = true",
    ]) {
      expect(sql).toContain(phrase);
    }
  });

  it("creates private storage buckets and storage policies", () => {
    const sql = readMigration();

    for (const bucket of [
      "project-documents",
      "project-source-code",
      "project-presentations",
    ]) {
      expect(sql).toContain(bucket);
    }

    expect(sql).toContain("insert into storage.buckets");
    expect(sql).toContain("on storage.objects");
    expect(sql).toContain("with check");
    expect(sql).toContain("public.can_read_project(public.project_id_from_storage_name(name))");
  });

  it("adds explicit grants for authenticated data api access", () => {
    const sql = readMigration();

    expect(sql).toContain("grant usage on schema public to authenticated");
    expect(sql).toContain("grant select, insert, update, delete on public.projects to authenticated");
    expect(sql).toContain("grant select, insert on public.audit_logs to authenticated");
  });

  it("syncs project status when draft or final reviews are submitted", () => {
    expect(existsSync(reviewStatusMigrationPath)).toBe(true);

    const sql = readReviewStatusMigration();

    expect(sql).toContain("create or replace function public.sync_project_status_after_review");
    expect(sql).toContain("create trigger reviews_sync_project_status");
    expect(sql).toContain("after insert or update of review_type, submitted_at on public.reviews");
    expect(sql).toContain("new.review_type = 'final'");
    expect(sql).toContain("status = 'final_reviewed'");
    expect(sql).toContain("new.review_type = 'draft'");
    expect(sql).toContain("status = 'draft_reviewed'");
    expect(sql).toContain("submitted_at = coalesce(submitted_at, now())");
    expect(sql).toContain("backfill final reviews");
    expect(sql).toContain("backfill draft reviews");
  });

  it("migrates reviews to one row per panel member and adds dean overrides", () => {
    expect(existsSync(unifiedReviewMigrationPath)).toBe(true);

    const sql = readUnifiedReviewMigration();

    expect(sql).toContain("create type public.review_status as enum");
    expect(sql).toContain("alter table public.reviews add column if not exists status public.review_status");
    expect(sql).toContain("draft_notes");
    expect(sql).toContain("draft_questions");
    expect(sql).toContain("draft_submitted_at");
    expect(sql).toContain("final_notes");
    expect(sql).toContain("final_submitted_at");
    expect(sql).toContain("delete from public.reviews");
    expect(sql).toContain("drop column if exists review_type");
    expect(sql).toContain("reviews_one_per_panel_member_per_project");
    expect(sql).toContain("create table if not exists public.project_grade_overrides");
    expect(sql).toContain("alter table public.project_grade_overrides enable row level security");
    expect(sql).toContain("admins can manage project grade overrides");
    expect(sql).toContain("create or replace function public.recompute_project_review_status");
    expect(sql).toContain("create trigger reviews_recompute_project_status");
    expect(sql).not.toContain("new.review_type");
  });

  it("adds audit fields for admin-entered missing panel grades", () => {
    expect(existsSync(adminEnteredReviewMigrationPath)).toBe(true);

    const sql = readAdminEnteredReviewMigration();

    expect(sql).toContain("alter table public.reviews add column if not exists admin_entered_by");
    expect(sql).toContain("alter table public.reviews add column if not exists admin_entered_at");
    expect(sql).toContain("alter table public.reviews add column if not exists admin_entry_reason");
    expect(sql).toContain("reviews_admin_entry_requires_reason");
    expect(sql).toContain("reviews_admin_entered_by_idx");
  });
});
