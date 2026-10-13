-- Catering enquiries from the /catering event builder.
-- Only the server (service role key) reads or writes this table: RLS is on with no policies.

create table if not exists public.catering_enquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'new',
  occasion text not null,
  guests int not null,
  service text not null,
  mains text[] not null default '{}',
  extras text[] not null default '{}',
  event_date date not null,
  event_time text not null,
  postcode text not null,
  name text not null,
  email text not null,
  phone text,
  notes text,
  estimate_text text not null,
  user_agent text
);

-- Supports the "same email in the last 5 minutes" duplicate check.
create index if not exists catering_enquiries_email_created_at_idx
  on public.catering_enquiries (email, created_at desc);

alter table public.catering_enquiries enable row level security;

-- No policies on purpose. The service role bypasses RLS; the public API keys get nothing.
revoke all on table public.catering_enquiries from anon, authenticated;
