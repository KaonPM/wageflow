-- Forward-only migration for payment-gated WageFlow application activation.
-- Apply through the normal Supabase migration process; do not run this against production from Codex.
begin;

alter table public.wageflow_setup_requests
  add column if not exists lifecycle_status text not null default 'submitted',
  add column if not exists initial_reviewed_at timestamptz,
  add column if not exists initial_reviewed_by uuid references public.profiles(id),
  add column if not exists final_reviewed_at timestamptz,
  add column if not exists final_reviewed_by uuid references public.profiles(id),
  add column if not exists activation_decision_reason text,
  add column if not exists archived_at timestamptz;

alter table public.wageflow_setup_requests drop constraint if exists wageflow_setup_requests_lifecycle_status_check;
alter table public.wageflow_setup_requests add constraint wageflow_setup_requests_lifecycle_status_check check (lifecycle_status in (
  'submitted','rejected','awaiting_initial_payment','payment_verified','activation_declined','activated','archived'
));

update public.wageflow_setup_requests
set lifecycle_status = case lower(coalesce(status, 'pending'))
  when 'approved' then 'activated'
  when 'rejected' then 'rejected'
  else 'submitted'
end
where lifecycle_status = 'submitted';

create table if not exists public.application_initial_payments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.wageflow_setup_requests(id) on delete restrict,
  business_id uuid references public.businesses(id) on delete restrict,
  subscription_id uuid references public.subscriptions(id) on delete restrict,
  setup_amount numeric(12,2) not null check (setup_amount >= 0),
  first_month_amount numeric(12,2) not null check (first_month_amount >= 0),
  total_amount numeric(12,2) not null check (total_amount = setup_amount + first_month_amount),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  covered_month date not null,
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment','payment_pending','verified','financial_resolution_required','cancelled')),
  verified_at timestamptz,
  verified_transaction_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists application_initial_payments_status_idx on public.application_initial_payments(status, created_at);

create table if not exists public.application_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  initial_payment_id uuid not null references public.application_initial_payments(id) on delete restrict,
  provider text not null default 'paystack' check (provider = 'paystack'),
  provider_reference text not null unique,
  payment_link_token_hash text not null unique,
  status text not null default 'created' check (status in ('created','initialized','pending','verified','failed','expired','revoked','late_success')),
  expected_amount numeric(12,2) not null check (expected_amount >= 0),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  expires_at timestamptz not null,
  initialized_at timestamptz,
  verified_at timestamptz,
  provider_transaction_id text unique,
  provider_paid_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists application_payment_attempts_live_payment_idx
  on public.application_payment_attempts(initial_payment_id)
  where status in ('created','initialized','pending');

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'paystack'),
  event_key text not null unique,
  provider_reference text,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  event_type text not null,
  recipient_email text not null,
  application_id uuid references public.wageflow_setup_requests(id) on delete set null,
  initial_payment_id uuid references public.application_initial_payments(id) on delete set null,
  status text not null default 'queued' check (status in ('queued','processing','delivered','retryable_failure','permanently_failed')),
  attempt_count integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  delivered_at timestamptz,
  provider_message_id text,
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists email_outbox_ready_idx on public.email_outbox(status, next_attempt_at);

alter table public.application_initial_payments enable row level security;
alter table public.application_payment_attempts enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.email_outbox enable row level security;

create or replace function public.process_application_payment_success(
  payment_attempt uuid, provider_tx_id text, paid_at timestamptz
) returns text language plpgsql security definer set search_path = public as $$
declare payment_row public.application_initial_payments%rowtype; app_row public.wageflow_setup_requests%rowtype;
begin
  select p.* into payment_row from public.application_initial_payments p
  join public.application_payment_attempts a on a.initial_payment_id = p.id
  where a.id = payment_attempt for update;
  if not found then raise exception 'Payment attempt not found'; end if;
  select * into app_row from public.wageflow_setup_requests where id = payment_row.application_id for update;
  if payment_row.status = 'verified' then return 'already_verified'; end if;
  if app_row.lifecycle_status in ('rejected','archived','activation_declined') then
    update public.application_payment_attempts set status = 'late_success', provider_transaction_id = provider_tx_id, provider_paid_at = paid_at, verified_at = now() where id = payment_attempt and provider_transaction_id is null;
    update public.application_initial_payments set status = 'financial_resolution_required', verified_transaction_id = provider_tx_id, verified_at = now(), updated_at = now() where id = payment_row.id;
    return 'financial_resolution_required';
  end if;
  if app_row.lifecycle_status <> 'awaiting_initial_payment' then raise exception 'Application is not eligible for payment verification'; end if;
  update public.application_payment_attempts set status = 'verified', provider_transaction_id = provider_tx_id, provider_paid_at = paid_at, verified_at = now() where id = payment_attempt and provider_transaction_id is null;
  if not found then return 'already_verified'; end if;
  update public.application_initial_payments set status = 'verified', verified_transaction_id = provider_tx_id, verified_at = now(), updated_at = now() where id = payment_row.id;
  update public.wageflow_setup_requests set lifecycle_status = 'payment_verified', status = 'Payment Verified' where id = app_row.id;
  return 'verified';
end $$;
revoke all on function public.process_application_payment_success(uuid, text, timestamptz) from public, anon, authenticated;

commit;
