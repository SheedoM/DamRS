-- Competition-participation proofs: the team leader can upload one or more PDFs,
-- each labelled with the competition name (stored in project_files.note).

-- New file type. ADD VALUE IF NOT EXISTS must run outside a transaction block.
alter type public.project_file_type add value if not exists 'competition_proof';

-- Optional label for a file (used for the competition name on competition_proof).
alter table public.project_files add column if not exists note text;
