-- Billing statements are created only for Starter and Growth subscriptions.
create table if not exists public.subscription_statements (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  statement_type text not null check (statement_type in ('setup', 'monthly')),
  statement_month date not null,
  amount numeric(12,2) not null check (amount > 0),
  recipient_email text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'emailed', 'email_failed')),
  emailed_at timestamptz,
  paid_at timestamptz,
  payment_reference text,
  email_error text,
  created_at timestamptz not null default now(),
  unique (subscription_id, statement_type, statement_month)
);

alter table public.subscription_statements enable row level security;

drop policy if exists "Masters can view subscription statements" on public.subscription_statements;
create policy "Masters can view subscription statements"
on public.subscription_statements for select to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid()
    and lower(profiles.role) in ('master', 'master_admin')
));

-- Safe to run if an earlier version of this script has already been applied.
alter table public.subscription_statements
  add column if not exists paid_at timestamptz,
  add column if not exists payment_reference text;

alter table public.subscription_statements
  drop constraint if exists subscription_statements_status_check;

update public.subscription_statements set status = 'pending' where status = 'issued';

alter table public.subscription_statements
  add constraint subscription_statements_status_check
  check (status in ('pending', 'paid', 'emailed', 'email_failed'));
