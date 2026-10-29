-- Forward-only lock ordering correction: application -> initial payment -> payment attempt.
begin;

create or replace function public.complete_application_payment(
  payment_attempt_id uuid, provider_transaction text, paid_amount_minor bigint, paid_currency text, paid_at timestamptz
) returns text language plpgsql security definer set search_path=public as $$
declare attempt public.application_payment_attempts%rowtype; payment public.application_initial_payments%rowtype; application public.wageflow_setup_requests%rowtype; payment_id uuid;
begin
  select initial_payment_id into payment_id from public.application_payment_attempts where id=payment_attempt_id;
  if payment_id is null then raise exception 'Payment attempt not found'; end if;
  select * into payment from public.application_initial_payments where id=payment_id;
  if not found then raise exception 'Initial payment not found'; end if;
  select * into application from public.wageflow_setup_requests where id=payment.application_id for update;
  select * into payment from public.application_initial_payments where id=payment_id for update;
  select * into attempt from public.application_payment_attempts where id=payment_attempt_id for update;
  if paid_currency <> payment.currency or paid_amount_minor <> round(payment.total_amount * 100)::bigint then raise exception 'Payment amount or currency does not match'; end if;
  if payment.verified_transaction_id is not null then return 'already_verified'; end if;
  if attempt.status in ('revoked','expired') or attempt.expires_at <= now() or application.lifecycle_status in ('rejected','archived','activation_declined') then
    update public.application_payment_attempts set status='late_success',provider_transaction_id=provider_transaction,provider_paid_at=paid_at,verified_at=now() where id=attempt.id and provider_transaction_id is null;
    update public.application_initial_payments set status='financial_resolution_required',verified_transaction_id=provider_transaction,verified_at=now(),updated_at=now() where id=payment.id;
    insert into public.master_audit_log(entity_type,entity_id,action,after_data) values('application_initial_payment',payment.id,'late_payment_financial_resolution',jsonb_build_object('application_id',application.id));
    return 'financial_resolution_required';
  end if;
  if application.lifecycle_status <> 'awaiting_initial_payment' or attempt.status not in ('created','initialized','pending') then raise exception 'Payment attempt is not eligible'; end if;
  update public.application_payment_attempts set status='verified',provider_transaction_id=provider_transaction,provider_paid_at=paid_at,verified_at=now() where id=attempt.id;
  update public.application_initial_payments set status='verified',verified_transaction_id=provider_transaction,verified_at=now(),updated_at=now() where id=payment.id;
  update public.wageflow_setup_requests set lifecycle_status='payment_verified',status='Payment Verified' where id=application.id;
  insert into public.master_audit_log(entity_type,entity_id,action,after_data) values('application_initial_payment',payment.id,'payment_verified',jsonb_build_object('application_id',application.id));
  return 'verified';
end $$;

revoke all on function public.complete_application_payment(uuid,text,bigint,text,timestamptz) from public,anon,authenticated;
commit;
