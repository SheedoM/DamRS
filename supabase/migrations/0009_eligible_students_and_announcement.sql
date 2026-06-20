-- Roster of valid team-leader university IDs, pre-loaded by the admin per cycle.
-- Self-registration validates against this roster and claims a row.
create table if not exists public.eligible_students (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.discussion_cycles(id) on delete cascade,
  university_id text not null,
  national_id text,
  full_name text,
  claimed_by uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint eligible_students_unique_per_cycle unique (cycle_id, university_id)
);

create index if not exists eligible_students_cycle_idx on public.eligible_students (cycle_id);
create index if not exists eligible_students_unclaimed_idx
on public.eligible_students (cycle_id, university_id)
where claimed_by is null;

alter table public.eligible_students enable row level security;

-- Only admins read/manage the roster directly. Self-registration runs through the
-- service-role server action, which bypasses RLS to validate and claim a row.
create policy "Admins can manage eligible students"
on public.eligible_students
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Announcement timestamp on the cycle (null until the admin announces final grades).
alter table public.discussion_cycles add column if not exists grades_announced_at timestamptz;

grant select, insert, update, delete on public.eligible_students to authenticated;
