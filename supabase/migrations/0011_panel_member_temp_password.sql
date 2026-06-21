-- Add a temporary password column to store the generated password for panel members.
-- This column will be cleared once the panel member updates their password.
ALTER TABLE public.profiles ADD COLUMN temp_password text;
