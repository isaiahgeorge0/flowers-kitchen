-- Flowers Kitchen: catering lead permissions, catering email tracking, payment data retention.
-- Builds on 005_webhook_ignored_and_rate_limits.sql. Safe to run more than once.
--
-- pg_cron: Supabase ships it preloaded, so the create extension below is enough. If it errors,
-- enable "pg_cron" under Database → Extensions in the dashboard, then run this file again.

create extension if not exists pg_cron with schema pg_catalog;

begin;

-- -----------------------------------------------------------------------------
-- 1. Catering leads: only staff with "Catering" ticked can read or update them.
-- -----------------------------------------------------------------------------
drop policy if exists catering_enquiries_select_admin on public.catering_enquiries;
create policy catering_enquiries_select_admin
on public.catering_enquiries
for select
to authenticated
using (public.fk_admin_can('catering'));

drop policy if exists catering_enquiries_update_admin on public.catering_enquiries;
create policy catering_enquiries_update_admin
on public.catering_enquiries
for update
to authenticated
using (public.fk_admin_can('catering'))
with check (public.fk_admin_can('catering'));

-- -----------------------------------------------------------------------------
-- 2. Catering confirmation email: stamped once sent, like orders.confirmation_email_sent_at,
-- so the admin can see a failed one and resend it without sending twice.
-- Leads from before this column existed are assumed sent (only on the run that adds it, and
-- without touching updated_at).
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'catering_enquiries'
      and column_name = 'confirmation_email_sent_at'
  ) then
    alter table public.catering_enquiries add column confirmation_email_sent_at timestamptz;
    alter table public.catering_enquiries disable trigger trg_catering_enquiries_updated_at;
    update public.catering_enquiries set confirmation_email_sent_at = created_at;
    alter table public.catering_enquiries enable trigger trg_catering_enquiries_updated_at;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Retention: after 90 days the raw Stripe payloads (which hold customer names, emails and
-- phone numbers) are cleared. The rows themselves stay, so the ledgers and order records still add up.
-- stripe_webhook_events has no created_at; received_at is when the event arrived.
-- -----------------------------------------------------------------------------
alter table public.stripe_webhook_events alter column payload_json drop not null;

create or replace function public.fk_purge_payment_payloads()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  events_cleared integer;
  refunds_cleared integer;
begin
  update public.stripe_webhook_events
  set payload_json = null
  where payload_json is not null
    and received_at < now() - interval '90 days';
  get diagnostics events_cleared = row_count;

  update public.order_refunds
  set payload_json = null
  where payload_json is not null
    and created_at < now() - interval '90 days';
  get diagnostics refunds_cleared = row_count;

  return events_cleared + refunds_cleared;
end;
$$;

revoke all on function public.fk_purge_payment_payloads() from public, anon, authenticated;

-- pg_cron runs in UTC, and 03:00 in London is 02:00 or 03:00 UTC depending on the season.
-- Run at both and let only the one that lands on 03:00 London time do the work.
select cron.unschedule(jobid) from cron.job where jobname = 'fk-purge-payment-payloads';
select cron.schedule(
  'fk-purge-payment-payloads',
  '0 2,3 * * *',
  $cron$
    select public.fk_purge_payment_payloads()
    where extract(hour from now() at time zone 'Europe/London') = 3
  $cron$
);

-- Check
select
  (select pg_get_expr(polqual, polrelid) from pg_policy
    where polrelid = 'public.catering_enquiries'::regclass
      and polname = 'catering_enquiries_select_admin') as leads_select_policy,
  (select pg_get_expr(polqual, polrelid) from pg_policy
    where polrelid = 'public.catering_enquiries'::regclass
      and polname = 'catering_enquiries_update_admin') as leads_update_policy,
  (select count(*) from public.catering_enquiries
    where confirmation_email_sent_at is null) as leads_without_confirmation_stamp,
  (select is_nullable from information_schema.columns
    where table_schema = 'public' and table_name = 'stripe_webhook_events'
      and column_name = 'payload_json') as webhook_payload_nullable,
  (select schedule from cron.job where jobname = 'fk-purge-payment-payloads') as purge_schedule;

commit;
