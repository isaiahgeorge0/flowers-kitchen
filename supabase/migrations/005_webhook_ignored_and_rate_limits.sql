-- Flowers Kitchen: webhook 'ignored' status and rate limiting for the public forms.
-- Builds on 003_ordering.sql. Safe to run more than once.

begin;

-- -----------------------------------------------------------------------------
-- Stripe webhook ledger: events that aren't for a site order (Payment Links, invoices,
-- manual charges, or an order that no longer exists) are recorded as 'ignored'.
-- failure_reason says why: 'not_ours' or 'order_missing'.
-- -----------------------------------------------------------------------------
alter table public.stripe_webhook_events
  drop constraint if exists stripe_webhook_events_processing_status_check;
alter table public.stripe_webhook_events
  add constraint stripe_webhook_events_processing_status_check
  check (processing_status in ('received', 'processing', 'processed', 'ignored', 'failed'));

-- -----------------------------------------------------------------------------
-- Rate limiting: one row per allowed attempt at checkout or the catering form.
-- key_hash is sha256(RATE_LIMIT_SALT + IP or phone), so no raw IPs or numbers are stored.
-- lib/rate-limit.ts deletes rows older than 24 hours.
-- -----------------------------------------------------------------------------
create table if not exists public.rate_limit_hits (
  id bigserial primary key,
  bucket text not null,
  key_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_hits_lookup_idx
  on public.rate_limit_hits (bucket, key_hash, created_at);

-- RLS on, no policies. Secret key only.
alter table public.rate_limit_hits enable row level security;
revoke all on table public.rate_limit_hits from anon, authenticated;
revoke all on sequence public.rate_limit_hits_id_seq from anon, authenticated;

-- Check
select
  (select pg_get_constraintdef(oid) from pg_constraint
    where conrelid = 'public.stripe_webhook_events'::regclass
      and conname = 'stripe_webhook_events_processing_status_check') as processing_status_check,
  (select relrowsecurity from pg_class where oid = 'public.rate_limit_hits'::regclass) as rate_limit_rls_on,
  (select count(*) from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'rate_limit_hits'
      and grantee in ('anon', 'authenticated')) as rate_limit_public_grants_0;

commit;
