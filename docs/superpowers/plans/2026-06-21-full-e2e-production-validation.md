# Full E2E Production Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-like Playwright E2E suite that validates the full Supabase-backed graduation project review workflow before release.

**Architecture:** Playwright runs against `next build` + `next start` on `127.0.0.1:3107`, with a single worker and deterministic Supabase seed resets between tests. Browser tests use real Supabase Auth, real Server Actions, real RLS, and service-role helpers only for setup and database assertions.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Auth/Postgres/Storage, Playwright, existing `scripts/seed.mjs`, Vitest.

---

## Scope And Current Reality

This plan covers the production-critical flows present in the current code:

- Auth login, logout, role routing, and protected-route redirects.
- Admin dashboard counts, grading open/close, settings, project filters, project detail, panel assignment, student grades, roster, panel-member creation, and CSV export.
- Panel member dashboard, assigned project visibility, discussion score save/edit, and closed grading-window lockout.
- Student submitted-project read-only journey, draft edit journey, file upload, final submit, and post-submit lockout.
- Self-registration through the approved roster.
- Basic responsive smoke coverage through Playwright projects.

The current manual scenario mentions an "announce grades" action. The current app code does not contain an announce action or UI; it contains grading open/close and CSV export in `src/app/admin/grading-control.tsx`. This E2E plan validates the implemented behavior. Add an announcement feature in a separate plan if production requires that workflow.

## File Structure

- Modify `package.json`: add Playwright scripts and `@playwright/test`.
- Create `playwright.config.ts`: production-like web server, browsers, trace/video settings, single-worker safety.
- Create `tests/e2e/support/env.ts`: load `.env.local` for Playwright helper code.
- Create `tests/e2e/support/seed.ts`: rerun `npm run seed` from tests.
- Create `tests/e2e/support/supabase.ts`: service-role data helpers and assertions.
- Create `tests/e2e/support/auth.ts`: login/logout helpers and seeded user constants.
- Create `tests/e2e/support/project-form.ts`: helpers for repeated project form fields and upload payloads.
- Create `tests/e2e/auth.spec.ts`: auth and role-route tests.
- Create `tests/e2e/admin.spec.ts`: admin workflows and CSV export tests.
- Create `tests/e2e/panel.spec.ts`: panel grading and grading-window lock tests.
- Create `tests/e2e/student.spec.ts`: student edit/upload/submit and submitted read-only tests.
- Create `tests/e2e/register.spec.ts`: self-registration happy path and roster gates.
- Modify `README.md`: add E2E setup and run commands.
- Modify `docs/manual-test-scenario.md`: remove or annotate the missing announce action so manual and automated coverage agree.

## Preconditions

Run E2E only against a dedicated local or staging Supabase project. The reset flow reruns `scripts/seed.mjs`, which deletes and rebuilds the seeded `@gpseed.test` accounts plus the seed cycle named `مشاريع التخرج 2025/2026`.

Before implementation, `.env.local` must contain:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-test-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-test-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-test-service-role-key
```

Do not point `.env.local` at production while running `npm run seed`, `npm run test:e2e`, or `npm run verify:prod`.

### Task 1: Add Playwright Dependency, Scripts, And Config

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`
- Test: `tests/e2e/auth.spec.ts`

- [ ] **Step 1: Install Playwright**

Run:

```powershell
npm install -D @playwright/test
npx playwright install
```

Expected: `package.json` and `package-lock.json` include `@playwright/test`; browser binaries install successfully.

- [ ] **Step 2: Add E2E scripts**

Modify `package.json` so the `scripts` block contains these entries:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "seed": "node scripts/seed.mjs",
  "test:e2e": "npm run build && playwright test",
  "test:e2e:headed": "npm run build && playwright test --headed",
  "test:e2e:ui": "npm run build && playwright test --ui",
  "test:e2e:report": "playwright show-report",
  "verify:prod": "npm run lint && npm test && npm run build && playwright test"
}
```

- [ ] **Step 3: Create Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

const port = 3107;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `npm run start -- -p ${port} -H 127.0.0.1`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
```

- [ ] **Step 4: Verify config discovers no tests yet**

Run:

```powershell
npx playwright test --list
```

Expected: Playwright loads the config and reports no matching tests or an empty list. If it starts the server, stop after confirming the config parses.

- [ ] **Step 5: Commit Task 1**

```powershell
git add package.json package-lock.json playwright.config.ts
git commit -m "test: add playwright e2e harness"
```

### Task 2: Add Shared E2E Support Helpers

**Files:**
- Create: `tests/e2e/support/env.ts`
- Create: `tests/e2e/support/seed.ts`
- Create: `tests/e2e/support/supabase.ts`
- Create: `tests/e2e/support/auth.ts`
- Create: `tests/e2e/support/project-form.ts`
- Test: `tests/e2e/auth.spec.ts`

- [ ] **Step 1: Create environment loader**

