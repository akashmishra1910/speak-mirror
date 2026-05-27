-- Supabase Migration: Allow organization creators/owners to delete organizations
drop policy if exists "Owners can delete organizations" on public.organizations;

create policy "Owners can delete organizations"
  on public.organizations for delete
  using (created_by = auth.uid() or public.has_org_roles(id, array['OWNER']::public.organization_role_type[]));
