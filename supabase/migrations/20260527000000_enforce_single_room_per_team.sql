-- Ensure organization_id column exists
alter table public.rooms 
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

-- Enforce the single room per organization rule
alter table public.rooms 
  drop constraint if exists rooms_organization_id_unique;

alter table public.rooms 
  add constraint rooms_organization_id_unique unique (organization_id);

-- Update RLS Policies on rooms table
alter table public.rooms enable row level security;

drop policy if exists "Members can select organization rooms" on public.rooms;
drop policy if exists "Mentors and Owners can insert organization rooms" on public.rooms;
drop policy if exists "Mentors and Owners can update organization rooms" on public.rooms;
drop policy if exists "Owners can delete organization rooms" on public.rooms;

create policy "Members can select organization rooms"
  on public.rooms for select
  using (public.is_member_of_org(organization_id) or created_by = auth.uid());

create policy "Mentors and Owners can insert organization rooms"
  on public.rooms for insert
  with check (public.has_org_roles(organization_id, array['OWNER', 'MENTOR']::public.organization_role_type[]) or created_by = auth.uid());

create policy "Mentors and Owners can update organization rooms"
  on public.rooms for update
  using (public.has_org_roles(organization_id, array['OWNER', 'MENTOR']::public.organization_role_type[]))
  with check (public.has_org_roles(organization_id, array['OWNER', 'MENTOR']::public.organization_role_type[]));

create policy "Owners can delete organization rooms"
  on public.rooms for delete
  using (public.has_org_roles(organization_id, array['OWNER']::public.organization_role_type[]));
