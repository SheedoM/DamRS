do $$
begin
  create type public.project_status as enum (
    'draft',
    'submitted',
    'assigned',
    'draft_reviewed',
    'final_reviewed',
    'completed'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.review_type as enum ('draft', 'final');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.project_file_type as enum (
    'documentation_pdf',
    'source_code_zip',
    'presentation_file',
    'extra_attachment'
  );
exception
  when duplicate_object then null;
end $$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

create table public.discussion_cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  academic_year text not null,
  department text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  is_active boolean not null default false
);

create table public.submission_windows (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.discussion_cycles(id) on delete cascade,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  allow_late_submission boolean not null default false,
  allow_edit_after_submit boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint submission_windows_valid_range check (opens_at < closes_at),
  constraint submission_windows_one_per_cycle unique (cycle_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.discussion_cycles(id) on delete restrict,
  team_leader_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  abstract text not null,
  department text not null,
  supervisor_name text not null,
  technologies_used text,
  github_url text,
  demo_video_url text,
  status public.project_status not null default 'draft',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_one_per_leader_per_cycle unique (cycle_id, team_leader_id),
  constraint projects_submitted_at_required check (
    (status = 'draft' and submitted_at is null)
    or (status <> 'draft' and submitted_at is not null)
  )
);

create trigger projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  full_name text not null,
  student_id text not null,
  email text,
  role_in_team text not null default 'member',
  created_at timestamptz not null default now(),
  constraint team_members_unique_student_per_project unique (project_id, student_id)
);

create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  file_type public.project_file_type not null,
  file_name text not null,
  storage_path text not null,
  file_size bigint not null check (file_size >= 0),
  mime_type text not null,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint project_files_storage_path_unique unique (storage_path)
);

create table public.panel_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  panel_member_id uuid not null references public.profiles(id) on delete restrict,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz,
  is_active boolean not null default true,
  constraint panel_assignments_member_unique_active unique (project_id, panel_member_id, is_active),
  constraint panel_assignments_revoked_consistency check (
    (is_active = true and revoked_at is null)
    or (is_active = false and revoked_at is not null)
  )
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  panel_member_id uuid not null references public.profiles(id) on delete restrict,
  review_type public.review_type not null,
  documentation_score numeric(5,2) not null default 0 check (documentation_score between 0 and 20),
  implementation_score numeric(5,2) not null default 0 check (implementation_score between 0 and 25),
  code_quality_score numeric(5,2) not null default 0 check (code_quality_score between 0 and 20),
  innovation_score numeric(5,2) not null default 0 check (innovation_score between 0 and 15),
  presentation_score numeric(5,2) not null default 0 check (presentation_score between 0 and 10),
  discussion_score numeric(5,2) not null default 0 check (discussion_score between 0 and 10),
  total_score numeric(6,2) generated always as (
    documentation_score
    + implementation_score
    + code_quality_score
    + innovation_score
    + presentation_score
    + discussion_score
  ) stored,
  notes text,
  questions text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_one_type_per_panel_member unique (project_id, panel_member_id, review_type)
);

create trigger reviews_set_updated_at
before update on public.reviews
for each row
execute function public.set_updated_at();

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index discussion_cycles_active_idx on public.discussion_cycles (is_active);
create index projects_cycle_status_idx on public.projects (cycle_id, status);
create index projects_team_leader_idx on public.projects (team_leader_id);
create index team_members_project_idx on public.team_members (project_id);
create index project_files_project_idx on public.project_files (project_id);
create index panel_assignments_project_idx on public.panel_assignments (project_id);
create index panel_assignments_member_active_idx on public.panel_assignments (panel_member_id, is_active) where revoked_at is null;
create index reviews_project_member_idx on public.reviews (project_id, panel_member_id);
create index audit_logs_actor_created_idx on public.audit_logs (actor_id, created_at desc);

