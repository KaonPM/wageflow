-- Forward-only hardening migration. Apply only through the approved Supabase process.
begin;

create or replace function public.complete_application_payment(
  payment_attempt_id uuid, provider_transaction text, paid_amount_minor bigint, paid_currency text, paid_at timestamptz
) returns text language plpgsql security definer set search_path = public as $$
declare attempt public.application_payment_attempts%rowtype; payment public.application_initial_payments%rowtype; application public.wageflow_setup_requests%rowtype;
begin
  select * into attempt from public.application_payment_attempts where id = payment_attempt_id for update;
  if not found then raise exception 'Payment attempt not found'; end if;
  select * into payment from public.application_initial_payments where id = attempt.initial_payment_id for update;
  select * into application from public.wageflow_setup_requests where id = payment.application_id for update;
  if paid_currency <> payment.currency or paid_amount_minor <> round(payment.total_amount * 100)::bigint then raise exception 'Payment amount or currency does not match'; end if;
  if payment.verified_transaction_id is not null then return 'already_verified'; end if;
  if attempt.status in ('revoked','expired') or attempt.expires_at <= now() or application.lifecycle_status in ('rejected','archived','activation_declined') then
    update public.application_payment_attempts set status='late_success', provider_transaction_id=provider_transaction, provider_paid_at=paid_at, verified_at=now() where id=attempt.id and provider_transaction_id is null;
    update public.application_initial_payments set status='financial_resolution_required', verified_transaction_id=provider_transaction, verified_at=now(), updated_at=now() where id=payment.id;
    insert into public.master_audit_log(entity_type,entity_id,action,after_data) values ('application_initial_payment',payment.id,'late_payment_financial_resolution',jsonb_build_object('application_id',application.id));
    return 'financial_resolution_required';
  end if;
  if application.lifecycle_status <> 'awaiting_initial_payment' or attempt.status not in ('created','initialized','pending') then raise exception 'Payment attempt is not eligible'; end if;
  update public.application_payment_attempts set status='verified',provider_transaction_id=provider_transaction,provider_paid_at=paid_at,verified_at=now() where id=attempt.id;
  update public.application_initial_payments set status='verified',verified_transaction_id=provider_transaction,verified_at=now(),updated_at=now() where id=payment.id;
  update public.wageflow_setup_requests set lifecycle_status='payment_verified',status='Payment Verified' where id=application.id;
  insert into public.master_audit_log(entity_type,entity_id,action,after_data) values ('application_initial_payment',payment.id,'payment_verified',jsonb_build_object('application_id',application.id));
  return 'verified';
end $$;

create or replace function public.archive_unpaid_application(application_id_input uuid)
returns text language plpgsql security definer set search_path = public as $$
declare payment public.application_initial_payments%rowtype; application public.wageflow_setup_requests%rowtype;
begin
  select * into application from public.wageflow_setup_requests where id=application_id_input for update;
  if not found then return 'not_found'; end if;
  select * into payment from public.application_initial_payments where application_id=application.id for update;
  if application.lifecycle_status <> 'awaiting_initial_payment' or payment.status not in ('awaiting_payment','payment_pending') then return 'not_eligible'; end if;
  update public.application_payment_attempts set status='expired',revoked_at=now() where initial_payment_id=payment.id and status in ('created','initialized','pending');
  update public.wageflow_setup_requests set lifecycle_status='archived',status='Archived',archived_at=now() where id=application.id;
  insert into public.master_audit_log(entity_type,entity_id,action) values ('wageflow_setup_request',application.id,'initial_payment_archived');
  return 'archived';
end $$;

create or replace function public.activate_verified_application(application_id_input uuid, actor uuid, decision_reason text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare application public.wageflow_setup_requests%rowtype; payment public.application_initial_payments%rowtype;
begin
  if not exists(select 1 from public.profiles where id=actor and lower(role) in ('master','master_admin') and coalesce(lower(access_status),'active') in ('active','approved')) then raise exception 'Not authorised'; end if;
  select * into application from public.wageflow_setup_requests where id=application_id_input for update;
  if not found then raise exception 'Application not found'; end if;
  select * into payment from public.application_initial_payments where application_id=application.id for update;
  if application.lifecycle_status <> 'payment_verified' or payment.status <> 'verified' then raise exception 'Application is not eligible for activation'; end if;
  update public.businesses set status='active' where id=payment.business_id;
  update public.subscriptions set subscription_status='active',setup_paid=true where id=payment.subscription_id;
  update public.wageflow_setup_requests set lifecycle_status='activated',status='Approved',approved_at=now(),final_reviewed_at=now(),final_reviewed_by=actor,activation_decision_reason=left(decision_reason,500) where id=application.id;
  insert into public.master_audit_log(actor_id,entity_type,entity_id,action,after_data) values(actor,'wageflow_setup_request',application.id,'final_activation_approved',jsonb_build_object('business_id',payment.business_id,'subscription_id',payment.subscription_id));
  insert into public.email_outbox(idempotency_key,event_type,recipient_email,application_id,initial_payment_id,payload) values ('activation-credentials:'||application.id,'activation_credentials',application.email,application.id,payment.id,jsonb_build_object('business_id',payment.business_id)) on conflict (idempotency_key) do nothing;
  return payment.business_id;
end $$;

revoke all on function public.complete_application_payment(uuid,text,bigint,text,timestamptz) from public,anon,authenticated;
revoke all on function public.archive_unpaid_application(uuid) from public,anon,authenticated;
revoke all on function public.activate_verified_application(uuid,uuid,text) from public,anon,authenticated;
commit;
