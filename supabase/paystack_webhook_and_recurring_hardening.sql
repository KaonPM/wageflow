-- Forward-only Paystack event and recurring-statement concurrency hardening.
begin;

alter table public.subscription_statements add column if not exists payment_provider_transaction_id text;
-- Preflight: resolve duplicate non-null provider transaction ids before applying this index in an environment with historic Paystack data.
create unique index if not exists subscription_statements_provider_transaction_unique
  on public.subscription_statements(payment_provider_transaction_id)
  where payment_provider_transaction_id is not null;

create or replace function public.complete_subscription_statement_payment(
  statement_id_input uuid, payment_reference_input text, provider_transaction text
) returns boolean language plpgsql security definer set search_path = public as $$
declare statement_row public.subscription_statements%rowtype;
begin
  select * into statement_row from public.subscription_statements where id=statement_id_input for update;
  if not found then raise exception 'Statement not found'; end if;
  if statement_row.paid_at is not null then return false; end if;
  update public.subscription_statements set status='paid',paid_at=now(),payment_provider='paystack',payment_reference=left(payment_reference_input,120),payment_provider_transaction_id=provider_transaction,email_error=null where id=statement_row.id;
  if statement_row.statement_type='setup' then update public.subscriptions set setup_paid=true where id=statement_row.subscription_id; end if;
  insert into public.master_audit_log(entity_type,entity_id,action,after_data) values ('subscription_statement',statement_row.id,'paystack_payment_verified',jsonb_build_object('subscription_id',statement_row.subscription_id));
  return true;
end $$;
revoke all on function public.complete_subscription_statement_payment(uuid,text,text) from public,anon,authenticated;
commit;