Create `tests/e2e/support/env.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const repoRoot = process.cwd();

export function loadDotEnv(fileName = ".env.local") {
  const filePath = path.join(repoRoot, fileName);
  if (!existsSync(filePath)) return;

  const raw = readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

export function requireEnv(name: string) {
  loadDotEnv();
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required E2E environment variable: ${name}`);
  }
  return value;
}
```

- [ ] **Step 2: Create seed reset helper**

Create `tests/e2e/support/seed.ts`:

```ts
import { execFileSync } from "node:child_process";

import { loadDotEnv, repoRoot } from "./env";

export function resetSeedData() {
  loadDotEnv();
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  execFileSync(npmCommand, ["run", "seed"], {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "test",
    },
  });
}
```

- [ ] **Step 3: Create Supabase service-role helpers**

Create `tests/e2e/support/supabase.ts`:

```ts
import { expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { requireEnv } from "./env";

export const seedCycleName = "مشاريع التخرج 2025/2026";

export function adminDb() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export async function getProfileByEmail(email: string) {
  const { data, error } = await adminDb()
    .from("profiles")
    .select("id, full_name, email, role, student_id, national_id, panel_member_type")
    .eq("email", email)
    .single();

  expect(error, `profile lookup failed for ${email}`).toBeNull();
  expect(data, `profile missing for ${email}`).toBeTruthy();
  return data as {
    id: string;
    full_name: string;
    email: string;
    role: string;
    student_id: string | null;
    national_id: string | null;
    panel_member_type: string | null;
  };
}

export async function getProjectByTitle(title: string) {
  const { data, error } = await adminDb()
    .from("projects")
    .select("id, title, status, cycle_id, team_leader_id")
    .eq("title", title)
    .single();

  expect(error, `project lookup failed for ${title}`).toBeNull();
  expect(data, `project missing for ${title}`).toBeTruthy();
  return data as {
    id: string;
    title: string;
    status: string;
    cycle_id: string;
    team_leader_id: string;
  };
}

export async function getActiveSeedCycleId() {
  const { data, error } = await adminDb()
    .from("discussion_cycles")
    .select("id")
    .eq("name", seedCycleName)
    .eq("is_active", true)
    .single();

  expect(error, "active seed cycle lookup failed").toBeNull();
  expect(data, "active seed cycle missing").toBeTruthy();
  return data.id as string;
}

export async function setGradingWindowOpen(isOpen: boolean) {
  const cycleId = await getActiveSeedCycleId();
  const now = new Date().toISOString();
  const { error } = await adminDb()
    .from("grading_windows")
    .update({
      is_open: isOpen,
      opened_at: isOpen ? now : null,
      closed_at: isOpen ? null : now,
    })
    .eq("cycle_id", cycleId);

  expect(error, "grading window update failed").toBeNull();
}

export async function expectAssignment(projectId: string, panelEmail: string) {
  const panel = await getProfileByEmail(panelEmail);
  const { data, error } = await adminDb()
    .from("panel_assignments")
    .select("id, is_active, revoked_at")
    .eq("project_id", projectId)
    .eq("panel_member_id", panel.id)
    .eq("is_active", true)
    .is("revoked_at", null)
    .single();

  expect(error, "active panel assignment lookup failed").toBeNull();
  expect(data?.id, "active panel assignment missing").toBeTruthy();
}

export async function getTeamMembers(projectId: string) {
  const { data, error } = await adminDb()
    .from("team_members")
    .select("id, full_name, student_id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  expect(error, "team member lookup failed").toBeNull();
  return (data || []) as { id: string; full_name: string; student_id: string }[];
}

export async function expectDiscussionScores(projectId: string, panelEmail: string, expectedRows: number) {
  const panel = await getProfileByEmail(panelEmail);
  const { count, error } = await adminDb()
    .from("student_discussion_scores")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("panel_member_id", panel.id);

  expect(error, "discussion score count failed").toBeNull();
  expect(count).toBe(expectedRows);
}

export async function expectProjectStatus(projectId: string, status: string) {
  const { data, error } = await adminDb()
    .from("projects")
    .select("status")
    .eq("id", projectId)
    .single();

  expect(error, "project status lookup failed").toBeNull();
  expect(data?.status).toBe(status);
}

export async function expectRegisteredStudent(universityId: string, email: string) {
  const profile = await getProfileByEmail(email);
  expect(profile.role).toBe("student");
  expect(profile.student_id).toBe(universityId);

  const cycleId = await getActiveSeedCycleId();
  const { data, error } = await adminDb()
    .from("eligible_students")
    .select("claimed_by")
    .eq("cycle_id", cycleId)
    .eq("university_id", universityId)
    .single();

  expect(error, "eligible student claim lookup failed").toBeNull();
  expect(data?.claimed_by).toBe(profile.id);
}
```

- [ ] **Step 4: Create auth helpers**

Create `tests/e2e/support/auth.ts`:

```ts
import { expect, type Page } from "@playwright/test";

export const e2ePassword = "Password123!";

export const users = {
  admin: "admin@gpseed.test",
  rabie: "rabie@gpseed.test",
  mona: "mona@gpseed.test",
  khaled: "khaled@gpseed.test",
  sara: "sara@gpseed.test",
  wael: "wael@gpseed.test",
  rana: "rana@gpseed.test",
  soheila: "soheila@gpseed.test",
};

export async function loginAs(page: Page, email: string, password = e2ePassword) {
  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني").fill(email);
  await page.getByLabel("كلمة المرور").fill(password);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page).not.toHaveURL(/\/login$/);
}

export async function logout(page: Page) {
  await page.goto("/logout");
  await expect(page).toHaveURL(/\/login$/);
}
```

- [ ] **Step 5: Create project form helpers**

Create `tests/e2e/support/project-form.ts`:

```ts
import type { Page } from "@playwright/test";

export async function fillProjectBasics(page: Page, data: {
  title: string;
  abstract: string;
  program: string;
  supervisor: string;
  technologies: string;
  github: string;
  video: string;
}) {
  await page.getByLabel("عنوان المشروع").fill(data.title);
  await page.getByLabel("الملخص").fill(data.abstract);
  await page.locator("#program").selectOption(data.program);
  await page.getByLabel("اسم المشرف").fill(data.supervisor);
  await page.getByLabel("التقنيات المستخدمة").fill(data.technologies);
  await page.getByLabel("رابط GitHub").fill(data.github);
  await page.getByLabel("رابط فيديو العرض").fill(data.video);
}

export async function fillTeamMember(page: Page, index: number, data: {
  fullName: string;
  studentId: string;
  nationalId: string;
  email: string;
  role: string;
}) {
  await page.locator(`#team-${index}-name`).fill(data.fullName);
  await page.locator(`#team-${index}-student-id`).fill(data.studentId);
  await page.locator(`#team-${index}-national-id`).fill(data.nationalId);
  await page.locator(`#team-${index}-email`).fill(data.email);
  await page.locator(`#team-${index}-role`).selectOption(data.role);
}

export const documentationPdfPayload = {
  name: "e2e-documentation.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"),
};

