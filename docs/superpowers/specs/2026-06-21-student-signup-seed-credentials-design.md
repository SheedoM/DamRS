# Student Signup And Seed Credentials Design

## Goal

Student registration should create a usable session immediately, show the success message briefly, and route the new student into the app without requiring a second manual login. The sheet seed should generate dummy university IDs for projects that do not have a matched leader and include those IDs in the generated leader CSV.

## Registration Flow

`registerStudentAction` remains the server authority for validating the university ID and national ID, creating the auth user, creating the profile, and claiming a pending project or eligible roster entry. On success, it returns the derived email and submitted national ID to the client as part of the action result. The register page uses those credentials with the existing Supabase browser client, shows the success state for about two seconds, then replaces the route with `/` and refreshes. Existing middleware and role routing decide the final student page.

Errors stay inline in the registration form. If automatic sign-in fails after account creation, the page shows a clear error so the student can use the normal login page.

## Seed Flow

`scripts/seed-from-sheet.mjs` gains pure helpers for projects without `leader_university_id`. For those projects, the script creates a deterministic synthetic student ID, leaves `team_leader_id` empty, and records the generated ID in CSV output. The real leader still self-registers later using that generated university ID and their own national ID as the password. Projects that already have a matched leader keep the current self-registration behavior.

`scripts/leaders.csv` gains an email column derived from the university ID. It does not include passwords. Existing matched leaders and generated-ID leaders both self-register with their national IDs.

## Tests

Add source-level registration UI tests for the auto-login redirect behavior. Add script helper tests for generating missing leader IDs and leader CSV rows without requiring Supabase.