create or replace function public.is_submission_open(target_cycle_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.submission_windows sw
    where sw.cycle_id = target_cycle_id
      and sw.opens_at <= now()
      and (
        sw.closes_at >= now()
        or sw.allow_late_submission = true
      )
  )
$$;

create or replace function public.is_panel_assigned_to_project(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.panel_assignments pa
    where pa.project_id = target_project_id
      and pa.panel_member_id = auth.uid()
      and pa.is_active = true
      and pa.revoked_at is null
  )
$$;

create or replace function public.can_read_project(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.is_admin(), false)
    or exists (
      select 1
      from public.projects p
      where p.id = target_project_id
        and p.team_leader_id = auth.uid()
    )
    or public.is_panel_assigned_to_project(target_project_id)
$$;

create or replace function public.can_manage_project(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.is_admin(), false)
    or exists (
      select 1
      from public.projects p
      where p.id = target_project_id
        and p.team_leader_id = auth.uid()
        and p.status = 'draft'
        and public.is_submission_open(p.cycle_id)
    )
$$;

create or replace function public.project_id_from_storage_name(object_name text)
returns uuid
language plpgsql
security definer
set search_path = public, storage
stable
as $$
declare
  segments text[];
begin
  segments := storage.foldername(object_name);
  return nullif(segments[2], '')::uuid;
exception
  when others then
    return null;
end;
$$;

alter table public.discussion_cycles enable row level security;
alter table public.submission_windows enable row level security;
alter table public.projects enable row level security;
alter table public.team_members enable row level security;
alter table public.project_files enable row level security;
alter table public.panel_assignments enable row level security;
alter table public.reviews enable row level security;
alter table public.audit_logs enable row level security;

create policy "Admins can manage discussion cycles"
on public.discussion_cycles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Authenticated users can read active discussion cycles"
on public.discussion_cycles
for select
to authenticated
using (is_active = true or public.is_admin());

create policy "Admins can manage submission windows"
on public.submission_windows
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Authenticated users can read submission windows"
on public.submission_windows
for select
to authenticated
using (public.is_admin() or exists (
  select 1
  from public.discussion_cycles dc
  where dc.id = submission_windows.cycle_id
    and dc.is_active = true
));

create policy "Admins can manage projects"
on public.projects
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Students can create their own projects"
on public.projects
for insert
to authenticated
with check (
  team_leader_id = auth.uid()
  and status = 'draft'
  and submitted_at is null
  and public.current_user_role() = 'student'
  and public.is_submission_open(cycle_id)
);

create policy "Students can manage their own draft projects"
on public.projects
for update
to authenticated
using (
  team_leader_id = auth.uid()
  and status = 'draft'
  and public.current_user_role() = 'student'
  and public.is_submission_open(cycle_id)
)
with check (
  team_leader_id = auth.uid()
  and status in ('draft', 'submitted')
  and public.current_user_role() = 'student'
  and public.is_submission_open(cycle_id)
);

create policy "Students can read their own projects"
on public.projects
for select
to authenticated
using (team_leader_id = auth.uid());

create policy "Panel members can read assigned projects"
on public.projects
for select
to authenticated
using (public.is_panel_assigned_to_project(id));

create policy "Admins can manage team members"
on public.team_members
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Students can manage team members for own draft project"
on public.team_members
for all
to authenticated
using (public.can_manage_project(project_id))
with check (public.can_manage_project(project_id));

create policy "Students can read team members for own project"
on public.team_members
for select
to authenticated
using (public.can_read_project(project_id));

create policy "Panel members can read team members for assigned projects"
on public.team_members
for select
to authenticated
using (public.is_panel_assigned_to_project(project_id));

create policy "Admins can manage project files"
on public.project_files
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Students can manage files for own draft project"
on public.project_files
for all
to authenticated
using (public.can_manage_project(project_id))
with check (
  public.can_manage_project(project_id)
  and uploaded_by = auth.uid()
);

