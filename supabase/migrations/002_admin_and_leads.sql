-- Admin area: staff accounts, roles and the catering leads pipeline.
--
-- Run once in the Supabase SQL editor, after 001_catering_enquiries.sql.
-- Safe to re-run: every statement is idempotent.
--
-- Access model
-- - Staff sign in with Supabase Auth (publishable key + session cookie).
-- - A signed-in user is "staff" only when they have an active admin_users row.
-- - Roles: owner (everything), manager (everything except owner accounts), operations (day-to-day).
-- - The anon role gets nothing from this migration.
-- - The secret key (server only) still bypasses RLS; the public enquiry form keeps inserting through it.

begin;

-- -----------------------------------------------------------------------------
-- Helper: updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.fk_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles: one row per staff login, keyed to auth.users
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.fk_set_updated_at();

-- -----------------------------------------------------------------------------
-- admin_users: who is staff, and what they may do
-- -----------------------------------------------------------------------------
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'operations')),
  -- Reserved for the ordering, menu and events phases.
  can_manage_menus boolean not null default false,
  can_manage_orders boolean not null default false,
  can_manage_events boolean not null default false,
  can_manage_catering boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_users_profile_id_key unique (profile_id)
);

create index if not exists admin_users_active_idx
  on public.admin_users (is_active) where is_active = true;

drop trigger if exists trg_admin_users_updated_at on public.admin_users;
create trigger trg_admin_users_updated_at
before update on public.admin_users
for each row execute function public.fk_set_updated_at();

-- -----------------------------------------------------------------------------
-- Role checks for RLS. SECURITY DEFINER so policies on admin_users can call them
-- without recursing into their own RLS. Not executable by anon.
-- -----------------------------------------------------------------------------
create or replace function public.fk_is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.profile_id = (select auth.uid())
      and au.is_active = true
  );
$$;

create or replace function public.fk_admin_has_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.profile_id = (select auth.uid())
      and au.is_active = true
      and au.role = any (roles)
  );
$$;

revoke all on function public.fk_is_active_admin() from public, anon;
revoke all on function public.fk_admin_has_role(text[]) from public, anon;
grant execute on function public.fk_is_active_admin() to authenticated, service_role;
grant execute on function public.fk_admin_has_role(text[]) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- RLS: profiles
-- Staff can read all staff profiles; anyone signed in can read and rename themselves;
-- owners and managers can rename others. Profiles are created server-side only.
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
on public.profiles for select
to authenticated
using (id = (select auth.uid()) or public.fk_is_active_admin());

drop policy if exists profiles_update_own_or_manager on public.profiles;
create policy profiles_update_own_or_manager
on public.profiles for update
to authenticated
using (id = (select auth.uid()) or public.fk_admin_has_role(array['owner', 'manager']))
with check (id = (select auth.uid()) or public.fk_admin_has_role(array['owner', 'manager']));

-- -----------------------------------------------------------------------------
-- RLS: admin_users
-- Staff can read the staff list. Only owners and managers can change access, and only
-- an owner can touch an owner row or make someone an owner. New staff rows are created
-- server-side with the secret key (no INSERT grant). Nobody deletes: deactivate instead.
-- -----------------------------------------------------------------------------
alter table public.admin_users enable row level security;

revoke all on table public.admin_users from anon, authenticated;
grant select on table public.admin_users to authenticated;
grant update (
  role,
  can_manage_menus,
  can_manage_orders,
  can_manage_events,
  can_manage_catering,
  is_active
) on table public.admin_users to authenticated;

drop policy if exists admin_users_select_self_or_admin on public.admin_users;
create policy admin_users_select_self_or_admin
on public.admin_users for select
to authenticated
using (profile_id = (select auth.uid()) or public.fk_is_active_admin());

drop policy if exists admin_users_update_manager on public.admin_users;
create policy admin_users_update_manager
on public.admin_users for update
to authenticated
using (
  public.fk_admin_has_role(array['owner', 'manager'])
  and (role <> 'owner' or public.fk_admin_has_role(array['owner']))
)
with check (
  public.fk_admin_has_role(array['owner', 'manager'])
  and (role <> 'owner' or public.fk_admin_has_role(array['owner']))
);

-- -----------------------------------------------------------------------------
-- catering_enquiries: extend the existing table (it holds live data; never recreated)
-- -----------------------------------------------------------------------------

-- Status pipeline. Existing rows are all 'new'; anything unexpected is normalised first.
update public.catering_enquiries
set status = 'new'
where status is null
   or status not in ('new', 'contacted', 'quoted', 'booked', 'lost');

alter table public.catering_enquiries
  drop constraint if exists catering_enquiries_status_check;
alter table public.catering_enquiries
  add constraint catering_enquiries_status_check
  check (status in ('new', 'contacted', 'quoted', 'booked', 'lost'));
alter table public.catering_enquiries
  alter column status set default 'new';

alter table public.catering_enquiries
  add column if not exists internal_notes text;
alter table public.catering_enquiries
  drop constraint if exists catering_enquiries_internal_notes_length;
alter table public.catering_enquiries
  add constraint catering_enquiries_internal_notes_length
  check (internal_notes is null or char_length(internal_notes) <= 5000);

alter table public.catering_enquiries
  add column if not exists quoted_amount numeric(10, 2);
alter table public.catering_enquiries
  drop constraint if exists catering_enquiries_quoted_amount_check;
alter table public.catering_enquiries
  add constraint catering_enquiries_quoted_amount_check
  check (quoted_amount is null or quoted_amount >= 0);

-- Existing rows get updated_at = created_at, then the column becomes required.
alter table public.catering_enquiries
  add column if not exists updated_at timestamptz;
update public.catering_enquiries
set updated_at = created_at
where updated_at is null;
alter table public.catering_enquiries
  alter column updated_at set default now(),
  alter column updated_at set not null;

drop trigger if exists trg_catering_enquiries_updated_at on public.catering_enquiries;
create trigger trg_catering_enquiries_updated_at
before update on public.catering_enquiries
for each row execute function public.fk_set_updated_at();

-- Leads list (filter by status, newest first) and dashboard (upcoming event dates).
create index if not exists catering_enquiries_status_created_at_idx
  on public.catering_enquiries (status, created_at desc);
create index if not exists catering_enquiries_event_date_idx
  on public.catering_enquiries (event_date);

-- Signed-in active staff may read leads and update only the pipeline fields.
-- No INSERT or DELETE for anyone but the secret key; anon still gets nothing.
revoke all on table public.catering_enquiries from anon, authenticated;
grant select on table public.catering_enquiries to authenticated;
grant update (status, internal_notes, quoted_amount)
  on table public.catering_enquiries to authenticated;

drop policy if exists catering_enquiries_select_admin on public.catering_enquiries;
create policy catering_enquiries_select_admin
on public.catering_enquiries for select
to authenticated
using (public.fk_is_active_admin());

drop policy if exists catering_enquiries_update_admin on public.catering_enquiries;
create policy catering_enquiries_update_admin
on public.catering_enquiries for update
to authenticated
using (public.fk_is_active_admin())
with check (public.fk_is_active_admin());

commit;
