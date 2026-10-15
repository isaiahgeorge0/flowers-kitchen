-- Flowers Kitchen: shared ingredients. One switch per shared item instead of one per box.
-- Builds on 007_order_timings.sql. Safe to run more than once. Contains no prices.
--
-- Two kinds of shared item (menu_components):
--   choice   — picked by the customer (Rice & peas / White rice). Linked from menu_item_options.
--              When it's out it can't be picked on any box; a box left with no available choice in
--              a required group shows as sold out.
--   included — comes in every box (Mac & cheese, Festival, Coleslaw). Linked per box through
--              menu_item_components. When it's out the box still sells and customers see a note.
--
-- order_items.missing_sides snapshots which included sides were out when the order was paid.
-- business_settings.reset_sold_out_daily (default on): an hourly pg_cron job puts every shared
-- item and box back on sale once a day, at 04:00 London time.
--
-- pg_cron: already enabled by 006_tidy.sql.

begin;

-- -----------------------------------------------------------------------------
-- 1. Shared items
-- -----------------------------------------------------------------------------
create table if not exists public.menu_components (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  kind text not null check (kind in ('choice', 'included')),
  is_available boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_components_name_key unique (name)
);

alter table public.menu_item_options
  add column if not exists component_id uuid references public.menu_components (id) on delete set null;

create index if not exists menu_item_options_component_idx
  on public.menu_item_options (component_id)
  where component_id is not null;

create table if not exists public.menu_item_components (
  menu_template_item_id uuid not null references public.menu_template_items (id) on delete cascade,
  component_id uuid not null references public.menu_components (id) on delete cascade,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (menu_template_item_id, component_id)
);

create index if not exists menu_item_components_component_idx
  on public.menu_item_components (component_id);

alter table public.order_items
  add column if not exists missing_sides text[];

-- -----------------------------------------------------------------------------
-- 2. Daily reset setting. sold_out_reset_on is set to today on the run that adds it, so the
-- first job doesn't undo anything the kitchen switched off before this migration.
-- -----------------------------------------------------------------------------
alter table public.business_settings
  add column if not exists reset_sold_out_daily boolean not null default true;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'business_settings'
      and column_name = 'sold_out_reset_on'
  ) then
    alter table public.business_settings add column sold_out_reset_on date;
    update public.business_settings set sold_out_reset_on = (now() at time zone 'Europe/London')::date;
  end if;
end;
$$;

grant update (reset_sold_out_daily) on table public.business_settings to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Triggers: updated_at, field guard, kind checks, defaults for new boxes and options.
-- -----------------------------------------------------------------------------
drop trigger if exists trg_menu_components_updated_at on public.menu_components;
create trigger trg_menu_components_updated_at
before update on public.menu_components
for each row execute function public.fk_set_updated_at();

-- Kitchen staff (orders permission) may only flip is_available; everything else needs menus.
create or replace function public.fk_guard_menu_component_update()
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

drop trigger if exists trg_menu_components_guard on public.menu_components;
create trigger trg_menu_components_guard
before update on public.menu_components
for each row execute function public.fk_guard_menu_component_update();

-- Options link to choices only; boxes link to included sides only. A new option with no
-- component picks up the choice with the same name.
create or replace function public.fk_option_component()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.component_id is null and tg_op = 'INSERT' then
    select c.id into new.component_id
    from public.menu_components c
    where c.name = new.name and c.kind = 'choice';
  end if;
  if new.component_id is not null and not exists (
    select 1 from public.menu_components c where c.id = new.component_id and c.kind = 'choice'
  ) then
    raise exception 'Options can only link to a choice.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_menu_item_options_component on public.menu_item_options;
create trigger trg_menu_item_options_component
before insert or update of component_id on public.menu_item_options
for each row execute function public.fk_option_component();

create or replace function public.fk_check_item_component()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.menu_components c where c.id = new.component_id and c.kind = 'included'
  ) then
    raise exception 'Boxes can only include an included side.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_menu_item_components_kind on public.menu_item_components;
create trigger trg_menu_item_components_kind
before insert or update on public.menu_item_components
for each row execute function public.fk_check_item_component();

-- A new box comes with every included side; owners can untick any of them in the admin.
create or replace function public.fk_link_new_item_sides()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.menu_item_components (menu_template_item_id, component_id, display_order)
  select new.id, c.id, c.display_order
  from public.menu_components c
  where c.kind = 'included'
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_menu_template_items_sides on public.menu_template_items;
create trigger trg_menu_template_items_sides
after insert on public.menu_template_items
for each row execute function public.fk_link_new_item_sides();

-- -----------------------------------------------------------------------------
-- 4. Backfill: a choice per distinct option name, the three included sides, and links.
-- Included sides are linked only to boxes that have none yet, so a re-run doesn't put back a
-- side an owner removed from a box.
-- -----------------------------------------------------------------------------
insert into public.menu_components (name, kind, display_order)
select o.name, 'choice', min(o.display_order)
from public.menu_item_options o
group by o.name
on conflict (name) do nothing;

update public.menu_item_options o
set component_id = c.id
from public.menu_components c
where o.component_id is null
  and c.name = o.name
  and c.kind = 'choice';

insert into public.menu_components (name, kind, display_order)
values
  ('Mac & cheese', 'included', 1),
  ('Festival', 'included', 2),
  ('Coleslaw', 'included', 3)
