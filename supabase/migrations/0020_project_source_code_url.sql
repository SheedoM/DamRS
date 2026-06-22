alter table public.projects
  add column if not exists source_code_url text;
