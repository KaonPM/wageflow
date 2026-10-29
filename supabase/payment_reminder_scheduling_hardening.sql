-- Atomically issue one reminder link per idempotency key so concurrent cron runs cannot email a revoked token.
begin;
create or replace function public.schedule_application_payment_reminder(
  application_id_input uuid, reminder_key text, recipient_input text, business_name_input text, reminder_day integer, origin_input text
) returns boolean language plpgsql security definer set search_path=public as $$
declare application public.wageflow_setup_requests%rowtype; payment public.application_initial_payments%rowtype; token text; reference text; expiry timestamptz;
begin
  if origin_input !~ '^https?://[^/]+$' then raise exception 'Invalid payment origin'; end if;
  select * into application from public.wageflow_setup_requests where id=application_id_input for update;
  if not found then return false; end if;
  select * into payment from public.application_initial_payments where application_id=application.id for update;
  if application.lifecycle_status <> 'awaiting_initial_payment' or payment.status not in ('awaiting_payment','payment_pending') then return false; end if;
  if exists(select 1 from public.email_outbox where idempotency_key=reminder_key) then return false; end if;
  update public.application_payment_attempts set status='revoked',revoked_at=now() where initial_payment_id=payment.id and status in ('created','initialized','pending');
  token:=replace(replace(encode(extensions.gen_random_bytes(32),'base64'),'+','-'),'/','_'); reference:='wf-app-'||replace(gen_random_uuid()::text,'-',''); expiry:=now()+interval '14 days';
  insert into public.application_payment_attempts(initial_payment_id,provider_reference,payment_link_token_hash,expected_amount,currency,expires_at) values(payment.id,reference,encode(extensions.digest(token,'sha256'),'hex'),payment.total_amount,payment.currency,expiry);
  insert into public.email_outbox(idempotency_key,event_type,recipient_email,application_id,initial_payment_id,payload) values(reminder_key,'initial_payment_reminder',recipient_input,application.id,payment.id,jsonb_build_object('businessName',business_name_input,'day',reminder_day,'paymentUrl',origin_input||'/pay/'||token));
  insert into public.master_audit_log(entity_type,entity_id,action,after_data) values('application_initial_payment',payment.id,'replacement_payment_link_issued',jsonb_build_object('application_id',application.id,'reminder_day',reminder_day));
  return true;
end $$;
revoke all on function public.schedule_application_payment_reminder(uuid,text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.schedule_application_payment_reminder(uuid,text,text,text,integer,text) to service_role;
commit;