on conflict (name) do nothing;

insert into public.menu_item_components (menu_template_item_id, component_id, display_order)
select i.id, c.id, c.display_order
from public.menu_template_items i
cross join public.menu_components c
where c.kind = 'included'
  and not exists (
    select 1 from public.menu_item_components mic where mic.menu_template_item_id = i.id
  )
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 5. RLS. Public reads shared items and the sides of public boxes; orders or menus staff flip
-- availability; everything else (adding, renaming, linking) needs the menus permission.
-- -----------------------------------------------------------------------------
alter table public.menu_components enable row level security;
alter table public.menu_item_components enable row level security;

revoke all on table public.menu_components, public.menu_item_components from anon, authenticated;

grant select on table public.menu_components, public.menu_item_components to anon, authenticated;
grant insert, delete on table public.menu_components, public.menu_item_components to authenticated;
grant update (name, kind, is_available, display_order) on table public.menu_components to authenticated;
grant update (display_order) on table public.menu_item_components to authenticated;
grant update (component_id) on table public.menu_item_options to authenticated;

drop policy if exists menu_components_select_public on public.menu_components;
create policy menu_components_select_public
on public.menu_components for select
to anon, authenticated
using (true);

drop policy if exists menu_components_update on public.menu_components;
create policy menu_components_update
on public.menu_components for update
to authenticated
using (public.fk_admin_can('menus') or public.fk_admin_can('orders'))
with check (public.fk_admin_can('menus') or public.fk_admin_can('orders'));

drop policy if exists menu_components_insert on public.menu_components;
create policy menu_components_insert
on public.menu_components for insert
to authenticated
with check (public.fk_admin_can('menus'));

drop policy if exists menu_components_delete on public.menu_components;
create policy menu_components_delete
on public.menu_components for delete
to authenticated
using (public.fk_admin_can('menus'));

drop policy if exists menu_item_components_select_public on public.menu_item_components;
create policy menu_item_components_select_public
on public.menu_item_components for select
to anon, authenticated
using (public.fk_template_item_is_public(menu_template_item_id));

drop policy if exists menu_item_components_select_staff on public.menu_item_components;
create policy menu_item_components_select_staff
on public.menu_item_components for select
to authenticated
using (public.fk_is_active_admin());

drop policy if exists menu_item_components_insert on public.menu_item_components;
create policy menu_item_components_insert
on public.menu_item_components for insert
to authenticated
with check (public.fk_admin_can('menus'));

drop policy if exists menu_item_components_update on public.menu_item_components;
create policy menu_item_components_update
on public.menu_item_components for update
to authenticated
using (public.fk_admin_can('menus'))
with check (public.fk_admin_can('menus'));

drop policy if exists menu_item_components_delete on public.menu_item_components;
create policy menu_item_components_delete
on public.menu_item_components for delete
to authenticated
using (public.fk_admin_can('menus'));

-- -----------------------------------------------------------------------------
-- 6. Daily reset. Puts every shared item back on and clears every box's sold-out flag, once per
-- London day from 04:00. Per-box option switches are owner decisions and are left alone.
-- p_force skips the setting, the time and the once-a-day check (for testing from the SQL editor).
-- -----------------------------------------------------------------------------
create or replace function public.fk_reset_sold_out_daily(p_force boolean default false)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  settings record;
  today date := (now() at time zone 'Europe/London')::date;
  components_reset integer;
  boxes_reset integer;
begin
  select reset_sold_out_daily, sold_out_reset_on into settings
  from public.business_settings
  where id;
  if not found then
    return 0;
  end if;

  if not p_force and (
    not settings.reset_sold_out_daily
    or settings.sold_out_reset_on >= today
    or extract(hour from now() at time zone 'Europe/London') < 4
  ) then
    return 0;
  end if;

  update public.menu_components set is_available = true where not is_available;
  get diagnostics components_reset = row_count;

  update public.menu_template_items set sold_out = false where sold_out;
  get diagnostics boxes_reset = row_count;

  update public.business_settings set sold_out_reset_on = today where id;

  return components_reset + boxes_reset;
end;
$$;

revoke all on function public.fk_reset_sold_out_daily(boolean) from public, anon, authenticated;
grant execute on function public.fk_reset_sold_out_daily(boolean) to service_role;

-- Hourly, so it lands on 04:00 London in summer and winter alike; the function does the rest.
select cron.unschedule(jobid) from cron.job where jobname = 'fk-reset-sold-out-daily';
select cron.schedule(
  'fk-reset-sold-out-daily',
  '1 * * * *',
  $cron$ select public.fk_reset_sold_out_daily() $cron$
);

-- Check
select
  (select string_agg(name || ' (' || kind || ')', ', ' order by kind, display_order)
    from public.menu_components) as components,
  (select count(*) from public.menu_item_options where component_id is null) as options_without_choice_0,
  (select count(*) from public.menu_template_items i
    where not exists (select 1 from public.menu_item_components mic where mic.menu_template_item_id = i.id))
    as boxes_without_sides_0,
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'order_items' and column_name = 'missing_sides') as missing_sides_column_1,
  (select reset_sold_out_daily::text || ', last reset ' || coalesce(sold_out_reset_on::text, 'never')
    from public.business_settings where id) as daily_reset,
  (select schedule from cron.job where jobname = 'fk-reset-sold-out-daily') as reset_schedule;

commit;
