-- =============================================================================
-- Bootstrap: make the first owner
-- =============================================================================
--
-- Run this ONCE, after 002_admin_and_leads.sql, in the Supabase SQL editor.
-- It is not a migration: edit the two values below before running it.
--
-- Before running:
--   1. Supabase Dashboard → Authentication → Users → Add user → Create new user.
--   2. Enter the owner's email and a strong password, tick "Auto Confirm User".
--
-- This script never writes to auth.* tables. It only reads auth.users to find the
-- account you just created, then links it to a staff profile with the owner role.
-- Every other staff member is added from /admin/staff once you are signed in.
-- =============================================================================

do $$
declare
  owner_email text := 'isaiah120303@gmail.com';  -- CHANGE ME: the email you used in the dashboard
  owner_name  text := 'Isaiah George';          -- CHANGE ME: shown in the admin area
  owner_id    uuid;
begin
  select id into owner_id
  from auth.users
  where lower(email) = lower(owner_email);

  if owner_id is null then
    raise exception 'No login found for %. Create it in Authentication → Users first.', owner_email;
  end if;

  insert into public.profiles (id, email, full_name, is_active)
  values (owner_id, lower(owner_email), owner_name, true)
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        is_active = true;

  insert into public.admin_users (
    profile_id, role,
    can_manage_menus, can_manage_orders, can_manage_events, can_manage_catering,
    is_active
  )
  values (owner_id, 'owner', true, true, true, true, true)
  on conflict (profile_id) do update
    set role = 'owner',
        can_manage_menus = true,
        can_manage_orders = true,
        can_manage_events = true,
        can_manage_catering = true,
        is_active = true;
end $$;

-- Check: should return one row with role = owner and is_active = true.
select p.email, p.full_name, au.role, au.is_active
from public.admin_users au
join public.profiles p on p.id = au.profile_id
where au.role = 'owner';
