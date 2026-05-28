-- Fix the duplicate user organization mapping during signup
-- Recreate the handle_new_user_signup function with ON CONFLICT DO NOTHING to avoid duplicate key violations

create or replace function public.handle_new_user_signup()
returns trigger as $$
declare
  personal_org_id uuid;
begin
  -- Create personal organization for the signup user
  insert into public.organizations (name, is_personal, subscription_tier, created_by)
  values ('Personal Space', true, 'FREE', new.id)
  returning id into personal_org_id;

  -- Map the new user as OWNER of their personal organization (on conflict do nothing)
  insert into public.organization_users (organization_id, user_id, role)
  values (personal_org_id, new.id, 'OWNER')
  on conflict (organization_id, user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;
