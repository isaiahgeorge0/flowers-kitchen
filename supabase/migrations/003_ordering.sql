-- Online ordering: menu, required item choices, orders, Stripe payments and opening hours.
--
-- Run once in the Supabase SQL editor, after 002_admin_and_leads.sql.
-- Safe to re-run: every statement is idempotent.
--
-- This migration holds no prices and no menu items. For local testing, run
-- supabase/seed_dev_menu.sql afterwards; real prices are entered in /admin/menu.
--
-- Access model
-- - The public (anon key) can read the live main menu and the ordering settings. Nothing else.
-- - Orders are created and paid only by the server with the secret key (checkout + Stripe webhook).
-- - Staff permissions come from admin_users (002):
--     can_manage_orders → kitchen board: read orders, move status, cancel; accepting-orders switch;
--                         mark boxes sold out and switch rice options off.
--     can_manage_menus  → everything above on the menu, plus names, prices, allergens, opening hours
--                         and collection lead time.
-- - catering_enquiries is not touched.

begin;

-- -----------------------------------------------------------------------------
-- Permission helper. SECURITY DEFINER so policies can read admin_users without
-- recursing into its RLS. Not executable by anon.
-- -----------------------------------------------------------------------------
create or replace function public.fk_admin_can(permission text)
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
      and case permission
        when 'menus' then au.can_manage_menus
        when 'orders' then au.can_manage_orders
        when 'events' then au.can_manage_events
        when 'catering' then au.can_manage_catering
        else false
      end
  );
$$;

revoke all on function public.fk_admin_can(text) from public, anon;
grant execute on function public.fk_admin_can(text) to authenticated, service_role;

-- Operations staff run the kitchen board and the leads pipeline.
update public.admin_users
set can_manage_orders = true,
    can_manage_catering = true
where role = 'operations'
  and (can_manage_orders = false or can_manage_catering = false);

-- -----------------------------------------------------------------------------
-- Menu (same shape as the template so checkout validation ports unchanged).
-- Flowers Kitchen runs one permanent "Main menu": one template, one live active menu.
-- -----------------------------------------------------------------------------
create table if not exists public.menu_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_templates_slug_key unique (slug)
);

create table if not exists public.menu_template_items (
  id uuid primary key default gen_random_uuid(),
  menu_template_id uuid not null references public.menu_templates (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 80),
  -- Short description shown on the box card and in the order sheet.
  description text check (description is null or char_length(description) <= 240),
  base_price numeric(10, 2) not null check (base_price >= 0),
  allergens text check (allergens is null or char_length(allergens) <= 500),
  image_url text check (image_url is null or image_url ~ '^(https://|/)'),
  category text not null default 'boxes',
  -- is_available = listed on the menu at all; sold_out = listed but can't be ordered today.
  is_available boolean not null default true,
  sold_out boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_template_items_slug_key unique (menu_template_id, slug)
);

create index if not exists menu_template_items_template_order_idx
  on public.menu_template_items (menu_template_id, display_order);

create table if not exists public.active_menus (
  id uuid primary key default gen_random_uuid(),
  menu_template_id uuid not null references public.menu_templates (id) on delete restrict,
  title_override text,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'live', 'archived')),
  is_main boolean not null default false,
  available_from timestamptz,
  available_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint active_menus_window_check check (
    available_from is null or available_until is null or available_from <= available_until
  )
);

create unique index if not exists active_menus_one_main_idx
  on public.active_menus (is_main) where is_main;

create table if not exists public.active_menu_items (
  id uuid primary key default gen_random_uuid(),
  active_menu_id uuid not null references public.active_menus (id) on delete cascade,
  template_item_id uuid not null references public.menu_template_items (id) on delete cascade,
  name_override text,
  description_override text,
  price_override numeric(10, 2) check (price_override is null or price_override >= 0),
  is_available boolean not null default true,
  is_featured_item boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint active_menu_items_item_key unique (active_menu_id, template_item_id)
);

create index if not exists active_menu_items_menu_order_idx
  on public.active_menu_items (active_menu_id, display_order);

