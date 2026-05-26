-- SQL Migration: Add invite_token to organizations
alter table public.organizations 
  add column if not exists invite_token uuid default gen_random_uuid() unique;

-- Create index for fast token lookup during invitations
create index if not exists idx_organizations_invite_token on public.organizations(invite_token);
