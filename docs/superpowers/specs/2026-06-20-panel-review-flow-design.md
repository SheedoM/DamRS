# Panel Review Flow Design

## Goal

Build the MVP panel review workflow for the Graduation Project Audit System: assigned project browsing, project details, private file access, draft review submission, and final review submission.

## Scope

This phase adds:

- `/panel/projects`
- `/panel/projects/[projectId]`
- `/panel/projects/[projectId]/draft-review`
- `/panel/projects/[projectId]/final-review`
- Real counts on `/panel`
- Server actions for draft and final review upserts

This phase does not add admin reports, Excel export, notifications, review locking, or multi-step moderation.

## Access Model

Panel pages use `requireRole(["panel_member"])` and the normal Supabase server client. Data access remains enforced by Supabase RLS:

- Panel members can read projects only through active assignments.
- Revoked assignments stop access through existing RLS policies.
- Panel members can create or update only their own reviews for assigned projects.
- File links are private signed Supabase Storage URLs and expire after 10 minutes.

No panel route uses the Supabase service-role client.

## Review Editing Model

Panel members can edit their own submitted draft or final review while their assignment is active.

The app upserts reviews by `(project_id, panel_member_id, review_type)`. This keeps the MVP practical for discussion-day corrections without introducing an admin unlock or revision workflow.

## Rubric

The database calculates `total_score`.

Draft review fields:

- documentation score, max 20
- implementation score, max 25
- code quality score, max 20
- innovation score, max 15
- notes
- questions

Final review fields:

- presentation score, max 10
- discussion score, max 10
- notes
- questions

Unused score fields are submitted as `0` for the relevant review type.

## UI

Panel dashboard cards show:

- assigned projects
- reviewed projects
- pending draft reviews
- pending final reviews

Assigned projects page shows each project, its status, assignment date, and draft/final review status.

Project detail page shows:

- project overview
- team members
- uploaded files with `Open file` buttons
- GitHub and demo video links
- draft/final review status and actions

Review pages use compact forms with numeric score inputs, notes, questions, and clear validation messages.

## Testing

Add unit tests for:

- rubric field validation and score ranges
- draft review payload creation
- final review payload creation
- review status/count derivation for panel project lists

Run full verification before completion:

- `npm test`
- `npm run lint`
- `npm run build`

