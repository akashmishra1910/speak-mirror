-- SQL Migration: B2B2C Multi-Tenant Database Upgrade
-- Created: 2026-05-26

-- 1. Safely create Custom ENUM Types
do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_tier_type') then
    create type public.subscription_tier_type as enum ('FREE', 'PRO', 'TEAM');
  end if;
  if not exists (select 1 from pg_type where typname = 'organization_role_type') then
    create type public.organization_role_type as enum ('OWNER', 'MENTOR', 'MEMBER');
  end if;
end$$;

-- 2. Create Organizations Table
create table if not exists public.organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  is_personal boolean default false not null,
  subscription_tier public.subscription_tier_type default 'FREE'::public.subscription_tier_type not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id) on delete set null
);

-- Enable RLS
alter table public.organizations enable row level security;

-- 3. Create Organization Users Mapping Table
create table if not exists public.organization_users (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.organization_role_type default 'MEMBER'::public.organization_role_type not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure user belongs to an organization only once
  unique (organization_id, user_id)
);

-- Enable RLS
alter table public.organization_users enable row level security;

-- Create lookup index for RLS check optimization
create index if not exists idx_organization_users_lookup on public.organization_users(organization_id, user_id);

-- 4. B2C Signup Automation Trigger
create or replace function public.handle_new_user_signup()
returns trigger as $$
declare
  personal_org_id uuid;
begin
  -- Create personal organization for the signup user
  insert into public.organizations (name, is_personal, subscription_tier, created_by)
  values ('Personal Space', true, 'FREE', new.id)
  returning id into personal_org_id;

  -- Map the new user as OWNER of their personal organization
  insert into public.organization_users (organization_id, user_id, role)
  values (personal_org_id, new.id, 'OWNER');

  return new;
end;
$$ language plpgsql security definer;

-- Bind trigger to auth.users
drop trigger if exists on_auth_user_signup on auth.users;
create trigger on_auth_user_signup
  after insert on auth.users
  for each row execute procedure public.handle_new_user_signup();

-- 5. recordings Table Update (with Production Data Backfill)
-- Add column as nullable initially
alter table public.recordings 
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

-- Backfill existing users (create personal workspaces & link existing recordings)
do $$
declare
  user_rec record;
  personal_org_id uuid;
begin
  for user_rec in select id from auth.users loop
    -- Create workspace if it doesn't already exist for the user
    if not exists (
      select 1 from public.organization_users ou
      join public.organizations o on o.id = ou.organization_id
      where ou.user_id = user_rec.id and o.is_personal = true
    ) then
      insert into public.organizations (name, is_personal, subscription_tier, created_by)
      values ('Personal Space', true, 'FREE', user_rec.id)
      returning id into personal_org_id;

      insert into public.organization_users (organization_id, user_id, role)
      values (personal_org_id, user_rec.id, 'OWNER');
    else
      select o.id into personal_org_id
      from public.organizations o
      join public.organization_users ou on ou.organization_id = o.id
      where ou.user_id = user_rec.id and o.is_personal = true
      limit 1;
    end if;

    -- Update existing recordings for this user
    update public.recordings
    set organization_id = personal_org_id
    where user_id = user_rec.id and organization_id is null;
  end loop;
end$$;

-- Set NOT NULL constraint for all future records
alter table public.recordings 
  alter column organization_id set not null;

-- Enable RLS on recordings (if not already enabled)
alter table public.recordings enable row level security;

-- Create index for fast lookups
create index if not exists idx_recordings_organization_id on public.recordings(organization_id);

-- 6. Recursion-Free RLS Helper Functions
create or replace function public.is_member_of_org(check_org_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.organization_users
    where organization_id = check_org_id 
      and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

create or replace function public.has_org_roles(check_org_id uuid, allowed_roles public.organization_role_type[])
returns boolean as $$
begin
  return exists (
    select 1 from public.organization_users
    where organization_id = check_org_id 
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
end;
$$ language plpgsql security definer;

-- 7. Strict RLS Policies

-- Organizations Policies
drop policy if exists "Users can view mapped organizations" on public.organizations;
drop policy if exists "Users can update mapped organizations" on public.organizations;

create policy "Users can view mapped organizations"
  on public.organizations for select
  using (public.is_member_of_org(id) or created_by = auth.uid());

create policy "Users can update mapped organizations"
  on public.organizations for update
  using (public.is_member_of_org(id))
  with check (public.is_member_of_org(id));

-- Organization Users Policies
drop policy if exists "Users can view organization members" on public.organization_users;
drop policy if exists "Owners can manage organization memberships" on public.organization_users;

create policy "Users can view organization members"
  on public.organization_users for select
  using (public.is_member_of_org(organization_id));

create policy "Owners can manage organization memberships"
  on public.organization_users for all
  using (public.has_org_roles(organization_id, array['OWNER']::public.organization_role_type[]))
  with check (public.has_org_roles(organization_id, array['OWNER']::public.organization_role_type[]));

-- Recordings Policies
drop policy if exists "Users can view organization recordings" on public.recordings;
drop policy if exists "Users can insert organization recordings" on public.recordings;
drop policy if exists "Users can update organization recordings" on public.recordings;
drop policy if exists "Users can delete organization recordings" on public.recordings;

create policy "Users can view organization recordings"
  on public.recordings for select
  using (public.is_member_of_org(organization_id));

create policy "Users can insert organization recordings"
  on public.recordings for insert
  with check (
    public.is_member_of_org(organization_id) 
    and user_id = auth.uid()
  );

create policy "Users can update organization recordings"
  on public.recordings for update
  using (public.is_member_of_org(organization_id))
  with check (public.is_member_of_org(organization_id));

create policy "Users can delete organization recordings"
  on public.recordings for delete
  using (public.is_member_of_org(organization_id));
