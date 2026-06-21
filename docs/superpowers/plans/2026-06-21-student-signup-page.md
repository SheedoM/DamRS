# Student Signup Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a student self-signup page that creates accounts compatible with the existing student login flow.

**Architecture:** Keep `/register` as the public signup route. Extract pure registration parsing and credential-building helpers so the student credential contract is covered by Vitest before the Server Action changes. Keep Supabase mutations in the colocated Server Action and keep UI state in the existing client page.

**Tech Stack:** Next.js 16 App Router, React 19 `useActionState`, Supabase SSR/admin clients, Zod 4, Vitest, Tailwind CSS.

---

## File Structure

- Create `src/app/register/registration.ts`: pure validation, derived auth credentials, profile insert payload, and roster national-ID mismatch helper.
- Create `src/app/register/registration.test.ts`: Vitest tests for credential derivation, validation, removed email/password requirement, roster mismatch, and profile/auth payload construction.
- Modify `src/app/register/actions.ts`: import helper functions, remove email/password parsing, create auth users with `{student_id}@damrs.edu` and national ID password, validate roster national ID, store program.
- Modify `src/app/register/page.tsx`: match the login page branding, remove email/password fields, add program selector, and explain student credentials.
- Modify `src/app/login/page.tsx`: show a student-only link to `/register`.

---

### Task 1: Add Tested Registration Helpers

**Files:**
- Create: `src/app/register/registration.ts`
- Test: `src/app/register/registration.test.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `src/app/register/registration.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  buildStudentAuthCredentials,
  buildStudentProfileInsert,
  parseStudentRegistrationForm,
  rosterNationalIdMismatch,
} from "./registration";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }
  return data;
}

describe("student registration helpers", () => {
  it("derives the auth email from the university ID and uses national ID as password", () => {
    const credentials = buildStudentAuthCredentials({
      full_name: "  محمود سامي  ",
      student_id: " 20210001 ",
      national_id: "30203150100015",
      program: "computer_science",
    });

    expect(credentials).toEqual({
      email: "20210001@damrs.edu",
      password: "30203150100015",
      email_confirm: true,
      user_metadata: {
        full_name: "محمود سامي",
        role: "student",
        student_id: "20210001",
        program: "computer_science",
      },
    });
  });

  it("does not require public email or password fields", () => {
    const parsed = parseStudentRegistrationForm(
      form({
        full_name: "محمود سامي",
        student_id: "20210001",
        national_id: "30203150100015",
        program: "computer_science",
      }),
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data).toEqual({
        full_name: "محمود سامي",
        student_id: "20210001",
        national_id: "30203150100015",
        program: "computer_science",
      });
    }
  });

  it("rejects invalid national ID values", () => {
    const parsed = parseStudentRegistrationForm(
      form({
        full_name: "محمود سامي",
        student_id: "20210001",
        national_id: "123",
        program: "computer_science",
      }),
    );

    expect(parsed).toEqual({
      ok: false,
      message: "الرقم القومي يجب أن يتكون من 14 رقمًا.",
    });
  });

  it("rejects missing program values", () => {
    const parsed = parseStudentRegistrationForm(
      form({
        full_name: "محمود سامي",
        student_id: "20210001",
        national_id: "30203150100015",
        program: "",
      }),
    );

    expect(parsed).toEqual({
      ok: false,
      message: "اختر البرنامج.",
    });
  });

  it("flags roster national ID mismatch only when the roster stores a national ID", () => {
    expect(rosterNationalIdMismatch("30203150100015", "30203150100015")).toBe(false);
    expect(rosterNationalIdMismatch("30203150100015", "30203150100016")).toBe(true);
    expect(rosterNationalIdMismatch(null, "30203150100016")).toBe(false);
    expect(rosterNationalIdMismatch("", "30203150100016")).toBe(false);
  });

  it("builds the student profile insert with the derived login email and program", () => {
    const profile = buildStudentProfileInsert("user-1", {
      full_name: "محمود سامي",
      student_id: "20210001",
      national_id: "30203150100015",
      program: "computer_science",
    });

    expect(profile).toEqual({
      id: "user-1",
      full_name: "محمود سامي",
      email: "20210001@damrs.edu",
      role: "student",
      student_id: "20210001",
      national_id: "30203150100015",
      program: "computer_science",
    });
  });
});
```

- [ ] **Step 2: Run helper tests to verify RED**

Run: `npx vitest run src/app/register/registration.test.ts`

Expected: FAIL because `src/app/register/registration.ts` does not exist.

- [ ] **Step 3: Write minimal helper implementation**

Create `src/app/register/registration.ts`:

```ts
import { z } from "zod";

import { programValues, type ProgramValue } from "@/lib/i18n/labels";

export type StudentRegistrationInput = {
  full_name: string;
  student_id: string;
  national_id: string;
  program: ProgramValue;
};

export type StudentRegistrationParseResult =
  | { ok: true; data: StudentRegistrationInput }
  | { ok: false; message: string };

export const registerStudentSchema = z.object({
  full_name: z.string().trim().min(2, "الاسم الكامل مطلوب."),
  student_id: z.string().trim().min(3, "الرقم الجامعي مطلوب."),
  national_id: z.string().trim().regex(/^\d{14}$/, "الرقم القومي يجب أن يتكون من 14 رقمًا."),
  program: z.enum(programValues, { message: "اختر البرنامج." }),
});

export function deriveStudentAuthEmail(studentId: string) {
  return `${studentId.trim()}@damrs.edu`;
}

