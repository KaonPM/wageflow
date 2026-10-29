-- Forward-only controlled replacement of a lost or expired initial-payment link.
begin;
create or replace function public.issue_application_payment_replacement(application_id_input uuid)
returns table(raw_token text, provider_reference text, expires_at timestamptz) language plpgsql security definer set search_path = public as $$
declare application public.wageflow_setup_requests%rowtype; payment public.application_initial_payments%rowtype; token text; reference text; expiry timestamptz;
begin
  select * into application from public.wageflow_setup_requests where id=application_id_input for update;
  if not found then raise exception 'Application not found'; end if;
  select * into payment from public.application_initial_payments where application_id=application.id for update;
  if application.lifecycle_status <> 'awaiting_initial_payment' or payment.status not in ('awaiting_payment','payment_pending') then raise exception 'Application is not eligible for a replacement payment link'; end if;
  update public.application_payment_attempts set status='revoked',revoked_at=now() where initial_payment_id=payment.id and status in ('created','initialized','pending');
  token := replace(replace(encode(extensions.gen_random_bytes(32),'base64'),'+','-'),'/','_');
  reference := 'wf-app-' || replace(gen_random_uuid()::text,'-',''); expiry := now()+interval '14 days';
  insert into public.application_payment_attempts(initial_payment_id,provider_reference,payment_link_token_hash,expected_amount,currency,expires_at) values(payment.id,reference,encode(extensions.digest(token,'sha256'),'hex'),payment.total_amount,payment.currency,expiry);
  insert into public.master_audit_log(entity_type,entity_id,action,after_data) values('application_initial_payment',payment.id,'replacement_payment_link_issued',jsonb_build_object('application_id',application.id));
  return query select token,reference,expiry;
end $$;
revoke all on function public.issue_application_payment_replacement(uuid) from public,anon,authenticated;
grant execute on function public.issue_application_payment_replacement(uuid) to service_role;
commit;
