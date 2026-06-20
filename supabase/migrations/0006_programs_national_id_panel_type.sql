-- Academic programs and panel-member types, plus national IDs.
do $$
begin
  create type public.program as enum (
    'information_systems',
    'computer_science',
    'information_technology',
    'medical_informatics',
    'artificial_intelligence',
    'cybersecurity'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.panel_member_type as enum (
    'supervisor',
    'referee',
    'committee_head'
  );
exception
  when duplicate_object then null;
end $$;

-- Profiles: national ID (students), program (students), panel type (panel members).
alter table public.profiles add column if not exists national_id text;
alter table public.profiles add column if not exists program public.program;
alter table public.profiles add column if not exists panel_member_type public.panel_member_type;

create unique index if not exists profiles_national_id_unique
on public.profiles (national_id)
where national_id is not null;

-- Projects belong to a single program (replaces the free-text department in the UI).
alter table public.projects add column if not exists program public.program;
alter table public.projects alter column department drop not null;

-- Team members each carry a national ID (app-enforced not-null on insert).
alter table public.team_members add column if not exists national_id text;

grant usage on type public.program to authenticated;
grant usage on type public.panel_member_type to authenticated;
