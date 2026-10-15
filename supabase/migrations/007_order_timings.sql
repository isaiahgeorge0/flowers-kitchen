-- Flowers Kitchen: when each order entered its current kitchen column.
-- Builds on 006_tidy.sql. Safe to run more than once.
--
-- confirmed_at, prepared_at, ready_at and completed_at are only stamped on forward moves, so a
-- ticket sent back (Ready → Preparing) keeps its old times. status_changed_at records every
-- change of order_status, backwards included, for the kitchen board's column timer.
-- Staff can't write it: their update grant (003) is limited to the status and forward stamps.

begin;

-- -----------------------------------------------------------------------------
-- Column, backfilled from the latest stamp only on the run that adds it. Orders that never got
-- past checkout use created_at.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'status_changed_at'
  ) then
    alter table public.orders add column status_changed_at timestamptz;
    update public.orders
    set status_changed_at = coalesce(greatest(confirmed_at, prepared_at, ready_at, completed_at, cancelled_at), created_at);
  end if;
end;
$$;

alter table public.orders alter column status_changed_at set default now();

-- -----------------------------------------------------------------------------
-- Trigger. Fires after trg_orders_guard (BEFORE triggers run in name order), so a move the
-- guard refuses never gets this far, and the guard only looks at order_status and payment.
-- -----------------------------------------------------------------------------
create or replace function public.fk_stamp_order_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.order_status is distinct from old.order_status then
    new.status_changed_at = now();
  end if;
  
  return new;
end;
$$;

drop trigger if exists trg_orders_status_changed_at on public.orders;
create trigger trg_orders_status_changed_at
before update on public.orders
for each row execute function public.fk_stamp_order_status_change();

-- Check
select
  (select count(*) from public.orders where status_changed_at is null) as orders_without_stamp_0,
  (select string_agg(tgname, ', ' order by tgname) from pg_trigger
    where tgrelid = 'public.orders'::regclass and not tgisinternal) as order_triggers,
  (select count(*) from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'orders' and column_name = 'status_changed_at'
      and grantee in ('anon', 'authenticated') and privilege_type in ('INSERT', 'UPDATE')) as staff_write_grants_0;

commit;
