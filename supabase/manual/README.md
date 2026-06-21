# Manual production reset + seed

One-time procedure to wipe the live Supabase project clean and seed the three
starter accounts for the Dean. Everything runs **inside the Supabase dashboard**
(SQL editor + Authentication UI) — no CLI, no service-role key handling.

> ⚠️ `01_reset.sql` is **destructive**: it deletes all data, all auth users, and
> all uploaded files in the project you run it against. Double-check you're on the
> intended project.

## Steps (in order)

1. **Wipe** — SQL editor → paste & run [`01_reset.sql`](./01_reset.sql).
2. **Create the 3 users** — Authentication → Users → **Add user**, with
   **Auto Confirm** checked, exactly:
   | Email | Password | Role (set by seed) |
   |---|---|---|
   | `wael.admin@damrs.edu` | `WaelAdmin#2026` | admin |
   | `wael.panel@damrs.edu` | `WaelPanel#2026` | panel member (committee head) |
   | `20210001@damrs.edu` | `30203150100015` | student |
3. **Seed** — SQL editor → paste & run [`02_seed.sql`](./02_seed.sql).

## Logging in afterwards
- **Admin / Panel** → login page, "إداري / عضو لجنة" tab, email + password above.
- **Student** → "طالب" tab, university ID `20210001`, national ID `30203150100015`.

The grading window is seeded **closed** so the admin can practice opening it from
the dashboard. All seed values can be changed later from inside the app.