export const sourceZipPayload = {
  name: "e2e-source.zip",
  mimeType: "application/zip",
  buffer: Buffer.from(
    "UEsDBAoAAAAAAK1ZqVgAAAAAAAAAAAAAAAALAAAAY29kZS50eHRQSwECHgMKAAAAAACtWalYAAAAAAAAAAAAAAAACwAAAAAAAAAAACAAAAAAAAAAY29kZS50eHRQSwUGAAAAAAEAAQA5AAAAKQAAAAAA",
    "base64",
  ),
};
```

- [ ] **Step 6: Run TypeScript check through build**

Run:

```powershell
npm run build
```

Expected: PASS. If TypeScript reports missing Playwright types, confirm `@playwright/test` is installed and `tsconfig.json` includes `**/*.ts`, which it already does.

- [ ] **Step 7: Commit Task 2**

```powershell
git add tests/e2e/support
git commit -m "test: add e2e support helpers"
```

### Task 3: Auth And Role Routing E2E Tests

**Files:**
- Create: `tests/e2e/auth.spec.ts`
- Uses: `tests/e2e/support/auth.ts`
- Uses: `tests/e2e/support/seed.ts`

- [ ] **Step 1: Write failing auth tests**

Create `tests/e2e/auth.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

import { loginAs, logout, users } from "./support/auth";
import { resetSeedData } from "./support/seed";

test.describe("auth and role routing", () => {
  test.beforeEach(() => {
    resetSeedData();
  });

  test("redirects anonymous users to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "الدخول إلى لوحة التحكم" })).toBeVisible();
  });

  test("logs in each role and lands on the correct dashboard", async ({ page }) => {
    await loginAs(page, users.admin);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "لوحة المسؤول" })).toBeVisible();

    await logout(page);
    await loginAs(page, users.rabie);
    await expect(page).toHaveURL(/\/panel$/);
    await expect(page.getByRole("heading", { name: "المشاريع المسندة" })).toBeVisible();

    await logout(page);
    await loginAs(page, users.rana);
    await expect(page).toHaveURL(/\/student\/project$/);
    await expect(page.getByRole("heading", { name: "مشروعي" })).toBeVisible();
  });

  test("keeps users inside their allowed role area", async ({ page }) => {
    await loginAs(page, users.rana);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/student$/);
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/student$/);

    await logout(page);
    await loginAs(page, users.rabie);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/panel$/);
    await page.goto("/student/project");
    await expect(page).toHaveURL(/\/panel$/);

    await logout(page);
    await loginAs(page, users.admin);
    await page.goto("/student/project");
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("shows a login error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("البريد الإلكتروني").fill(users.admin);
    await page.getByLabel("كلمة المرور").fill("WrongPassword123!");
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(/Invalid login credentials|تعذّر تسجيل الدخول/)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run auth spec to verify it fails before helpers/config are complete**

Run:

```powershell
npx playwright test tests/e2e/auth.spec.ts --project=chromium
```

Expected before Task 1 and Task 2 are complete: FAIL due to missing config/helpers/dependency. Expected after Task 1 and Task 2: PASS.

- [ ] **Step 3: Run auth spec after support helpers**

Run:

```powershell
npm run build
npx playwright test tests/e2e/auth.spec.ts --project=chromium
```

Expected: 4 passed.

- [ ] **Step 4: Commit Task 3**

```powershell
git add tests/e2e/auth.spec.ts
git commit -m "test: cover auth and role routing e2e"
```

### Task 4: Admin Workflow E2E Tests

**Files:**
- Create: `tests/e2e/admin.spec.ts`
- Uses: `tests/e2e/support/auth.ts`
- Uses: `tests/e2e/support/seed.ts`
- Uses: `tests/e2e/support/supabase.ts`

- [ ] **Step 1: Write admin tests**

Create `tests/e2e/admin.spec.ts`:

```ts
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

import { loginAs, users } from "./support/auth";
import { resetSeedData } from "./support/seed";
import {
  adminDb,
  expectAssignment,
  getProfileByEmail,
  getProjectByTitle,
} from "./support/supabase";

test.describe("admin workflows", () => {
  test.beforeEach(() => {
    resetSeedData();
  });

  test("shows seeded dashboard counts and toggles grading window", async ({ page }) => {
    await loginAs(page, users.admin);

    await expect(page.getByText("إجمالي المشاريع")).toBeVisible();
    await expect(page.getByText("5").first()).toBeVisible();
    await expect(page.getByText("باب التقييم مفتوح")).toBeVisible();

    await page.getByRole("button", { name: "إغلاق باب التقييم" }).click();
    await expect(page.getByText("تم إغلاق باب التقييم.")).toBeVisible();
    await expect(page.getByText("باب التقييم مغلق")).toBeVisible();

    await page.getByRole("button", { name: "فتح باب التقييم" }).click();
    await expect(page.getByText("تم فتح باب التقييم.")).toBeVisible();
    await expect(page.getByText("باب التقييم مفتوح")).toBeVisible();
  });

  test("updates max team member setting", async ({ page }) => {
    await loginAs(page, users.admin);

    const input = page.getByLabel("الحد الأقصى لعدد أعضاء الفريق");
    await input.fill("4");
    await page.getByRole("button", { name: "حفظ الإعدادات" }).click();
    await expect(page.getByText("تم حفظ الإعدادات.")).toBeVisible();

    const { data, error } = await adminDb()
      .from("app_settings")
      .select("max_team_members")
      .eq("id", true)
      .single();

    expect(error).toBeNull();
    expect(data?.max_team_members).toBe(4);
  });

  test("assigns a panel member to an unassigned project", async ({ page }) => {
    await loginAs(page, users.admin);
    await page.goto("/admin/projects");

    await page.getByPlaceholder("ابحث في المشاريع، البرامج، المشرفين...").fill("نظام كشف التطفل");
    await page.getByRole("link", { name: "فتح" }).click();

    const project = await getProjectByTitle("نظام كشف التطفل في الشبكات");
    await page.locator('select[name="panel_member_id"]').selectOption({ label: "أ.د. وائل عبد القادر عوض" });
    await page.getByRole("button", { name: "إسناد عضو لجنة" }).click();
    await expect(page.getByText("Panel member assigned.")).toBeVisible();

    await expectAssignment(project.id, users.wael);
  });

  test("saves first-semester and supervision grades for Project A", async ({ page }) => {
    await loginAs(page, users.admin);
    await page.goto("/admin/projects");

    await page.getByPlaceholder("ابحث في المشاريع، البرامج، المشرفين...").fill("شبكة ذكية");
    await page.getByRole("link", { name: "فتح" }).click();

    const firstSemesterInput = page.locator('input[name$=".first_semester_score"]').first();
    const supervisionInput = page.locator('input[name$=".supervision_score"]').first();
    await firstSemesterInput.fill("10");
    await supervisionInput.fill("29");
    await page.getByRole("button", { name: "حفظ درجات الطلاب" }).click();
    await expect(page.getByText("تم حفظ درجات الطلاب.")).toBeVisible();

    const project = await getProjectByTitle("شبكة ذكية ونظام أمان لمراكز البيانات");
    const { data, error } = await adminDb()
      .from("student_supervision_grades")
      .select("first_semester_score, supervision_score")
      .eq("project_id", project.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    expect(error).toBeNull();
    expect(Number(data?.first_semester_score)).toBe(10);
    expect(Number(data?.supervision_score)).toBe(29);
  });

  test("creates a panel member and displays the temporary password once", async ({ page }) => {
    await loginAs(page, users.admin);
    await page.goto("/admin/panel-members");

    const email = "e2e-panel@gpseed.test";
    await page.getByRole("button", { name: "إضافة عضو لجنة" }).click();
    await page.getByLabel("الاسم الكامل").fill("د. اختبار لجنة");
    await page.getByLabel("البريد الإلكتروني").fill(email);
    await page.getByLabel("نوع العضو").selectOption("referee");
    await page.getByLabel("القسم / الجهة").fill("كلية الحاسبات والمعلومات بدمياط");
    await page.getByRole("button", { name: "إنشاء عضو لجنة" }).click();

    await expect(page.getByText("تم إنشاء عضو اللجنة")).toBeVisible();
    await expect(page.locator("code")).toContainText(/[A-Za-z0-9!]+/);
    const profile = await getProfileByEmail(email);
    expect(profile.role).toBe("panel_member");
    expect(profile.panel_member_type).toBe("referee");
  });

  test("downloads grades CSV with Arabic headers and seeded rows", async ({ page }) => {
    await loginAs(page, users.admin);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "تصدير تقرير الدرجات (CSV)" }).click();
    const download = await downloadPromise;
    const filePath = await download.path();
    expect(filePath).toBeTruthy();

    const csv = readFileSync(filePath!, "utf8");

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("اسم الطالب,الرقم الجامعي,الرقم القومي,البرنامج,المشروع,المشرف");
    expect(csv).toContain("شبكة ذكية ونظام أمان لمراكز البيانات");
  });
});
```

- [ ] **Step 2: Run admin spec**

Run:

```powershell
npm run build
npx playwright test tests/e2e/admin.spec.ts --project=chromium
```

Expected: 6 passed. If the CSV test fails because `download.path()` is unavailable on a remote browser, use `await download.saveAs("test-results/grades-report.csv")` and read that saved path.

- [ ] **Step 3: Commit Task 4**

```powershell
git add tests/e2e/admin.spec.ts
git commit -m "test: cover admin workflows e2e"
```

### Task 5: Panel Workflow E2E Tests

**Files:**
- Create: `tests/e2e/panel.spec.ts`
- Uses: `tests/e2e/support/auth.ts`
- Uses: `tests/e2e/support/seed.ts`
- Uses: `tests/e2e/support/supabase.ts`

- [ ] **Step 1: Write panel tests**

Create `tests/e2e/panel.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

import { loginAs, users } from "./support/auth";
import { resetSeedData } from "./support/seed";
import {
  expectDiscussionScores,
  getProjectByTitle,
  getTeamMembers,
  setGradingWindowOpen,
} from "./support/supabase";

test.describe("panel workflows", () => {
  test.beforeEach(() => {
    resetSeedData();
  });

  test("shows assigned and pending projects for a panel member", async ({ page }) => {
    await loginAs(page, users.rabie);

    await expect(page.getByText("المشاريع المسندة إليك (2)")).toBeVisible();
    await expect(page.getByText("بانتظار التقييم (1)")).toBeVisible();
    await expect(page.getByText("شبكة ذكية ونظام أمان لمراكز البيانات")).toBeVisible();
    await expect(page.getByText("تطبيق متابعة المرضى عن بُعد")).toBeVisible();
  });

  test("saves discussion scores and marks a pending project as graded", async ({ page }) => {
    await loginAs(page, users.rabie);
    await page.getByText("تطبيق متابعة المرضى عن بُعد").click();
    await page.getByRole("link", { name: "فتح وتقييم" }).last().click();

    const project = await getProjectByTitle("تطبيق متابعة المرضى عن بُعد");
    const members = await getTeamMembers(project.id);
    expect(members.length).toBeGreaterThan(0);

    await page.locator('input[name*=".project_document"]').evaluateAll((inputs) => {
      for (const input of inputs) (input as HTMLInputElement).value = "";
    });

    for (const member of members) {
      await page.locator(`input[name="scores.${member.id}.project_document"]`).fill("5");
      await page.locator(`input[name="scores.${member.id}.presentation_quality"]`).fill("5");
      await page.locator(`input[name="scores.${member.id}.scientific_mastery"]`).fill("4.5");
      await page.locator(`input[name="scores.${member.id}.feasibility"]`).fill("3");
      await page.locator(`input[name="scores.${member.id}.competition"]`).fill("2");
    }

    await page.getByRole("button", { name: "حفظ التقييم" }).click();
    await page.waitForLoadState("networkidle");
    await expectDiscussionScores(project.id, users.rabie, members.length);

    await page.goto("/panel?review=graded");
    await expect(page.getByText("تطبيق متابعة المرضى عن بُعد")).toBeVisible();
  });

  test("prefills existing scores for editing while grading is open", async ({ page }) => {
    await loginAs(page, users.rabie);
    await page.goto("/panel");
    await page.getByText("شبكة ذكية ونظام أمان لمراكز البيانات").click();
    await page.getByRole("link", { name: "فتح وتقييم" }).first().click();

    await expect(page.locator('input[name*=".project_document"]').first()).toHaveValue("5");
    await page.locator('input[name*=".competition"]').first().fill("1.5");
    await page.getByRole("button", { name: "حفظ التقييم" }).click();
    await page.waitForLoadState("networkidle");

    await expect(page.locator('input[name*=".competition"]').first()).toHaveValue("1.5");
  });

  test("blocks score entry when grading window is closed", async ({ page }) => {
    await setGradingWindowOpen(false);
    await loginAs(page, users.rabie);

    await expect(page.getByText("باب التقييم مغلق حاليًا. لا يمكنك إدخال الدرجات حتى يفتحه المسؤول.")).toBeVisible();
    await page.getByText("شبكة ذكية ونظام أمان لمراكز البيانات").click();
    await page.getByRole("link", { name: "فتح وتقييم" }).first().click();
    await expect(page.getByText("لا يمكنك إدخال أو تعديل الدرجات حتى يفتحه المسؤول")).toBeVisible();
    await expect(page.getByRole("button", { name: "حفظ التقييم" })).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Fix navigation ambiguity after first run**

If the first or second test clicks the wrong `فتح وتقييم` link after filtering, replace the click sequence with a scoped row helper:

```ts
const row = page.locator("div", { hasText: "تطبيق متابعة المرضى عن بُعد" }).filter({
  has: page.getByRole("link", { name: "فتح وتقييم" }),
}).first();
await row.getByRole("link", { name: "فتح وتقييم" }).click();
```

Use the same pattern for Project A.

- [ ] **Step 3: Run panel spec**

Run:

```powershell
npm run build
npx playwright test tests/e2e/panel.spec.ts --project=chromium
```

Expected: 4 passed.

- [ ] **Step 4: Commit Task 5**

```powershell
git add tests/e2e/panel.spec.ts
git commit -m "test: cover panel grading e2e"
```

### Task 6: Student Workflow E2E Tests

**Files:**
- Create: `tests/e2e/student.spec.ts`
- Uses: `tests/e2e/support/auth.ts`
- Uses: `tests/e2e/support/project-form.ts`
- Uses: `tests/e2e/support/seed.ts`
- Uses: `tests/e2e/support/supabase.ts`

- [ ] **Step 1: Write student tests**

Create `tests/e2e/student.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

import { loginAs, users } from "./support/auth";
import {
  documentationPdfPayload,
  fillProjectBasics,
  sourceZipPayload,
} from "./support/project-form";
import { resetSeedData } from "./support/seed";
import { expectProjectStatus, getProjectByTitle } from "./support/supabase";

test.describe("student workflows", () => {
  test.beforeEach(() => {
    resetSeedData();
  });

  test("submitted student sees read-only submitted confirmation without grades", async ({ page }) => {
    await loginAs(page, users.rana);

    await expect(page.getByText("تم تسليم المشروع بنجاح.")).toBeVisible();
    await expect(page.getByText("انتهت خطوات التسليم، ولا حاجة لأي إجراء آخر.")).toBeVisible();
    await expect(page.getByRole("link", { name: "تعديل البيانات" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "تسليم المشروع" })).toHaveCount(0);
    await expect(page.getByText("الدرجة النهائية")).toHaveCount(0);
  });

  test("draft student edits project, uploads files, submits, and becomes read-only", async ({ page }) => {
    await loginAs(page, users.soheila);

    await page.getByRole("link", { name: "تعديل البيانات" }).click();
    await fillProjectBasics(page, {
      title: "روبوت محادثة عربي لاختبار E2E",
      abstract: "وصف تفصيلي لاختبار تعديل وتسليم مشروع طالب عبر المتصفح.",
      program: "artificial_intelligence",
      supervisor: "د. أحمد محمد ربيع",
      technologies: "Next.js, Supabase, Python",
      github: "https://github.com/example/e2e-arabic-chatbot",
      video: "https://youtu.be/e2e-chatbot",
    });
    await page.getByRole("button", { name: "حفظ التغييرات" }).click();
    await expect(page).toHaveURL(/\/student\/project\?success=project-updated/);
    await expect(page.getByText("روبوت محادثة عربي لاختبار E2E")).toBeVisible();

    await page.locator("#documentation_pdf").setInputFiles(documentationPdfPayload);
    await expect(page.getByText("تم رفع الملف.").first()).toBeVisible();
    await page.locator("#source_code_zip").setInputFiles(sourceZipPayload);
    await expect(page.getByText("جميع البيانات والملفات المطلوبة مكتملة.")).toBeVisible();

    await page.getByRole("button", { name: "تسليم المشروع" }).click();
    await expect(page.getByRole("dialog", { name: "تسليم المشروع؟" })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "تسليم المشروع" }).click();
    await expect(page).toHaveURL(/\/student\/project\?success=submitted/);
    await expect(page.getByText("تم تسليم المشروع بنجاح.")).toBeVisible();

    const project = await getProjectByTitle("روبوت محادثة عربي لاختبار E2E");
    await expectProjectStatus(project.id, "submitted");
    await expect(page.getByRole("link", { name: "تعديل البيانات" })).toHaveCount(0);
  });

  test("blocks final submit when required files are missing", async ({ page }) => {
    await loginAs(page, users.soheila);

    await expect(page.getByText("العناصر الناقصة:")).toBeVisible();
    await expect(page.getByText("الكود المصدري (ZIP)")).toBeVisible();
    await page.getByRole("button", { name: "تسليم المشروع" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "تسليم المشروع" }).click();
    await expect(page.getByText(/العناصر الناقصة:/)).toBeVisible();

    const project = await getProjectByTitle("روبوت محادثة عربي (مسودة)");
    await expectProjectStatus(project.id, "draft");
  });
});
```

- [ ] **Step 2: Run student spec**

Run:

```powershell
npm run build
npx playwright test tests/e2e/student.spec.ts --project=chromium
```

Expected: 3 passed. If the upload success text clears before assertion, replace the assertion with a database check against `project_files` for the two uploaded file names.

- [ ] **Step 3: Commit Task 6**

```powershell
git add tests/e2e/student.spec.ts
git commit -m "test: cover student submission e2e"
```

### Task 7: Self-Registration E2E Tests

**Files:**
- Create: `tests/e2e/register.spec.ts`
- Uses: `tests/e2e/support/auth.ts`
- Uses: `tests/e2e/support/seed.ts`
- Uses: `tests/e2e/support/supabase.ts`

- [ ] **Step 1: Write registration tests**

Create `tests/e2e/register.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

import { e2ePassword, loginAs } from "./support/auth";
import { resetSeedData } from "./support/seed";
import { expectRegisteredStudent } from "./support/supabase";

async function fillRegistration(page, data: {
  name: string;
  studentId: string;
  nationalId: string;
  email: string;
  password: string;
}) {
  await page.getByLabel("الاسم الكامل").fill(data.name);
  await page.getByLabel("الرقم الجامعي").fill(data.studentId);
  await page.getByLabel("الرقم القومي").fill(data.nationalId);
  await page.getByLabel("البريد الإلكتروني").fill(data.email);
  await page.getByLabel("كلمة المرور").fill(data.password);
}

test.describe("self-registration", () => {
  test.beforeEach(() => {
    resetSeedData();
  });

  test("allows an approved unclaimed roster student to register and log in", async ({ page }) => {
    const email = "register-806599001@gpseed.test";

    await page.goto("/register");
    await fillRegistration(page, {
      name: "طالب اختبار التسجيل 1",
      studentId: "806599001",
      nationalId: "29801010199991",
      email,
      password: e2ePassword,
    });
    await page.getByRole("button", { name: "تسجيل" }).click();

    await expect(page.getByText("تم إنشاء حسابك بنجاح. يمكنك الآن تسجيل الدخول.")).toBeVisible();
    await expectRegisteredStudent("806599001", email);

    await loginAs(page, email);
    await expect(page).toHaveURL(/\/student\/project$/);
  });

  test("rejects an unapproved university id", async ({ page }) => {
    await page.goto("/register");
    await fillRegistration(page, {
      name: "طالب غير معتمد",
      studentId: "806500999",
      nationalId: "29801010199992",
      email: "not-approved@gpseed.test",
      password: e2ePassword,
    });
    await page.getByRole("button", { name: "تسجيل" }).click();

    await expect(page.getByText("الرقم الجامعي غير معتمد للتسجيل. تواصل مع إدارة النظام.")).toBeVisible();
  });

  test("rejects an already claimed university id", async ({ page }) => {
    await page.goto("/register");
    await fillRegistration(page, {
      name: "طالب مكرر",
      studentId: "806599001",
      nationalId: "29801010199993",
      email: "first-claim@gpseed.test",
      password: e2ePassword,
    });
    await page.getByRole("button", { name: "تسجيل" }).click();
    await expect(page.getByText("تم إنشاء حسابك بنجاح. يمكنك الآن تسجيل الدخول.")).toBeVisible();

    await page.goto("/register");
    await fillRegistration(page, {
      name: "طالب مكرر آخر",
      studentId: "806599001",
      nationalId: "29801010199994",
      email: "second-claim@gpseed.test",
      password: e2ePassword,
    });
    await page.getByRole("button", { name: "تسجيل" }).click();
    await expect(page.getByText("تم استخدام هذا الرقم الجامعي للتسجيل من قبل.")).toBeVisible();
  });
});
```

- [ ] **Step 2: Run registration spec**

Run:

```powershell
npm run build
npx playwright test tests/e2e/register.spec.ts --project=chromium
```

Expected: 3 passed.

- [ ] **Step 3: Commit Task 7**

```powershell
git add tests/e2e/register.spec.ts
git commit -m "test: cover student registration e2e"
```

### Task 8: Stabilize Selectors And Fix Test Fragility

**Files:**
- Modify only the smallest necessary files under `src/app/**` or `src/components/**` if accessible selectors are insufficient.
- Test: all E2E specs.

- [ ] **Step 1: Run the full Chromium suite**

Run:

```powershell
npm run build
npx playwright test --project=chromium
```

Expected after Tasks 1-7: all Chromium E2E tests pass.

- [ ] **Step 2: Add `aria-label` only where repeated controls are ambiguous**

If Playwright cannot reliably target repeated table checkboxes, add accessible labels in `src/app/admin/projects/projects-table.tsx`:

```tsx
<input
  type="checkbox"
  aria-label="تحديد كل المشاريع"
  checked={table.getIsAllPageRowsSelected()}
  onChange={table.getToggleAllPageRowsSelectedHandler()}
  className="rounded border-slate-300"
/>
```

and:

```tsx
<input
  type="checkbox"
  aria-label={`تحديد مشروع ${row.original.title}`}
  checked={row.getIsSelected()}
  onChange={row.getToggleSelectedHandler()}
  className="rounded border-slate-300"
/>
```

- [ ] **Step 3: Add labels to assignment selects only if needed**

If `select[name="panel_member_id"]` is brittle, add labels in `src/app/admin/projects/assignment-forms.tsx`:

```tsx
<label className="sr-only" htmlFor={lockedToProject ? "panel-member-for-project" : "panel-member-for-bulk"}>
  اختر عضو اللجنة
</label>
<select
  id={lockedToProject ? "panel-member-for-project" : "panel-member-for-bulk"}
  name="panel_member_id"
  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
  required
>
```

- [ ] **Step 4: Re-run impacted specs**

Run:

```powershell
npm run build
npx playwright test tests/e2e/admin.spec.ts tests/e2e/panel.spec.ts --project=chromium
```

Expected: all impacted tests pass.

- [ ] **Step 5: Commit Task 8**

If no app selector changes were needed:

```powershell
git status --short
```

Expected: no unstaged changes from this task.

If selector changes were needed:

```powershell
git add src/app/admin/projects/projects-table.tsx src/app/admin/projects/assignment-forms.tsx
git commit -m "test: improve accessible e2e selectors"
```

### Task 9: Cross-Browser And Mobile Validation

**Files:**
- Modify: `playwright.config.ts` only if project settings need timeout adjustment.
- Test: all E2E specs.

- [ ] **Step 1: Run all configured browsers**

Run:

```powershell
npm run test:e2e
```

Expected: all tests pass in `chromium`, `firefox`, `webkit`, and `mobile-chrome`.

- [ ] **Step 2: Adjust timeouts only if Supabase is slow**

If tests fail only from Supabase or browser startup latency, modify `playwright.config.ts`:

```ts
timeout: 90_000,
expect: {
  timeout: 15_000,
},
```

Leave the existing `testDir`, `workers`, `reporter`, `use`, `webServer`, and `projects` settings as they are.

- [ ] **Step 3: Re-run the failed project**

Run one failed project at a time:

```powershell
npx playwright test --project=webkit
```

Expected: PASS.

- [ ] **Step 4: Commit Task 9**

```powershell
git add playwright.config.ts
git commit -m "test: stabilize cross-browser e2e timeouts"
```

If no config changes were needed, skip this commit.

### Task 10: Documentation And Manual Scenario Alignment

**Files:**
- Modify: `README.md`
- Modify: `docs/manual-test-scenario.md`

- [ ] **Step 1: Update README verification section**

Replace the `README.md` verification block with:

````markdown
## Verification

Run the fast checks:

```bash
npm test
npm run lint
npm run build
```

Run production-like E2E checks against a dedicated test Supabase project:

```bash
npm run seed
npm run test:e2e
```

Run the full pre-production gate:

```bash
npm run verify:prod
```

`npm run test:e2e` builds the app, starts `next start` on `127.0.0.1:3107`, resets the seeded Supabase data during the suite, and runs Playwright across desktop and mobile browser projects. Do not run it with `.env.local` pointed at production.
````

- [ ] **Step 2: Update manual scenario announce note**

In `docs/manual-test-scenario.md`, replace the line:

```markdown
1. As admin, **إعلان الدرجات النهائية** → grading window auto-closes; announce timestamp shown.
```

with:

```markdown
1. As admin, close and reopen **باب التقييم** from the dashboard to verify that panel score entry is allowed only while the grading window is open.
```

- [ ] **Step 3: Run docs-safe checks**

Run:

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Commit Task 10**

```powershell
git add README.md docs/manual-test-scenario.md
git commit -m "docs: document e2e production validation"
```

### Task 11: Final Production Gate

**Files:**
- No file changes.
- Test: all verification commands.

- [ ] **Step 1: Run unit/integration tests**

Run:

```powershell
npm test
```

Expected: all Vitest tests pass.

- [ ] **Step 2: Run lint**

Run:

```powershell
npm run lint
```

Expected: PASS with no errors.

- [ ] **Step 3: Run build**

Run:

```powershell
npm run build
```

Expected: Next 16 production build passes.

- [ ] **Step 4: Run full E2E suite**

Run:

```powershell
npm run test:e2e
```

Expected: all Playwright tests pass across configured browsers.

- [ ] **Step 5: Inspect Playwright report only on failure**

If a test fails, run:

```powershell
npm run test:e2e:report
```

Expected: HTML report opens with traces/screenshots/videos for failed tests.

- [ ] **Step 6: Commit any final fixes**

If Task 11 required fixes:

```powershell
git add package.json package-lock.json playwright.config.ts tests/e2e README.md docs/manual-test-scenario.md src
git commit -m "test: complete production e2e validation"
```

If no fixes were required, skip this commit.

## Release Gate Checklist

- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] `npm run test:e2e` passes.
- [ ] Playwright report contains no unresolved failures.
- [ ] `.env.local` used for E2E points at a dedicated test Supabase project.
- [ ] Manual scenario matches the implemented app behavior.

## Self-Review

Spec coverage:

- Auth and route guards are covered by Task 3.
- Admin dashboard, grading toggle, settings, assignment, student grades, panel member creation, and CSV export are covered by Task 4.
- Panel grading, editing, and closed-window lockout are covered by Task 5.
- Student submitted read-only flow, draft edit, upload, submit, and missing-requirement guard are covered by Task 6.
- Self-registration roster gates are covered by Task 7.
- Cross-browser and mobile smoke coverage are covered by Task 9.
- Documentation alignment is covered by Task 10.

No empty implementation slot remains in this plan. The only current product gap is the old manual "announce grades" step, which this plan explicitly aligns with the code that exists today.
