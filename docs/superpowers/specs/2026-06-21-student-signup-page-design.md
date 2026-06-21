# Student Signup Page Design

## Goal

Create a clear student self-signup page that matches the current student login model. A student should be able to create an account from `/register`, then sign in from the student tab on `/login` using their university ID and national ID.

## Context

The application already has a public `/register` route and a student mode on `/login`. The login page derives the student auth email as `{student_id}@damrs.edu` and uses the national ID as the password. Admin-created student accounts already follow this same contract.

The current self-registration action asks students for an email and password, then creates the Supabase auth account with those values. That produces accounts that do not match the existing student login form.

Next.js 16.2.9 local docs were checked before design. The relevant guidance supports the existing pattern: use App Router pages, colocated Server Actions, server-side validation, and `useActionState` in client forms to show validation and pending state.

## Recommended Approach

Keep `/register` as the student signup page and align its backend behavior with student login:

- Derive the Supabase auth email from the submitted university ID as `{student_id}@damrs.edu`.
- Use the submitted national ID as the initial password.
- Keep server-side validation in the Server Action.
- Keep the active-cycle, open-window, and approved-roster checks.
- Add a clear signup link from the student mode of `/login`.

This avoids a second credential model and keeps student support instructions simple.

## Page Experience

The signup page should visually match the existing login page:

- University and faculty logos remain prominent.
- Arabic copy explains that this is student account creation for the graduation project review system.
- The form asks for:
  - full name
  - university ID
  - national ID
  - program
- The form does not ask for a password because the national ID is the login password in the current system.
- The form does not need a required email field for login. If contact email is needed later, it should be treated as profile metadata, not the auth login identifier.
- The success state tells the student the account was created and links back to `/login`.

The login page should expose the path without adding clutter:

- In student mode, show a short line under the submit button linking to `/register`.
- Staff mode should not imply that staff or panel members can self-register.

## Server Action Behavior

`registerStudentAction` should:

1. Validate full name, university ID, national ID, and program.
2. Require a 14-digit national ID.
3. Find the active discussion cycle.
4. Require an open submission window for that cycle.
5. Use the service-role client to find an unclaimed `eligible_students` row for the submitted university ID in that cycle.
6. If the roster row contains `national_id`, require it to match the submitted national ID.
7. Create the Supabase auth user with:
   - `email` set to the submitted university ID plus `@damrs.edu`
   - `password: national_id`
   - `email_confirm: true`
   - student metadata
8. Insert the student profile with role `student`, full name, derived email, student ID, national ID, and program.
9. Claim the eligible roster row by writing `claimed_by` and `claimed_at`.
10. Return an Arabic success message.

## Error Handling

Return friendly Arabic messages for:

- invalid full name
- missing university ID
- national ID not exactly 14 digits
- missing program
- no active discussion cycle
- closed signup/submission window
- university ID not approved for registration
- roster national ID mismatch when a roster national ID exists
- already claimed university ID
- missing Supabase service-role key
- Supabase auth creation failure
- profile creation failure
- roster claim failure

The action should not expose service-role secrets or implementation details in user-facing messages.

## Testing

Use the smallest testable extraction needed before production edits. At minimum, cover:

- derived auth email is `{student_id}@damrs.edu`
- national ID is used as the created auth password
- email/password fields are no longer required for self-registration
- roster national-ID mismatch fails when the roster has a national ID
- approved unclaimed roster student can proceed through the expected action path

If the current Server Action is too coupled to Supabase for focused tests, extract pure helpers for input parsing and credential derivation, then test those helpers first.

Run the focused tests, then project verification such as `npm test` and lint/build if available and practical.

## Out of Scope

- Changing staff or panel member account creation.
- Adding email/password login for students.
- Adding public registration for non-student roles.
- Changing Supabase schema or RLS policies unless tests reveal a required mismatch.
