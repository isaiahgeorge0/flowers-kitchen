-- Flowers Kitchen: scheduled collection, pause, order source (QR) and extra customer emails.
-- Builds on 003_ordering.sql. Safe to run more than once. Contains no prices.

begin;

-- -----------------------------------------------------------------------------
-- Settings: collection slots, pause, ready email.
-- -----------------------------------------------------------------------------
alter table public.business_settings
  add column if not exists slot_minutes integer not null default 15,
  add column if not exists max_orders_per_slot integer not null default 6,
  add column if not exists schedule_days_ahead integer not null default 7,
  add column if not exists same_day_cutoff_minutes integer not null default 30,
  -- Online ordering is paused until this time; no job needed, every reader compares with now().
  add column if not exists paused_until timestamptz,
  -- While paused, customers can still book a later collection time (only ASAP is blocked).
  add column if not exists pause_allows_scheduled boolean not null default true,
  add column if not exists ready_email_enabled boolean not null default true;

alter table public.business_settings drop constraint if exists business_settings_slot_minutes_check;
alter table public.business_settings add constraint business_settings_slot_minutes_check
  check (slot_minutes in (10, 15, 20, 30, 60));
alter table public.business_settings drop constraint if exists business_settings_max_orders_per_slot_check;
alter table public.business_settings add constraint business_settings_max_orders_per_slot_check
  check (max_orders_per_slot between 1 and 100);
alter table public.business_settings drop constraint if exists business_settings_schedule_days_ahead_check;
alter table public.business_settings add constraint business_settings_schedule_days_ahead_check
  check (schedule_days_ahead between 0 and 14);
alter table public.business_settings drop constraint if exists business_settings_same_day_cutoff_minutes_check;
alter table public.business_settings add constraint business_settings_same_day_cutoff_minutes_check
  check (same_day_cutoff_minutes between 0 and 240);

grant update (
  slot_minutes, max_orders_per_slot, schedule_days_ahead, same_day_cutoff_minutes,
  paused_until, pause_allows_scheduled, ready_email_enabled
) on table public.business_settings to authenticated;

-- Kitchen staff (orders permission) may switch ordering on/off and pause it; everything
-- else in the settings row needs the menus permission.
create or replace function public.fk_guard_business_settings_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or public.fk_admin_can('menus') then
    return new;
  end if;
  if (to_jsonb(new) - 'accepting_orders' - 'paused_until' - 'updated_at')
     is distinct from (to_jsonb(old) - 'accepting_orders' - 'paused_until' - 'updated_at') then
    raise exception 'Only staff with menu permission can change ordering settings.' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Orders: collection time, slot capacity flag, source, email timestamps.
-- -----------------------------------------------------------------------------
alter table public.orders
  add column if not exists collection_type text not null default 'asap',
  -- Start of the chosen collection slot; null for ASAP.
  add column if not exists scheduled_for timestamptz,
  -- The slot was already full when the payment landed. The order stands; the kitchen sees a flag.
  add column if not exists slot_over_capacity boolean not null default false,
  add column if not exists source text not null default 'web',
  add column if not exists ready_email_sent_at timestamptz,
  add column if not exists cancellation_email_sent_at timestamptz;

alter table public.orders drop constraint if exists orders_collection_type_check;
alter table public.orders add constraint orders_collection_type_check
  check (collection_type in ('asap', 'scheduled'));
alter table public.orders drop constraint if exists orders_scheduled_for_matches_type;
alter table public.orders add constraint orders_scheduled_for_matches_type
  check ((collection_type = 'scheduled') = (scheduled_for is not null));
alter table public.orders drop constraint if exists orders_source_check;
alter table public.orders add constraint orders_source_check
  check (source in ('web', 'qr'));

-- Slot capacity counts and the kitchen's upcoming list.
create index if not exists orders_scheduled_for_idx
  on public.orders (scheduled_for)
  where scheduled_for is not null;

-- Staff can still only update the kitchen columns granted in 003; the new columns are
-- written by the server (secret key) only.

-- Check
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'business_settings'
      and column_name in ('slot_minutes', 'max_orders_per_slot', 'schedule_days_ahead',
        'same_day_cutoff_minutes', 'paused_until', 'pause_allows_scheduled', 'ready_email_enabled')) as settings_columns_7,
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'orders'
      and column_name in ('collection_type', 'scheduled_for', 'slot_over_capacity', 'source',
        'ready_email_sent_at', 'cancellation_email_sent_at')) as order_columns_6;

commit;
