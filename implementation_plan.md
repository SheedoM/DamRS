# GP Review — Implementation Plan

All findings from the [code review](file:///C:/Users/shady/.gemini/antigravity-ide/brain/e02b53d5-5558-4d58-9e39-2b789e53c986/code_review.md) and [UX review](file:///C:/Users/shady/.gemini/antigravity-ide/brain/e02b53d5-5558-4d58-9e39-2b789e53c986/ux_review.md) are included. Organized into 8 dependency-ordered phases.

**User decisions baked in:**
- All findings included (critical through low)
- Student grade visibility: progress stepper + final grade + review count (no panel notes/scores)
- Toast system: custom component, triggered by URL query param
- Notifications: in-app only (dashboard banner)
- Bulk assignment: included
- Confirm dialog: fix manually (no library)
- Reports sidebar link: remove (no reports page)
- Mobile nav: slide-out drawer from left
- Review UI: merge draft + final into single page with progressive unlock
- Student sees grade after all final reviews complete (`final_reviewed`)
- Client-side file size validation before upload

---

## Phase 1 — Shared Infrastructure & Code Deduplication

Foundational changes that other phases depend on.

---

### 1.1 Extract shared `ActionResult` type

**Origin:** Code review M1

Three identical `ActionResult` types exist:

| File | Lines |
|------|-------|
| [admin/actions.ts](file:///c:/Users/shady/Desktop/gp-review/src/app/admin/actions.ts#L18-L21) | 18–21 |
| [student/project/actions.ts](file:///c:/Users/shady/Desktop/gp-review/src/app/student/project/actions.ts#L17-L20) | 17–20 |
| [review-actions.ts](file:///c:/Users/shady/Desktop/gp-review/src/app/panel/projects/%5BprojectId%5D/review-actions.ts#L16-L19) | 16–19 |

**Steps:**
1. Create [NEW] `src/lib/actions.ts`
2. Export `type ActionResult = { ok: boolean; message: string };`
3. In each of the 3 files above, delete the local `ActionResult` type and add `import type { ActionResult } from "@/lib/actions";`

---

### 1.2 Extract shared `writeAuditLog` function

**Origin:** Code review H1

Three separate audit log helpers exist:

| File | Lines | Variant |
|------|-------|---------|
| [admin/actions.ts](file:///c:/Users/shady/Desktop/gp-review/src/app/admin/actions.ts#L60-L71) | 60–71 | Calls `requireRole(["admin"])` internally (redundant) |
| [student/project/actions.ts](file:///c:/Users/shady/Desktop/gp-review/src/app/student/project/actions.ts#L73-L84) | 73–84 | Calls `requireRole(["student"])` internally (redundant) |
| [review-actions.ts](file:///c:/Users/shady/Desktop/gp-review/src/app/panel/projects/%5BprojectId%5D/review-actions.ts#L53-L68) | 53–68 | Takes `actorId` as argument (correct pattern) |

**Steps:**
1. Create [NEW] `src/lib/audit.ts`
2. Export a single function following the panel pattern (takes `actorId` directly):
   ```ts
   export async function writeAuditLog(
     actorId: string,
     action: string,
     entityType: string,
     entityId: string,
     metadata: Record<string, unknown> = {},
   ) {
     const supabase = await createSupabaseServerClient();
     await supabase.from("audit_logs").insert({
       actor_id: actorId,
       action,
       entity_type: entityType,
       entity_id: entityId,
       metadata,
     });
   }
   ```
3. In all 3 action files, delete the local helper and import from `@/lib/audit`
4. At each call site, pass `profile.id` (already available from the `requireRole` call at the top of the action)

---

### 1.3 Extract shared `firstRelation` helper

**Origin:** Code review M7

Duplicated in:
- [admin/queries.ts:174](file:///c:/Users/shady/Desktop/gp-review/src/lib/admin/queries.ts#L174)
- [panel/queries.ts:85](file:///c:/Users/shady/Desktop/gp-review/src/lib/panel/queries.ts#L85)

**Steps:**
1. Add to [MODIFY] `src/lib/utils.ts`:
   ```ts
   export function firstRelation<T>(relation: T | T[] | null): T | null {
     if (Array.isArray(relation)) return relation[0] ?? null;
     return relation ?? null;
   }
   ```
2. In both files, delete the local `firstRelation` function and import from `@/lib/utils`

---

### 1.4 Extract shared `formatFileSize` and `formatDate` utilities

**Origin:** UX review (duplicate utilities found in 4+ files)

`formatFileSize` is duplicated in:
- [project-summary.tsx:32](file:///c:/Users/shady/Desktop/gp-review/src/app/student/project/project-summary.tsx#L32)
- [student/project/status/page.tsx:16](file:///c:/Users/shady/Desktop/gp-review/src/app/student/project/status/page.tsx#L16)
- [panel/projects/[projectId]/page.tsx:20](file:///c:/Users/shady/Desktop/gp-review/src/app/panel/projects/%5BprojectId%5D/page.tsx#L20)
- [admin/projects/[projectId]/page.tsx:18](file:///c:/Users/shady/Desktop/gp-review/src/app/admin/projects/%5BprojectId%5D/page.tsx#L18)

`formatDate` is duplicated in:
- [panel/projects/page.tsx:14](file:///c:/Users/shady/Desktop/gp-review/src/app/panel/projects/page.tsx#L14)
- [panel/projects/[projectId]/page.tsx:16](file:///c:/Users/shady/Desktop/gp-review/src/app/panel/projects/%5BprojectId%5D/page.tsx#L16)
- [admin/projects/[projectId]/page.tsx:24](file:///c:/Users/shady/Desktop/gp-review/src/app/admin/projects/%5BprojectId%5D/page.tsx#L24)

**Steps:**
1. Add both functions to [MODIFY] `src/lib/utils.ts`:
   ```ts
   export function formatFileSize(size: number) {
     if (size < 1024) return `${size} B`;
     if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
     return `${(size / (1024 * 1024)).toFixed(1)} MB`;
   }

   export function formatDate(value: string | null) {
     return value ? new Date(value).toLocaleString() : "Not available";
   }
   ```
2. In all files listed above, delete the local function and import from `@/lib/utils`

---

### 1.5 Consolidate duplicate `ScoreInput` component

**Origin:** UX review A11-2

Two separate `ScoreInput` implementations:
- [components/review/score-input.tsx](file:///c:/Users/shady/Desktop/gp-review/src/components/review/score-input.tsx) — used by admin forms
- [panel/.../review-form.tsx:20-46](file:///c:/Users/shady/Desktop/gp-review/src/app/panel/projects/%5BprojectId%5D/review-form.tsx#L20-L46) — inline, used by panel review form

They are functionally identical.

**Steps:**
1. [MODIFY] `src/components/review/score-input.tsx` — add an `id` prop for accessibility:
   ```ts
   export function ScoreInput({
     label,
     name,
     max,
     defaultValue,
     id,
   }: {
     label: string;
     name: string;
     max: number;
     defaultValue: number;
     id?: string;
   }) {
     const inputId = id || name;
     return (
       <div className="space-y-2">
         <label htmlFor={inputId} className="text-sm font-medium text-slate-700">{label}</label>
         <input
           id={inputId}
           name={name}
           type="number"
           min="0"
           max={String(max)}
           step="0.5"
           defaultValue={defaultValue}
           className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]/20"
         />
         <p id={`${inputId}-hint`} className="text-xs text-slate-500">Max {max}</p>
       </div>
     );
   }
   ```
2. In [MODIFY] `review-form.tsx`, delete the inline `ScoreInput` function (lines 20–46) and import from `@/components/review/score-input`

---

## Phase 2 — Bug Fixes & Security (Code Review Critical + High)

---

### 2.1 Fix race condition in `saveGradeOverrideAction`

**Origin:** Code review C1

[admin/actions.ts:345–363](file:///c:/Users/shady/Desktop/gp-review/src/app/admin/actions.ts#L345-L363)

The deactivate-then-insert is not transactional. If the insert fails, all overrides are deactivated.

**Steps:**
1. [MODIFY] `src/app/admin/actions.ts` — in `saveGradeOverrideAction`:
   - Save the `previousOverride.id` before deactivating (already fetched on line 338–343)
   - After the insert (line 355–364), if `error` is truthy AND `previousOverride` existed, **re-activate** the previous override:
     ```ts
     if (error || !override) {
       if (previousOverride) {
         await supabase
           .from("project_grade_overrides")
           .update({ is_active: true })
           .eq("id", previousOverride.id);
       }
       return { ok: false, message: error?.message || "Unable to save grade override." };
     }
     ```

---

### 2.2 Fix `updateProjectAction` ownership verification

**Origin:** Code review C2

[student/project/actions.ts:147–198](file:///c:/Users/shady/Desktop/gp-review/src/app/student/project/actions.ts#L147-L198)

The action doesn't verify the student owns the project. RLS blocks the mutation silently, but the action reports success.

**Steps:**
1. [MODIFY] `src/app/student/project/actions.ts` — in `updateProjectAction`:
   - After `requireRole`, fetch the project to verify ownership:
     ```ts
     const { profile } = await requireRole(["student"]);
     ```
   - Change the update call to use `.select("id").single()` and add ownership check:
     ```ts
     const { data: updatedProject, error: projectError } = await supabase
       .from("projects")
       .update(project)
       .eq("id", projectId)
       .eq("team_leader_id", profile.id)  // explicit ownership check
       .select("id")
       .single();

     if (projectError || !updatedProject) {
       return { ok: false, message: "Project not found or access denied." };
     }
     ```
   - Only proceed with team_members delete/insert if the update succeeded

---

### 2.3 Fix `normalizeScores` using `|| 0` instead of `?? 0`

**Origin:** Code review H4

[review.schema.ts:133–142](file:///c:/Users/shady/Desktop/gp-review/src/lib/review/review.schema.ts#L133-L142)

**Steps:**
1. [MODIFY] `src/lib/review/review.schema.ts` — in `normalizeScores`, replace all 6 occurrences of `|| 0` with `?? 0`:
   ```ts
   documentation_score: Number(input.documentation_score ?? 0),
   implementation_score: Number(input.implementation_score ?? 0),
   code_quality_score: Number(input.code_quality_score ?? 0),
   innovation_score: Number(input.innovation_score ?? 0),
   presentation_score: Number(input.presentation_score ?? 0),
   discussion_score: Number(input.discussion_score ?? 0),
   ```

---

### 2.4 Fix `getOpenActiveCycleId` using `.single()` instead of `.maybeSingle()`

**Origin:** Code review M6

[student/project/actions.ts:40](file:///c:/Users/shady/Desktop/gp-review/src/app/student/project/actions.ts#L40)

**Steps:**
1. [MODIFY] `src/app/student/project/actions.ts` — line 40: change `.single()` to `.maybeSingle()`

---

### 2.5 Fix root page redirect detection

**Origin:** Code review L1

[page.tsx:27](file:///c:/Users/shady/Desktop/gp-review/src/app/page.tsx#L27)

**Steps:**
1. [MODIFY] `src/app/page.tsx` — replace the string-match check:
   ```ts
   // Before:
   if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
     throw error;
   }

   // After:
   import { isRedirectError } from "next/dist/client/components/redirect-error";
   // ...
   if (isRedirectError(error)) {
     throw error;
   }
   ```

> [!IMPORTANT]
> Verify that `isRedirectError` exists in the installed Next.js version. Check `node_modules/next/dist/client/components/redirect-error.js`. If the export name differs, use the actual export name from that file.

---

### 2.6 Increase signed URL expiry time

**Origin:** Code review H3

[storage.ts:21](file:///c:/Users/shady/Desktop/gp-review/src/lib/project/storage.ts#L21)

**Steps:**
1. [MODIFY] `src/lib/project/storage.ts` — change line 21:
   ```ts
   export const SIGNED_FILE_URL_EXPIRES_IN_SECONDS = 60 * 60; // 60 minutes
   ```

---

### 2.7 Reduce `revalidatePath` flood

**Origin:** Code review M3

Multiple actions call `revalidatePath` 5–10 times.

**Steps:**
1. In each of these action files, replace the multiple `revalidatePath` calls with a single root revalidation:
   ```ts
   revalidatePath("/", "layout");
   ```
   Files to change:
   - [admin/actions.ts](file:///c:/Users/shady/Desktop/gp-review/src/app/admin/actions.ts) — `enterMissingPanelGradeAction` (lines 459–468), `revokeAssignmentAction`, `saveGradeOverrideAction`
   - [review-actions.ts](file:///c:/Users/shady/Desktop/gp-review/src/app/panel/projects/%5BprojectId%5D/review-actions.ts) — `saveDraftReviewAction`, `saveFinalReviewAction`
   - [student/project/actions.ts](file:///c:/Users/shady/Desktop/gp-review/src/app/student/project/actions.ts) — `createProjectAction`, `updateProjectAction`, `uploadProjectFileAction`, `submitProjectAction`

---

## Phase 3 — Layout & Navigation

---

### 3.1 Remove "Reports" sidebar link

**Origin:** Code review H2, UX review N2. **User confirmed: remove, do not build the page.**

**Steps:**
1. [MODIFY] `src/components/layout/sidebar.tsx` — delete line 15:
   ```ts
   { label: "Reports", href: "/admin/reports", icon: ClipboardCheck },
   ```
2. Remove the `ClipboardCheck` import from lucide-react if no longer used elsewhere in the file

---

### 3.2 Add active-link highlighting to the sidebar

**Origin:** UX review N3

[sidebar.tsx:48–60](file:///c:/Users/shady/Desktop/gp-review/src/components/layout/sidebar.tsx#L48-L60)

All sidebar links look identical regardless of current route.

**Steps:**
1. Create [NEW] `src/components/layout/nav-link.tsx` (client component):
   ```tsx
   "use client";

   import Link from "next/link";
   import { usePathname } from "next/navigation";
   import type { LucideIcon } from "lucide-react";
   import { cn } from "@/lib/utils";

   type NavLinkProps = {
     href: string;
     label: string;
     icon: LucideIcon;
   };

   export function NavLink({ href, label, icon: Icon }: NavLinkProps) {
     const pathname = usePathname();
     const isActive = href === "/" ? pathname === href : pathname === href || pathname.startsWith(href + "/");

     return (
       <Link
         href={href}
         className={cn(
           "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
           isActive
             ? "bg-[rgba(52,126,224,0.08)] text-[var(--brand-blue)] font-semibold"
             : "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
         )}
         aria-current={isActive ? "page" : undefined}
       >
         <Icon className="h-4 w-4" aria-hidden="true" />
         {label}
       </Link>
     );
   }
   ```
2. [MODIFY] `src/components/layout/sidebar.tsx`:
   - Import `NavLink` from `./nav-link`
   - Replace the `<Link>` block inside the `.map()` (lines 50–59) with `<NavLink key={item.href} {...item} />`
   - The sidebar itself can remain a server component — only `NavLink` is a client component

---

### 3.3 Add `aria-label` to sidebar `<nav>`

**Origin:** Code review L2

[sidebar.tsx:48](file:///c:/Users/shady/Desktop/gp-review/src/components/layout/sidebar.tsx#L48)

**Steps:**
1. [MODIFY] `src/components/layout/sidebar.tsx` — add `aria-label` to the `<nav>`:
   ```tsx
   <nav aria-label="Main navigation" className="flex-1 space-y-1 px-3 py-4">
   ```

---

### 3.4 Add mobile navigation drawer

**Origin:** UX review N1 (Critical). **User chose: slide-out drawer from the left.**

Currently the sidebar is `hidden` below `lg` breakpoint ([sidebar.tsx:33](file:///c:/Users/shady/Desktop/gp-review/src/components/layout/sidebar.tsx#L33)).

**Steps:**
1. Create [NEW] `src/components/layout/mobile-nav.tsx` (client component):
   - Accepts `role: UserRole` prop
   - Renders a `Menu` (hamburger) icon button, visible only below `lg`
   - On click, opens a slide-out drawer from the left containing the same nav items from `navigationByRole[role]` using `NavLink` components
   - Drawer has:
     - A backdrop overlay (`bg-slate-950/50`) that closes on click
     - Close on `Escape` key
     - The GP Review logo and branding at the top (same as sidebar header)
     - Smooth slide-in/slide-out CSS transition (`transform translateX`)
   - Export `navigationByRole` from `sidebar.tsx` so `mobile-nav.tsx` can import it
2. [MODIFY] `src/components/layout/topbar.tsx`:
   - Import `MobileNav` from `./mobile-nav`
   - Accept `role` prop (add to `TopbarProps`)
   - Render `<MobileNav role={role} />` at the start of the header (before the title)
3. [MODIFY] `src/components/layout/app-shell.tsx`:
   - Pass `profile.role` to `<Topbar>`: `<Topbar title={title} profile={profile} role={profile.role} />`

> [!IMPORTANT]
> `navigationByRole` must be exported from `sidebar.tsx` (currently it's a module-level `const` but not exported). Add `export` keyword.

---

### 3.5 Show user identity on mobile

**Origin:** UX review A11-4

[topbar.tsx:21](file:///c:/Users/shady/Desktop/gp-review/src/components/layout/topbar.tsx#L21): Name is `hidden sm:block`.

**Steps:**
1. [MODIFY] `src/components/layout/topbar.tsx` — change the user info div:
   ```tsx
   <div className="text-right">
     <p className="text-sm font-medium text-slate-900 sm:inline hidden">{profile.full_name}</p>
     <p className="text-sm font-medium text-slate-900 sm:hidden">{profile.full_name.split(" ")[0]}</p>
     <p className="hidden text-xs text-slate-500 sm:block">{profile.email}</p>
   </div>
   ```
   This shows the first name on mobile and the full name + email on desktop.

---

## Phase 4 — Error, Loading & Toast States

---

### 4.1 Add custom `not-found.tsx` and `error.tsx` pages

**Origin:** UX review E2

**Steps:**
1. Create [NEW] `src/app/not-found.tsx`:
   ```tsx
   import Link from "next/link";
   import { buttonVariants } from "@/components/ui/button";
   import { cn } from "@/lib/utils";

   export default function NotFound() {
     return (
       <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 text-center">
         <h1 className="text-6xl font-bold text-slate-950">404</h1>
         <p className="mt-4 text-lg text-slate-600">Page not found.</p>
         <Link href="/" className={cn(buttonVariants(), "mt-6")}>
           Return to dashboard
         </Link>
       </main>
     );
   }
   ```
2. Create [NEW] `src/app/error.tsx`:
   ```tsx
   "use client";

   import { Button } from "@/components/ui/button";

   export default function Error({ reset }: { reset: () => void }) {
     return (
       <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 text-center">
         <h1 className="text-4xl font-bold text-slate-950">Something went wrong</h1>
         <p className="mt-4 text-lg text-slate-600">An unexpected error occurred.</p>
         <Button onClick={reset} className="mt-6">Try again</Button>
       </main>
     );
   }
   ```

---

### 4.2 Add `loading.tsx` skeleton pages

**Origin:** UX review E1

**Steps:**
1. Create [NEW] `src/app/admin/loading.tsx` — renders inside the AppShell layout, shows 6 pulsing placeholder cards in the same grid as the dashboard:
   ```tsx
   export default function AdminLoading() {
     return (
       <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
         {Array.from({ length: 6 }).map((_, i) => (
           <div key={i} className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white" />
         ))}
       </div>
     );
   }
   ```
2. Create [NEW] `src/app/student/loading.tsx` — same pattern, 5 pulsing cards
3. Create [NEW] `src/app/panel/loading.tsx` — same pattern, 4 pulsing cards

---

### 4.3 Build toast notification component

**Origin:** UX review F1. **User chose: custom component triggered by URL query param.**

**Steps:**
1. Create [NEW] `src/components/ui/toast.tsx` (client component):
   - Reads `?success=<message_key>` from the URL using `useSearchParams()`
   - Maps `message_key` to a human-readable string (e.g., `"project-created"` → `"Project created successfully"`)
   - Renders a fixed-position banner in the bottom-right corner with green background
   - Auto-dismisses after 5 seconds with a fade-out transition
   - Removes the `?success=` param from the URL without a full navigation (using `window.history.replaceState`)
   - Export a `TOAST_MESSAGES` record mapping keys to display text
2. [MODIFY] `src/components/layout/app-shell.tsx`:
   - Import and render `<Toast />` inside the layout (after `<main>`)
3. In action files that call `redirect()` after success, append the query param:
   - `createProjectAction` → `redirect("/student/project?success=project-created")`
   - `updateProjectAction` → `redirect("/student/project?success=project-updated")`
   - `saveDraftReviewAction` → `redirect("/panel/projects/${projectId}?success=draft-saved")`
   - `saveFinalReviewAction` → `redirect("/panel/projects/${projectId}?success=final-saved")`
   - `saveSubmissionWindowAction` → `redirect("/admin/submission-window?success=window-saved")`

---

### 4.4 Auto-clear inline success messages

**Origin:** UX review E3

Forms using `useActionState` show success messages that persist after the state is consumed.

**Steps:**
1. Create [NEW] `src/hooks/use-auto-clear-message.ts`:
   ```ts
   import { useEffect, useState } from "react";

   export function useAutoClearMessage(message: string, delay = 5000) {
     const [visible, setVisible] = useState(false);

     useEffect(() => {
       if (!message) return;
       setVisible(true);
       const timer = setTimeout(() => setVisible(false), delay);
       return () => clearTimeout(timer);
     }, [message, delay]);

     return visible;
   }
   ```
2. Apply in forms that show inline success messages (e.g., `FileUploadForm`, `AssignPanelMemberForm`, `GradeOverrideForm`): wrap the success `<p>` with a conditional using `useAutoClearMessage(state.message)`

---

## Phase 5 — Accessibility & Dialog Fix

---

### 5.1 Fix `ConfirmSubmitButton` dialog accessibility

**Origin:** Code review M4, UX review A11-1. **User chose: fix manually.**

[confirm-submit-button.tsx](file:///c:/Users/shady/Desktop/gp-review/src/components/ui/confirm-submit-button.tsx)

**Steps:**
1. [MODIFY] `src/components/ui/confirm-submit-button.tsx`:
   - Add `role="dialog"` and `aria-modal="true"` to the overlay div (line 45)
   - Add `aria-labelledby` pointing to the title `<h2>`, give it `id="confirm-dialog-title"`
   - Add `aria-describedby` pointing to the message `<p>`, give it `id="confirm-dialog-description"`
   - **Escape key**: Add a `useEffect` that listens for `keydown` event on `document` when `isOpen` is true, calls `setIsOpen(false)` on Escape
   - **Backdrop click**: Add `onClick={() => setIsOpen(false)}` on the backdrop div. Add `onClick={(e) => e.stopPropagation()}` on the inner dialog div to prevent closing when clicking inside
   - **Focus trap**: On open, focus the cancel button. Add a `useRef` for the cancel button and call `.focus()` in a `useEffect` when `isOpen` becomes true. Add `onKeyDown` handler on the dialog that catches Tab/Shift+Tab and wraps focus between the cancel and confirm buttons
   - **Focus restore**: Store the previously focused element before opening and restore focus on close

---

### 5.2 Improve badge text clarity

**Origin:** UX review A11-3

Several badges use short ambiguous labels like "pending" or "active."

**Steps:**
1. In [MODIFY] [panel/projects/[projectId]/page.tsx](file:///c:/Users/shady/Desktop/gp-review/src/app/panel/projects/%5BprojectId%5D/page.tsx):
   - Line 157: Change `"pending"` to `"Draft pending"`
   - Line 176: Change `"pending"` to `"Final pending"`
2. In [MODIFY] [admin/projects/[projectId]/page.tsx](file:///c:/Users/shady/Desktop/gp-review/src/app/admin/projects/%5BprojectId%5D/page.tsx):
   - Line 175: Change `"active assignment"` to `"Active"` and `"revoked assignment"` to `"Revoked"` (these are already descriptive enough — the "assignment" word is redundant since the section is titled "Panel Reviews")

---

## Phase 6 — Student Journey Improvements

---

### 6.1 Add student review progress and grade visibility

**Origin:** UX review S1 (Critical). **User chose: progress stepper + final grade + review count. Visible after status = `final_reviewed`.**

**Steps:**
1. [NEW] `src/lib/project/student-review-progress.ts`:
   - Export a function `getStudentReviewProgress(projectId: string)`:
     ```ts
     export type StudentReviewProgress = {
       reviewCount: number;
       totalPanelMembers: number;
       finalGrade: number | null;
       gradePercentage: string | null;
       gradeSource: "none" | "panel_average" | "dean_override";
     };
     ```
   - Query: count active assignments, count completed final reviews, and fetch the official grade (using `getOfficialProjectGrade` from `review.schema.ts`)
   - Use the student's own Supabase client (RLS scoped) — query `panel_assignments` and `reviews` where `project_id` matches
   - **RLS note**: The student may not have RLS access to `reviews` directly. Check the existing RLS policy on `reviews` table. If students can't read reviews for their own project, this query must use `createSupabaseAdminClient()` with a service role, selecting only aggregate data (counts and total_score), never exposing panel member identities or notes.

2. [MODIFY] `src/app/student/project/status/page.tsx`:
   - Import `getStudentReviewProgress`
   - After the existing "Missing requirements" section, add a "Review Progress" section:
     - A progress stepper showing: `Draft → Submitted → Assigned → Draft Reviewed → Final Reviewed → Completed`
     - Highlight the current step based on `projectData.project.status`
     - Each step is a horizontal sequence of labeled circles/badges connected by lines
   - Below the stepper, show:
     - "Panel reviews: X of Y completed" (from `reviewCount` / `totalPanelMembers`)
     - If `status` is `final_reviewed` or `completed`: show the grade in a prominent card: `"Your Grade: 85.50%"` with source text

---

### 6.2 Guard null demo video URL

**Origin:** UX review S5

[project-summary.tsx:69](file:///c:/Users/shady/Desktop/gp-review/src/app/student/project/project-summary.tsx#L69)

**Steps:**
1. [MODIFY] `src/app/student/project/project-summary.tsx` — wrap the demo video link in a conditional:
   ```tsx
   {project.demo_video_url ? (
     <a ... href={project.demo_video_url} ...>Open demo</a>
   ) : (
     <p className="text-sm text-slate-500">No demo video provided.</p>
   )}
   ```

---

### 6.3 Add client-side file size validation

**Origin:** UX review S3. **User chose: validate before uploading.**

[file-upload-form.tsx:47-51](file:///c:/Users/shady/Desktop/gp-review/src/app/student/project/file-upload-form.tsx#L47-L51)

**Steps:**
1. [MODIFY] `src/app/student/project/file-upload-form.tsx`:
   - Add a `maxSizeBytes` prop to `FileUploadFormProps`
   - Define default limits: `{ documentation_pdf: 50 * 1024 * 1024, source_code_zip: 100 * 1024 * 1024, presentation_file: 50 * 1024 * 1024 }`
   - In the `onChange` handler (line 47), before calling `formRef.current?.requestSubmit()`, check `file.size`:
     ```ts
     onChange={() => {
       const file = fileInputRef.current?.files?.[0];
       if (!file) return;
       if (file.size > maxSizeBytes) {
         setFileSizeError(`File too large. Maximum is ${formatFileSize(maxSizeBytes)}.`);
         fileInputRef.current.value = "";
         return;
       }
       setFileSizeError(null);
       formRef.current?.requestSubmit();
     }}
     ```
   - Add `const [fileSizeError, setFileSizeError] = useState<string | null>(null);`
   - Render the error: `{fileSizeError ? <p className="text-sm text-red-600">{fileSizeError}</p> : null}`
2. [MODIFY] `src/app/student/project/project-summary.tsx` — pass `maxSizeBytes` to each `<FileUploadForm>`:
   - `documentation_pdf`: `50 * 1024 * 1024`
   - `source_code_zip`: `100 * 1024 * 1024`
   - `presentation_file`: `50 * 1024 * 1024`

---

### 6.4 Replace team member "role" free-text with dropdown

**Origin:** UX review S6

[project-form.tsx:148-152](file:///c:/Users/shady/Desktop/gp-review/src/app/student/project/project-form.tsx#L148-L152)

**Steps:**
1. [MODIFY] `src/app/student/project/project-form.tsx` — replace the `<Input>` for role (line 150) with a `<select>`:
   ```tsx
   <select
     id={`team-${index}-role`}
     {...register(`team_members.${index}.role_in_team`)}
     className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
   >
     <option value="team_leader">Team leader</option>
     <option value="developer">Developer</option>
     <option value="designer">Designer</option>
     <option value="tester">Tester</option>
     <option value="member">Member</option>
   </select>
   ```
2. The Zod schema (`teamMemberSchema.role_in_team`) already accepts any string via `z.string().trim().min(2).default("member")` — this remains compatible, no schema change needed.

---

### 6.5 Add unsaved-changes warning on project form

**Origin:** UX review S2

[project-form.tsx](file:///c:/Users/shady/Desktop/gp-review/src/app/student/project/project-form.tsx)

**Steps:**
1. [MODIFY] `src/app/student/project/project-form.tsx`:
   - Destructure `formState: { errors, isDirty }` from `useForm` (line 42)
   - Add a `useEffect` that warns on browser close/tab switch:
     ```ts
     useEffect(() => {
       const handler = (e: BeforeUnloadEvent) => {
         if (isDirty) {
           e.preventDefault();
         }
       };
       window.addEventListener("beforeunload", handler);
       return () => window.removeEventListener("beforeunload", handler);
     }, [isDirty]);
     ```

---

### 6.6 Add in-app notification banner on student dashboard

**Origin:** UX review F2. **User chose: in-app only.**

**Steps:**
1. [NEW] `src/lib/project/student-notifications.ts`:
   - Export function `getStudentNotifications(projectId: string, lastVisited?: string)`:
     - Queries audit_logs for recent actions related to this project (e.g., `entity_id = projectId` and `action IN ('admin_assigned_panel_member', 'panel_submitted_draft_review', 'panel_submitted_final_review')`)
     - Returns an array of notification objects: `{ message: string; timestamp: string }[]`
     - Example: `"Your project was assigned to a panel member — June 18"`
     - Use admin client since students don't have RLS access to audit_logs
2. [MODIFY] `src/app/student/page.tsx`:
   - Import and call `getStudentNotifications`
   - If there are notifications, render a highlighted card at the top of the dashboard:
     ```tsx
     <Card className="border-[var(--brand-blue)] bg-[rgba(52,126,224,0.04)]">
       <CardContent className="pt-5 space-y-2">
         <h2 className="text-sm font-semibold text-slate-950">Recent updates</h2>
         {notifications.map((n, i) => (
           <p key={i} className="text-sm text-slate-600">{n.message}</p>
         ))}
       </CardContent>
     </Card>
     ```

---

## Phase 7 — Panel Member Journey Improvements

---

### 7.1 Merge draft + final review into a single page with progressive unlock

**Origin:** User-requested UX improvement.

Currently there are two separate routes:
- `/panel/projects/[id]/draft-review/page.tsx`
- `/panel/projects/[id]/final-review/page.tsx`

Both use the shared `ReviewForm` component in `review-form.tsx`.

**Steps:**
1. Create [NEW] `src/app/panel/projects/[projectId]/review/page.tsx`:
   - Server component that renders the project title + both review sections
   - Fetches project detail via `getPanelProjectDetail`
   - Passes `existingReview` to the new `UnifiedReviewForm` client component
2. Create [NEW] `src/app/panel/projects/[projectId]/unified-review-form.tsx` (client component):
   - Accept props: `projectId`, `existingReview`, `projectTitle`
   - **Section 1 — Pre-Discussion (80 pts):**
     - 4 `ScoreInput` components (documentation, implementation, code_quality, innovation)
     - Notes + Questions textareas
     - "Save draft review" button (calls `saveDraftReviewAction` via `useActionState`)
     - Live running total: watches all 4 score fields and displays `"Total: X / 80"`
   - **Section 2 — Post-Discussion (20 pts):**
     - If `!existingReview?.draft_submitted_at`: render the section grayed out with a message: "Complete the pre-discussion review first to unlock this section." All inputs are `disabled`.
     - If draft is submitted: render normally with 2 `ScoreInput` components (presentation, discussion), notes textarea, `ConfirmSubmitButton` calling `saveFinalReviewAction`
     - Live running total: `"Total: X / 20"`
   - **Grand total** at the bottom: `"Grand Total: X / 100"` (sum of both sections)
   - After successful draft save, use `router.refresh()` to re-fetch server data, which will unlock Section 2
3. [MODIFY] existing `draft-review/page.tsx` and `final-review/page.tsx`:
   - Replace their content with a redirect to the new unified page:
     ```tsx
     import { redirect } from "next/navigation";

     export default async function DraftReviewPage({ params }: { params: Promise<{ projectId: string }> }) {
       const { projectId } = await params;
       redirect(`/panel/projects/${projectId}/review`);
     }
     ```
   - Do the same for `final-review/page.tsx`
4. [MODIFY] [panel/projects/[projectId]/page.tsx](file:///c:/Users/shady/Desktop/gp-review/src/app/panel/projects/%5BprojectId%5D/page.tsx):
   - Replace the two separate "Start/Edit draft review" and "Start/Edit final review" links (lines 164–188) with a single link:
     ```tsx
     <Link href={`/panel/projects/${project.id}/review`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}>
       {review?.final_submitted_at ? "Edit reviews" : review?.draft_submitted_at ? "Continue to final review" : "Start review"}
     </Link>
     ```
   - Keep the two status cards (draft status + final status) — they're informational
5. Delete the old [review-form.tsx](file:///c:/Users/shady/Desktop/gp-review/src/app/panel/projects/%5BprojectId%5D/review-form.tsx) (replaced by `unified-review-form.tsx`)

---

### 7.2 Add filter tabs to panel projects page

**Origin:** UX review P4

[panel/projects/page.tsx](file:///c:/Users/shady/Desktop/gp-review/src/app/panel/projects/page.tsx)

The page changes title based on the `?review=` param but has no visible filter UI.

**Steps:**
1. [MODIFY] `src/app/panel/projects/page.tsx`:
   - Add a row of filter links above the project list:
     ```tsx
     <div className="flex flex-wrap gap-2 mb-4">
       {(["all", "reviewed", "pending-draft", "pending-final"] as const).map((filter) => (
         <Link
           key={filter}
           href={filter === "all" ? "/panel/projects" : `/panel/projects?review=${filter}`}
           className={cn(
             buttonVariants({ variant: reviewFilter === filter ? "default" : "outline", size: "sm" }),
           )}
         >
           {filterTitle(filter)}
         </Link>
       ))}
     </div>
     ```

---

### 7.3 Add panel urgency indicators

**Origin:** UX review F3

**Steps:**
1. [MODIFY] `src/app/panel/projects/page.tsx` — for each project card:
   - If `assigned_at` is within the last 48 hours, render a small `<Badge tone="info">New</Badge>` next to the project title
   - Calculate: `const isNew = project.assigned_at && (Date.now() - new Date(project.assigned_at).getTime()) < 48 * 60 * 60 * 1000;`

---

## Phase 8 — Admin Journey Improvements

---

### 8.1 Show temp password in a prominent copy-able dialog

**Origin:** UX review A1

The temp password from `createPanelMemberAction` appears as a transient success message.

**Steps:**
1. [MODIFY] `src/app/admin/panel-members/create-panel-member-form.tsx`:
   - Add state: `const [createdPassword, setCreatedPassword] = useState<string | null>(null);`
   - When `state.ok && state.message` and the message contains the temp password (the current message format includes it), extract and display in a modal:
     ```tsx
     {createdPassword ? (
       <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-5">
         <h3 className="font-semibold text-slate-950">Panel member created</h3>
         <p className="mt-2 text-sm text-slate-700">
           Save this temporary password now — it cannot be retrieved later.
         </p>
         <div className="mt-3 flex items-center gap-2">
           <code className="rounded bg-white px-3 py-2 font-mono text-sm border border-slate-200">{createdPassword}</code>
           <Button type="button" variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(createdPassword)}>
             Copy
           </Button>
         </div>
         <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => setCreatedPassword(null)}>
           Done
         </Button>
       </div>
     ) : null}
     ```
   - Parse the password from `state.message` using a `useEffect` that watches `state`:
     ```ts
     useEffect(() => {
       if (state.ok && state.message) {
         const match = state.message.match(/temporary password:\s*(\S+)/i);
         if (match) setCreatedPassword(match[1]);
       }
     }, [state]);
     ```

> [!IMPORTANT]
> Check the exact format of the success message in [admin/actions.ts createPanelMemberAction](file:///c:/Users/shady/Desktop/gp-review/src/app/admin/actions.ts#L95-L139) to match the regex correctly.

---

### 8.2 Fix admin table horizontal overflow

**Origin:** UX review R1

[projects-table.tsx:180](file:///c:/Users/shady/Desktop/gp-review/src/app/admin/projects/projects-table.tsx#L180)

**Steps:**
1. [MODIFY] `src/app/admin/projects/projects-table.tsx` — line 180: change:
   ```tsx
   // Before:
   <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
   // After:
   <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
   ```

---

### 8.3 Add table sorting to admin projects table

**Origin:** UX review A6

[projects-table.tsx](file:///c:/Users/shady/Desktop/gp-review/src/app/admin/projects/projects-table.tsx)

**Steps:**
1. [MODIFY] `src/app/admin/projects/projects-table.tsx`:
   - Import `getSortedRowModel` from `@tanstack/react-table`
   - Add `const [sorting, setSorting] = useState<SortingState>([]);`
   - Add to `useReactTable`: `state: { globalFilter, sorting }`, `onSortingChange: setSorting`, `getSortedRowModel: getSortedRowModel()`
   - Add `enableSorting: true` to the column definitions where sorting makes sense (title, status, department, assignment, reviews)
   - Make headers clickable: in the `<th>` render, add `onClick: header.column.getToggleSortingHandler()` and a sort indicator arrow

---

### 8.4 Fix grade override reason defaultValue

**Origin:** UX review A5

[grade-override-form.tsx:55-56](file:///c:/Users/shady/Desktop/gp-review/src/app/admin/projects/%5BprojectId%5D/grade-override-form.tsx#L55-L56)

**Steps:**
1. [MODIFY] `src/app/admin/projects/[projectId]/grade-override-form.tsx` — change the textarea:
   ```tsx
   // Before:
   defaultValue=""
   placeholder={activeOverride ? `Current reason: ${activeOverride.reason}` : "Explain why..."}

   // After:
   defaultValue={activeOverride?.reason || ""}
   placeholder="Explain why the official grade is being overridden."
   ```

---

### 8.5 Build bulk panel assignment feature

**Origin:** UX review A4. **User confirmed: include it.**

**Steps:**
1. [MODIFY] `src/app/admin/projects/projects-table.tsx`:
   - Add a checkbox column as the first column using `columnHelper.display` with a header-level "select all" checkbox and row-level individual checkboxes
   - Add `const [rowSelection, setRowSelection] = useState({});` and pass to `useReactTable` with `enableRowSelection: true`, `onRowSelectionChange: setRowSelection`, `getRowId: (row) => row.id`
   - When `Object.keys(rowSelection).length > 0`, render a sticky action bar at the bottom of the table:
     ```tsx
     <div className="sticky bottom-0 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-md">
       <span className="text-sm text-slate-600">{selectedCount} projects selected</span>
       <BulkAssignForm selectedProjectIds={selectedProjectIds} panelMembers={panelMembers} />
       <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>Clear</Button>
     </div>
     ```
2. Create [NEW] `src/app/admin/projects/bulk-assign-form.tsx` (client component):
   - A form with a panel member `<select>` dropdown and "Assign to all" button
   - Calls a new server action `bulkAssignPanelMemberAction`
3. [MODIFY] `src/app/admin/actions.ts`:
   - Add `bulkAssignPanelMemberAction`:
     - Accepts `panel_member_id` and `project_ids` (array of UUIDs)
     - Validates with Zod: `z.object({ panel_member_id: z.string().uuid(), project_ids: z.array(z.string().uuid()).min(1) })`
     - Loops through `project_ids` and inserts assignments (same logic as `assignPanelMemberAction` but in a loop)
     - Returns count of successful assignments
4. [MODIFY] `src/app/admin/projects/page.tsx`:
   - Fetch `panelMembers` alongside `projects` and pass to `<AdminProjectsTable>`
   - Add `panelMembers` to `AdminProjectsTable` props

---

### 8.6 Collapse mobile filters behind a toggle

**Origin:** UX review R2

[projects-table.tsx:131](file:///c:/Users/shady/Desktop/gp-review/src/app/admin/projects/projects-table.tsx#L131)

**Steps:**
1. [MODIFY] `src/app/admin/projects/projects-table.tsx`:
   - Add `const [filtersOpen, setFiltersOpen] = useState(false);`
   - On mobile, render a "Filters" button that toggles `filtersOpen`
   - Wrap the filter grid in a conditional:
     ```tsx
     <div className="md:block">
       <Button
         type="button"
         variant="outline"
         className="mb-3 md:hidden"
         onClick={() => setFiltersOpen(!filtersOpen)}
       >
         {filtersOpen ? "Hide filters" : "Show filters"}
       </Button>
       <div className={cn("grid gap-3 md:grid-cols-5", !filtersOpen && "hidden md:grid")}>
         {/* existing filter selects */}
       </div>
     </div>
     ```

---

## Verification Plan

### Automated Tests

After all changes, run existing tests to ensure nothing is broken:
```bash
npm test
```

Specific test areas to verify:
- `review.schema.test.ts` — ensure `normalizeScores` with `?? 0` still passes all cases
- `admin-projects.test.ts` — ensure filter functions still work
- `submission.schema.test.ts` — ensure submission requirements checks pass

### Manual Verification

For each phase, verify by:

1. **Phase 1:** Confirm no TypeScript errors after deduplication (`npm run build`)
2. **Phase 2:** Test grade override race condition by submitting override and verifying the previous one is restored if insert fails
3. **Phase 3:** Test mobile nav on a 375px viewport. Test active link highlighting by navigating between pages
4. **Phase 4:** Navigate between pages and confirm loading skeletons appear. Trigger a 404 and verify branded page. Submit a form and verify toast appears
5. **Phase 5:** Tab through the confirm dialog — focus should not escape. Press Escape — dialog should close
6. **Phase 6:** As a student, view the status page after the project is final_reviewed — grade should display. Try uploading a file > limit — client error should appear before upload
7. **Phase 7:** As a panel member, open the unified review page. Submit draft — final section should unlock. Verify running total updates live
8. **Phase 8:** Create a panel member — password should appear in a copy-able card. Select multiple projects — bulk assign bar should appear. Sort the projects table by column headers
