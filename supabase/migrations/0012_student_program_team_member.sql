-- Add program column and drop email column from team_members
alter table public.team_members add column if not exists program public.program;
alter table public.team_members drop column if exists email;

-- Drop program column from projects
alter table public.projects drop column if exists program;
