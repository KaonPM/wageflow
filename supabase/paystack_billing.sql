-- Paystack is the sole provider for WageFlow subscription and setup-fee payments.
alter table public.subscription_statements
  add column if not exists payment_provider text,
  add column if not exists payment_initialized_at timestamptz;

alter table public.subscription_statements
  drop constraint if exists subscription_statements_payment_provider_check;

alter table public.subscription_statements
  add constraint subscription_statements_payment_provider_check
  check (payment_provider is null or payment_provider = 'paystack');