export function parseStudentRegistrationForm(formData: FormData): StudentRegistrationParseResult {
  const parsed = registerStudentSchema.safeParse({
    full_name: formData.get("full_name"),
    student_id: formData.get("student_id"),
    national_id: formData.get("national_id"),
    program: formData.get("program"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "بيانات التسجيل غير صالحة." };
  }

  return { ok: true, data: parsed.data };
}

export function buildStudentAuthCredentials(input: StudentRegistrationInput) {
  const fullName = input.full_name.trim();
  const studentId = input.student_id.trim();
  const nationalId = input.national_id.trim();

  return {
    email: deriveStudentAuthEmail(studentId),
    password: nationalId,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: "student",
      student_id: studentId,
      program: input.program,
    },
  };
}

export function buildStudentProfileInsert(userId: string, input: StudentRegistrationInput) {
  const fullName = input.full_name.trim();
  const studentId = input.student_id.trim();
  const nationalId = input.national_id.trim();

  return {
    id: userId,
    full_name: fullName,
    email: deriveStudentAuthEmail(studentId),
    role: "student",
    student_id: studentId,
    national_id: nationalId,
    program: input.program,
  };
}

export function rosterNationalIdMismatch(
  rosterNationalId: string | null | undefined,
  submittedNationalId: string,
) {
  return Boolean(rosterNationalId?.trim()) && rosterNationalId?.trim() !== submittedNationalId.trim();
}
```

- [ ] **Step 4: Run helper tests to verify GREEN**

Run: `npx vitest run src/app/register/registration.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

Run:

```bash
git add src/app/register/registration.ts src/app/register/registration.test.ts
git commit -m "test: cover student signup credential helpers"
```

Expected: commit succeeds.

---

### Task 2: Update Server Action Credential Flow

**Files:**
- Modify: `src/app/register/actions.ts`
- Test: `src/app/register/registration.test.ts`

- [ ] **Step 1: Confirm helper tests still pass before action edits**

Run: `npx vitest run src/app/register/registration.test.ts`

Expected: PASS.

- [ ] **Step 2: Replace action parsing and account payloads**

Modify `src/app/register/actions.ts` so it imports helpers:

```ts
import {
  buildStudentAuthCredentials,
  buildStudentProfileInsert,
  parseStudentRegistrationForm,
  rosterNationalIdMismatch,
} from "./registration";
```

Remove the local `z` import and `registerSchema`. In `registerStudentAction`, replace the current `safeParse` block with:

```ts
  const parsed = parseStudentRegistrationForm(formData);

  if (!parsed.ok) {
    return { ok: false, message: parsed.message };
  }
```

Change the eligible student lookup to select the roster national ID:

```ts
    .select("id, claimed_by, national_id")
```

After the `claimed_by` check, add:

```ts
  if (rosterNationalIdMismatch(eligible.national_id as string | null, parsed.data.national_id)) {
    return { ok: false, message: "الرقم القومي لا يطابق بيانات الرقم الجامعي المعتمد." };
  }
```

Create the auth user with:

```ts
  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser(
    buildStudentAuthCredentials(parsed.data),
  );
```

Insert the profile with:

```ts
  const { error: profileError } = await adminClient
    .from("profiles")
    .insert(buildStudentProfileInsert(authUser.user.id, parsed.data));
```

- [ ] **Step 3: Run tests after action edit**

Run: `npm test`

Expected: PASS.

- [ ] **Step 4: Commit Task 2**

Run:

```bash
git add src/app/register/actions.ts src/app/register/registration.ts src/app/register/registration.test.ts
git commit -m "feat: align student self-signup credentials"
```

Expected: commit succeeds.

---

### Task 3: Update Signup And Login UI

**Files:**
- Modify: `src/app/register/page.tsx`
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Update register page fields and branding**

Modify `src/app/register/page.tsx` to:

- import `Image` from `next/image`
- import `programOptions` from `@/lib/i18n/labels`
- use the same two-column visual shell as `/login`
- remove `email` and `password` inputs
- add a `program` select with the existing `programOptions`
- add helper copy stating that students will log in with university ID and national ID

The form fields should be:

```tsx
<Input id="full_name" name="full_name" autoComplete="name" required />
<Input id="student_id" name="student_id" inputMode="numeric" autoComplete="username" required />
<Input id="national_id" name="national_id" type="password" inputMode="numeric" maxLength={14} autoComplete="new-password" required />
<select
  id="program"
  name="program"
  required
  defaultValue=""
  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
>
  <option value="" disabled>اختر البرنامج</option>
  {programOptions.map((option) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ))}
</select>
```

- [ ] **Step 2: Add student-only signup link on login page**

In `src/app/login/page.tsx`, import `Link` from `next/link`. Under the submit button, render this only when `mode === "student"`:

```tsx
{mode === "student" ? (
  <p className="text-center text-sm text-slate-500">
    ليس لديك حساب طالب؟{" "}
    <Link href="/register" className="font-semibold text-[var(--brand-blue)] hover:underline">
      إنشاء حساب
    </Link>
  </p>
) : null}
```

- [ ] **Step 3: Run lint/build verification**

Run: `npm run lint`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Commit Task 3**

Run:

```bash
git add src/app/register/page.tsx src/app/login/page.tsx
git commit -m "feat: add student signup page experience"
```

Expected: commit succeeds.

---

### Task 4: Final Verification

**Files:**
- Verify: all modified files

- [ ] **Step 1: Run full tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Review final diff**

Run: `git diff --stat main...HEAD`

Expected: only signup plan, signup helper/test/action/page, and login page are changed from `main`.
