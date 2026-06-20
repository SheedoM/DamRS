-- Global application settings (single row), admin-configurable.
create table if not exists public.app_settings (
  id boolean primary key default true,
  max_team_members integer not null default 10 check (max_team_members between 1 and 10),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = true)
);

create trigger app_settings_set_updated_at
before update on public.app_settings
for each row
execute function public.set_updated_at();

insert into public.app_settings (id, max_team_members)
values (true, 10)
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

create policy "Authenticated users can read app settings"
on public.app_settings
for select
to authenticated
using (true);

create policy "Admins can update app settings"
on public.app_settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can insert app settings"
on public.app_settings
for insert
to authenticated
with check (public.is_admin());

grant select, insert, update on public.app_settings to authenticated;