create policy "Students can read files for own project"
on public.project_files
for select
to authenticated
using (public.can_read_project(project_id));

create policy "Panel members can read files for assigned projects"
on public.project_files
for select
to authenticated
using (public.is_panel_assigned_to_project(project_id));

create policy "Admins can manage panel assignments"
on public.panel_assignments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Panel members can read their active assignments"
on public.panel_assignments
for select
to authenticated
using (
  panel_member_id = auth.uid()
  and is_active = true
  and revoked_at is null
);

create policy "Admins can manage reviews"
on public.reviews
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Panel members can read own reviews for assigned projects"
on public.reviews
for select
to authenticated
using (
  panel_member_id = auth.uid()
  and public.is_panel_assigned_to_project(project_id)
);

create policy "Panel members can manage own reviews for assigned projects"
on public.reviews
for insert
to authenticated
with check (
  panel_member_id = auth.uid()
  and public.current_user_role() = 'panel_member'
  and public.is_panel_assigned_to_project(project_id)
);

create policy "Panel members can update own reviews for assigned projects"
on public.reviews
for update
to authenticated
using (
  panel_member_id = auth.uid()
  and public.current_user_role() = 'panel_member'
  and public.is_panel_assigned_to_project(project_id)
)
with check (
  panel_member_id = auth.uid()
  and public.current_user_role() = 'panel_member'
  and public.is_panel_assigned_to_project(project_id)
);

create policy "Admins can read audit logs"
on public.audit_logs
for select
to authenticated
using (public.is_admin());

create policy "Users can create own audit logs"
on public.audit_logs
for insert
to authenticated
with check (actor_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('project-documents', 'project-documents', false, 52428800, array['application/pdf']),
  ('project-source-code', 'project-source-code', false, 104857600, array['application/zip', 'application/x-zip-compressed']),
  ('project-presentations', 'project-presentations', false, 52428800, array[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins can manage all project storage objects"
on storage.objects
for all
to authenticated
using (
  bucket_id in ('project-documents', 'project-source-code', 'project-presentations')
  and public.is_admin()
)
with check (
  bucket_id in ('project-documents', 'project-source-code', 'project-presentations')
  and public.is_admin()
);

create policy "Students can upload files for managed projects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('project-documents', 'project-source-code', 'project-presentations')
  and public.can_manage_project(public.project_id_from_storage_name(name))
);

create policy "Students can update files for managed projects"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('project-documents', 'project-source-code', 'project-presentations')
  and public.can_manage_project(public.project_id_from_storage_name(name))
)
with check (
  bucket_id in ('project-documents', 'project-source-code', 'project-presentations')
  and public.can_manage_project(public.project_id_from_storage_name(name))
);

create policy "Students can delete files for managed projects"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('project-documents', 'project-source-code', 'project-presentations')
  and public.can_manage_project(public.project_id_from_storage_name(name))
);

create policy "Authorized users can read project storage objects"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('project-documents', 'project-source-code', 'project-presentations')
  and public.can_read_project(public.project_id_from_storage_name(name))
);

grant usage on schema public to authenticated;
grant usage on type public.project_status to authenticated;
grant usage on type public.review_type to authenticated;
grant usage on type public.project_file_type to authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_submission_open(uuid) to authenticated;
grant execute on function public.is_panel_assigned_to_project(uuid) to authenticated;
grant execute on function public.can_read_project(uuid) to authenticated;
grant execute on function public.can_manage_project(uuid) to authenticated;
grant execute on function public.project_id_from_storage_name(text) to authenticated;

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.discussion_cycles to authenticated;
grant select, insert, update, delete on public.submission_windows to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.team_members to authenticated;
grant select, insert, update, delete on public.project_files to authenticated;
grant select, insert, update, delete on public.panel_assignments to authenticated;
grant select, insert, update, delete on public.reviews to authenticated;
grant select, insert on public.audit_logs to authenticated;
