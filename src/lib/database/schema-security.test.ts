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

function readMigration() {
  return readFileSync(migrationPath, "utf8").toLowerCase();
}

function readReviewStatusMigration() {
  return readFileSync(reviewStatusMigrationPath, "utf8").toLowerCase();
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
});