-- Required choices on an item (every box: "Rice" — exactly one of rice & peas / white rice).
create table if not exists public.menu_item_option_groups (
  id uuid primary key default gen_random_uuid(),
  menu_template_item_id uuid not null references public.menu_template_items (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  is_required boolean not null default true,
  min_selections integer not null default 1 check (min_selections >= 0),
  max_selections integer not null default 1 check (max_selections >= 1),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_item_option_groups_range_check check (min_selections <= max_selections),
  constraint menu_item_option_groups_required_check check (not is_required or min_selections >= 1),
  constraint menu_item_option_groups_name_key unique (menu_template_item_id, name)
);

create table if not exists public.menu_item_options (
  id uuid primary key default gen_random_uuid(),
  option_group_id uuid not null references public.menu_item_option_groups (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  price_adjustment numeric(10, 2) not null default 0 check (price_adjustment between -1000 and 1000),
  display_order integer not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_item_options_name_key unique (option_group_id, name)
);

create index if not exists menu_item_option_groups_item_idx
  on public.menu_item_option_groups (menu_template_item_id, display_order);
create index if not exists menu_item_options_group_idx
  on public.menu_item_options (option_group_id, display_order);

-- The one permanent main menu. No items and no prices here.
insert into public.menu_templates (name, slug, description, status)
values ('Main menu', 'main', 'The Flowers Kitchen menu.', 'active')
on conflict (slug) do nothing;

insert into public.active_menus (menu_template_id, status, is_main)
select t.id, 'live', true
from public.menu_templates t
where t.slug = 'main'
  and not exists (select 1 from public.active_menus where is_main);

-- -----------------------------------------------------------------------------
-- Ordering settings: a single row.
-- opening_hours_json: { "monday": { "open": "12:00", "close": "20:00", "enabled": true }, ... }
-- -----------------------------------------------------------------------------
create table if not exists public.business_settings (
  id boolean primary key default true check (id),
  accepting_orders boolean not null default false,
  opening_hours_json jsonb not null default '{}'::jsonb
    check (jsonb_typeof(opening_hours_json) = 'object'),
  collection_lead_minutes integer not null default 20
    check (collection_lead_minutes between 5 and 180),
  timezone text not null default 'Europe/London',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.business_settings (id) values (true) on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Orders. Created only by the server (secret key) after validating every price
-- against the menu; staff update status through RLS.
-- -----------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  -- Short number for the kitchen, emails and the customer ("#1001").
  order_number bigint generated always as identity (start with 1001),
  -- Unguessable reference for the customer's confirmation link. Never shown to staff.
  public_token uuid not null default gen_random_uuid(),
  active_menu_id uuid references public.active_menus (id) on delete set null,
  order_type text not null default 'collection' check (order_type in ('collection')),
  order_status text not null default 'pending' check (
    order_status in ('pending', 'confirmed', 'preparing', 'ready_for_collection', 'completed', 'cancelled')
  ),
  payment_status text not null default 'unpaid' check (
    payment_status in ('unpaid', 'paid', 'failed', 'refunded')
  ),
  currency text not null default 'GBP' check (currency = 'GBP'),
  subtotal_amount numeric(10, 2) not null check (subtotal_amount >= 0),
  total_amount numeric(10, 2) not null check (total_amount > 0),
  customer_name text not null check (char_length(customer_name) between 1 and 80),
  customer_phone text not null check (char_length(customer_phone) between 6 and 30),
  customer_email text not null check (char_length(customer_email) between 3 and 254),
  special_instructions text check (special_instructions is null or char_length(special_instructions) <= 500),
  collection_lead_minutes integer not null check (collection_lead_minutes between 5 and 180),
  estimated_ready_at timestamptz,
  checkout_idempotency_key text,
  -- Stripe (template 014)
  payment_provider text not null default 'none' check (payment_provider in ('none', 'stripe')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_session_url text,
  stripe_session_expires_at timestamptz,
  payment_confirmed_at timestamptz,
  payment_failed_at timestamptz,
  payment_failure_reason text,
  payment_refunded_at timestamptz,
  refund_status text not null default 'none' check (refund_status in ('none', 'partial', 'full')),
  refunded_total numeric(10, 2) not null default 0 check (refunded_total >= 0),
  confirmation_email_sent_at timestamptz,
  shop_email_sent_at timestamptz,
  -- Kitchen timeline
  confirmed_at timestamptz,
  prepared_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_order_number_key unique (order_number),
  constraint orders_public_token_key unique (public_token),
  constraint orders_checkout_idempotency_key_key unique (checkout_idempotency_key),
  constraint orders_stripe_checkout_session_id_key unique (stripe_checkout_session_id),
  constraint orders_stripe_payment_intent_id_key unique (stripe_payment_intent_id),
  -- No fees yet: the total is the sum of the lines.
  constraint orders_total_matches_subtotal check (abs(total_amount - subtotal_amount) < 0.01)
);

create index if not exists orders_status_created_at_idx on public.orders (order_status, created_at desc);
create index if not exists orders_payment_status_created_at_idx on public.orders (payment_status, created_at desc);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  source_active_menu_item_id uuid references public.active_menu_items (id) on delete set null,
  item_name_snapshot text not null,
  unit_price_snapshot numeric(10, 2) not null check (unit_price_snapshot >= 0),
  -- Sum of chosen option price adjustments for one unit.
  options_unit_total_snapshot numeric(10, 2) not null default 0,
  quantity integer not null check (quantity between 1 and 99),
  line_total numeric(10, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  constraint order_items_line_total_matches check (
    abs(line_total - (unit_price_snapshot + options_unit_total_snapshot) * quantity) < 0.01
  )
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- Chosen options, snapshotted so later menu edits never change a past order.
create table if not exists public.order_item_options (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  option_group_id uuid references public.menu_item_option_groups (id) on delete set null,
  option_id uuid references public.menu_item_options (id) on delete set null,
  group_name_snapshot text not null,
  option_name_snapshot text not null,
  price_adjustment_snapshot numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists order_item_options_item_idx on public.order_item_options (order_item_id);

-- Stripe webhook ledger: one row per Stripe event id, so retries are processed once.
create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null,
  event_type text not null,
  processing_status text not null default 'received' check (
    processing_status in ('received', 'processing', 'processed', 'failed')
  ),
  payload_json jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  failure_reason text,
  related_order_id uuid references public.orders (id) on delete set null,
  constraint stripe_webhook_events_event_id_key unique (stripe_event_id)
);

create index if not exists stripe_webhook_events_status_idx
  on public.stripe_webhook_events (processing_status, received_at desc);

-- Refund ledger (from the admin cancel action and from Stripe refund webhooks).
create table if not exists public.order_refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  stripe_refund_id text,
  stripe_payment_intent_id text,
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null,
  status text not null check (status in ('pending', 'succeeded', 'failed', 'cancelled')),
  reason text,
  payload_json jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint order_refunds_stripe_refund_id_key unique (stripe_refund_id)
);

create index if not exists order_refunds_order_idx on public.order_refunds (order_id);

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'menu_templates', 'menu_template_items', 'active_menus', 'active_menu_items',
    'menu_item_option_groups', 'menu_item_options', 'business_settings', 'orders'
  ]
  loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$I', t);
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$I '
      'for each row execute function public.fk_set_updated_at()',
      t
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Field-level guards. Kitchen staff (orders permission) may only flip sold-out,
-- option availability and the accepting-orders switch; everything else needs the
-- menus permission. The secret key and the SQL editor (no auth.uid()) are not limited.
-- -----------------------------------------------------------------------------
create or replace function public.fk_guard_menu_item_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or public.fk_admin_can('menus') then
    return new;
  end if;
  if (to_jsonb(new) - 'sold_out' - 'updated_at') is distinct from (to_jsonb(old) - 'sold_out' - 'updated_at') then
    raise exception 'Only staff with menu permission can change menu details.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.fk_guard_menu_option_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or public.fk_admin_can('menus') then
    return new;
  end if;
  if (to_jsonb(new) - 'is_available' - 'updated_at') is distinct from (to_jsonb(old) - 'is_available' - 'updated_at') then
    raise exception 'Only staff with menu permission can change menu details.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.fk_guard_business_settings_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or public.fk_admin_can('menus') then
    return new;
  end if;
  if (to_jsonb(new) - 'accepting_orders' - 'updated_at') is distinct from (to_jsonb(old) - 'accepting_orders' - 'updated_at') then
    raise exception 'Only staff with menu permission can change opening hours or lead time.' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Staff status moves follow the kitchen flow. A paid order can only be cancelled
-- once it has been fully refunded (the admin cancel action refunds first).
create or replace function public.fk_guard_order_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if new.order_status is distinct from old.order_status then
    if not (
      (old.order_status = 'pending' and new.order_status = 'cancelled' and old.payment_status <> 'paid')
      or (old.order_status = 'confirmed' and new.order_status in ('preparing', 'cancelled'))
      or (old.order_status = 'preparing' and new.order_status in ('ready_for_collection', 'confirmed', 'cancelled'))
      or (old.order_status = 'ready_for_collection' and new.order_status in ('completed', 'preparing', 'cancelled'))
    ) then
      raise exception 'That status change is not allowed.' using errcode = '42501';
    end if;
    if new.order_status <> 'cancelled' and (old.payment_status <> 'paid' or old.refund_status <> 'none') then
      raise exception 'Only paid orders move through the kitchen.' using errcode = '42501';
    end if;
    if new.order_status = 'cancelled' and old.payment_status = 'paid' and old.refund_status <> 'full' then
      raise exception 'Refund the order before cancelling it.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_menu_template_items_guard on public.menu_template_items;
create trigger trg_menu_template_items_guard
before update on public.menu_template_items
for each row execute function public.fk_guard_menu_item_update();

drop trigger if exists trg_menu_item_options_guard on public.menu_item_options;
create trigger trg_menu_item_options_guard
before update on public.menu_item_options
for each row execute function public.fk_guard_menu_option_update();

drop trigger if exists trg_business_settings_guard on public.business_settings;
create trigger trg_business_settings_guard
before update on public.business_settings
for each row execute function public.fk_guard_business_settings_update();

drop trigger if exists trg_orders_guard on public.orders;
create trigger trg_orders_guard
before update on public.orders
for each row execute function public.fk_guard_order_update();

-- -----------------------------------------------------------------------------
-- Public menu visibility helpers
-- -----------------------------------------------------------------------------
create or replace function public.fk_menu_is_public(p_active_menu_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.active_menus am
    where am.id = p_active_menu_id
      and am.status = 'live'
      and coalesce(am.available_from, '-infinity'::timestamptz) <= now()
      and coalesce(am.available_until, 'infinity'::timestamptz) >= now()
  );
$$;

create or replace function public.fk_template_item_is_public(p_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.active_menu_items ami
    join public.menu_template_items mti on mti.id = ami.template_item_id
    where ami.template_item_id = p_item_id
      and ami.is_available
      and mti.is_available
      and public.fk_menu_is_public(ami.active_menu_id)
  );
$$;

grant execute on function public.fk_menu_is_public(uuid) to anon, authenticated, service_role;
grant execute on function public.fk_template_item_is_public(uuid) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- RLS: menu. Public reads the live menu; staff read everything and edit items/options.
-- Menu structure (new items, groups, menus) is created with the secret key or SQL only.
-- -----------------------------------------------------------------------------
alter table public.menu_templates enable row level security;
alter table public.menu_template_items enable row level security;
alter table public.active_menus enable row level security;
alter table public.active_menu_items enable row level security;
alter table public.menu_item_option_groups enable row level security;
alter table public.menu_item_options enable row level security;

revoke all on table
  public.menu_templates, public.menu_template_items, public.active_menus,
  public.active_menu_items, public.menu_item_option_groups, public.menu_item_options
from anon, authenticated;

grant select on table
  public.menu_templates, public.menu_template_items, public.active_menus,
  public.active_menu_items, public.menu_item_option_groups, public.menu_item_options
to anon, authenticated;

grant update (name, description, base_price, allergens, image_url, is_available, sold_out, display_order)
  on table public.menu_template_items to authenticated;
grant update (name, price_adjustment, display_order, is_available)
  on table public.menu_item_options to authenticated;

-- Public and staff reads are separate policies: anon may not call fk_is_active_admin().
drop policy if exists menu_templates_select_public on public.menu_templates;
create policy menu_templates_select_public
on public.menu_templates for select
to anon, authenticated
using (
  exists (
    select 1 from public.active_menus am
    where am.menu_template_id = menu_templates.id
      and public.fk_menu_is_public(am.id)
  )
);

drop policy if exists menu_templates_select_staff on public.menu_templates;
create policy menu_templates_select_staff
on public.menu_templates for select
to authenticated
using (public.fk_is_active_admin());

drop policy if exists active_menus_select_public on public.active_menus;
create policy active_menus_select_public
on public.active_menus for select
to anon, authenticated
using (public.fk_menu_is_public(id));

drop policy if exists active_menus_select_staff on public.active_menus;
create policy active_menus_select_staff
on public.active_menus for select
to authenticated
using (public.fk_is_active_admin());

drop policy if exists active_menu_items_select_public on public.active_menu_items;
create policy active_menu_items_select_public
on public.active_menu_items for select
to anon, authenticated
using (is_available and public.fk_menu_is_public(active_menu_id));

drop policy if exists active_menu_items_select_staff on public.active_menu_items;
create policy active_menu_items_select_staff
on public.active_menu_items for select
to authenticated
using (public.fk_is_active_admin());

drop policy if exists menu_template_items_select_public on public.menu_template_items;
create policy menu_template_items_select_public
on public.menu_template_items for select
to anon, authenticated
using (public.fk_template_item_is_public(id));

drop policy if exists menu_template_items_select_staff on public.menu_template_items;
create policy menu_template_items_select_staff
on public.menu_template_items for select
to authenticated
using (public.fk_is_active_admin());

drop policy if exists menu_template_items_update on public.menu_template_items;
create policy menu_template_items_update
on public.menu_template_items for update
to authenticated
using (public.fk_admin_can('menus') or public.fk_admin_can('orders'))
with check (public.fk_admin_can('menus') or public.fk_admin_can('orders'));

drop policy if exists menu_item_option_groups_select_public on public.menu_item_option_groups;
create policy menu_item_option_groups_select_public
on public.menu_item_option_groups for select
to anon, authenticated
using (public.fk_template_item_is_public(menu_template_item_id));

drop policy if exists menu_item_option_groups_select_staff on public.menu_item_option_groups;
create policy menu_item_option_groups_select_staff
on public.menu_item_option_groups for select
to authenticated
using (public.fk_is_active_admin());

drop policy if exists menu_item_options_select_public on public.menu_item_options;
create policy menu_item_options_select_public
on public.menu_item_options for select
to anon, authenticated
using (
  exists (
    select 1 from public.menu_item_option_groups g
    where g.id = menu_item_options.option_group_id
      and public.fk_template_item_is_public(g.menu_template_item_id)
  )
);

drop policy if exists menu_item_options_select_staff on public.menu_item_options;
create policy menu_item_options_select_staff
on public.menu_item_options for select
to authenticated
using (public.fk_is_active_admin());

drop policy if exists menu_item_options_update on public.menu_item_options;
create policy menu_item_options_update
on public.menu_item_options for update
to authenticated
using (public.fk_admin_can('menus') or public.fk_admin_can('orders'))
with check (public.fk_admin_can('menus') or public.fk_admin_can('orders'));

-- -----------------------------------------------------------------------------
-- RLS: business_settings. Public read (nothing sensitive); staff update.
-- -----------------------------------------------------------------------------
alter table public.business_settings enable row level security;

revoke all on table public.business_settings from anon, authenticated;
grant select on table public.business_settings to anon, authenticated;
grant update (accepting_orders, opening_hours_json, collection_lead_minutes)
  on table public.business_settings to authenticated;

drop policy if exists business_settings_select on public.business_settings;
create policy business_settings_select
on public.business_settings for select
to anon, authenticated
using (true);

drop policy if exists business_settings_update on public.business_settings;
create policy business_settings_update
on public.business_settings for update
to authenticated
using (public.fk_admin_can('menus') or public.fk_admin_can('orders'))
with check (public.fk_admin_can('menus') or public.fk_admin_can('orders'));

-- -----------------------------------------------------------------------------
-- RLS: orders. No public access at all. Inserts only with the secret key.
-- Staff with the orders permission read orders and move them through the kitchen.
-- -----------------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_options enable row level security;
alter table public.order_refunds enable row level security;
alter table public.stripe_webhook_events enable row level security;

revoke all on table
  public.orders, public.order_items, public.order_item_options,
  public.order_refunds, public.stripe_webhook_events
from anon, authenticated;

grant select on table public.orders, public.order_items, public.order_item_options, public.order_refunds
  to authenticated;
grant update (order_status, confirmed_at, prepared_at, ready_at, completed_at, cancelled_at, cancel_reason)
  on table public.orders to authenticated;

drop policy if exists orders_select_staff on public.orders;
create policy orders_select_staff
on public.orders for select
to authenticated
using (public.fk_admin_can('orders'));

drop policy if exists orders_update_staff on public.orders;
create policy orders_update_staff
on public.orders for update
to authenticated
using (public.fk_admin_can('orders'))
with check (public.fk_admin_can('orders'));

drop policy if exists order_items_select_staff on public.order_items;
create policy order_items_select_staff
on public.order_items for select
to authenticated
using (public.fk_admin_can('orders'));

drop policy if exists order_item_options_select_staff on public.order_item_options;
create policy order_item_options_select_staff
on public.order_item_options for select
to authenticated
using (public.fk_admin_can('orders'));

drop policy if exists order_refunds_select_staff on public.order_refunds;
create policy order_refunds_select_staff
on public.order_refunds for select
to authenticated
using (public.fk_admin_can('orders'));

-- stripe_webhook_events: RLS on, no policies. Secret key only.

-- -----------------------------------------------------------------------------
-- Realtime: the kitchen board listens for order changes. RLS still decides which
-- rows a subscriber receives, so only staff with the orders permission get events.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
    ) then
      execute 'alter publication supabase_realtime add table public.orders';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_items'
    ) then
      execute 'alter publication supabase_realtime add table public.order_items';
    end if;
  end if;
end $$;

commit;
