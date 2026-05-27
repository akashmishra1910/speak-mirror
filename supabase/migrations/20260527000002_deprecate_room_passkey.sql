-- Supabase Migration: Make passkey column nullable to support transition to Team ID (invite_token)
alter table public.rooms alter column passkey drop not null;
