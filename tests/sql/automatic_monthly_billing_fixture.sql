-- Disposable PostgreSQL only. Minimal prerequisite schema for the automatic
-- billing migration; never run this fixture against a WageFlow database.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;
create schema auth;
create table auth.users(id uuid primary key);
create table public.businesses(id uuid primary key, email text, status text);
create table public.employer_business_memberships(employer_id uuid, business_id uuid, is_active boolean);
create table public.subscriptions(
  id uuid primary key, business_id uuid not null references public.businesses(id),
  subscription_status text not null, plan_name text not null, monthly_fee numeric(12,2) not null
);
create table public.subscription_statements(
  id uuid primary key, subscription_id uuid not null references public.subscriptions(id),
  business_id uuid not null references public.businesses(id), statement_type text not null,
  statement_month date not null, amount numeric(12,2) not null, status text not null,
  paid_at timestamptz, payment_reference text, payment_provider text,
  payment_initialized_at timestamptz, payment_authorization_url text,
  payment_initialization_claim uuid, payment_initialization_lease_expires_at timestamptz
);
create table public.application_initial_payments(subscription_id uuid, covered_month date, status text);
create table public.email_outbox(
  id uuid primary key, event_type text not null, payload jsonb not null,
  status text not null, claim_token uuid, recipient_email text not null
);
insert into auth.users values ('00000000-0000-0000-0000-000000000001');
insert into public.businesses values ('00000000-0000-0000-0000-000000000002','billing@example.test','active');
insert into public.employer_business_memberships values (
  '00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',true
);
insert into public.subscriptions values (
  '00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002',
  'active','Starter',199
);
insert into public.subscription_statements values (
  '00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002','monthly','2026-11-01',199,'pending',
  null,null,null,null,null,null,null
);
