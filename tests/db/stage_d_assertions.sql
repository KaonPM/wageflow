-- Transactional assertions for the disposable Stage D database only.
begin;
do $$
declare master_id uuid:=gen_random_uuid(); app_id uuid:=gen_random_uuid(); business_id uuid:=gen_random_uuid(); subscription_id uuid:=gen_random_uuid(); payment_id uuid:=gen_random_uuid(); attempt_id uuid:=gen_random_uuid(); result text; activated uuid;
begin
  insert into public.profiles(id,role,access_status) values(master_id,'master_admin','active');
  insert into public.wageflow_setup_requests(id,business_name,contact_person,email,status,lifecycle_status) values(app_id,'Stage D Test','Owner','stage-d@example.test','Awaiting Initial Payment','awaiting_initial_payment');
  insert into public.businesses(id,business_name,email,status,source_request_id) values(business_id,'Stage D Test','stage-d@example.test','pending_payment',app_id);
  insert into public.subscriptions(id,business_id,plan_name,monthly_fee,setup_fee,setup_paid,subscription_status) values(subscription_id,business_id,'Starter',199,249,false,'pending');
  insert into public.application_initial_payments(id,application_id,business_id,subscription_id,setup_amount,first_month_amount,total_amount,covered_month,status) values(payment_id,app_id,business_id,subscription_id,249,199,448,current_date,'awaiting_payment');
  insert into public.application_payment_attempts(id,initial_payment_id,provider_reference,payment_link_token_hash,expected_amount,expires_at) values(attempt_id,payment_id,'stage-d-ref','stage-d-token',448,now()+interval '1 day');
  select public.complete_application_payment(attempt_id,'stage-d-transaction',44800,'ZAR',now()) into result;
  if result <> 'verified' then raise exception 'payment verification did not succeed: %',result; end if;
  select public.complete_application_payment(attempt_id,'stage-d-transaction',44800,'ZAR',now()) into result;
  if result <> 'already_verified' then raise exception 'duplicate payment was not idempotent: %',result; end if;
  select public.activate_verified_application(app_id,master_id,null) into activated;
  if activated <> business_id then raise exception 'activation returned unexpected business'; end if;
  if not exists(select 1 from public.email_outbox where application_id=app_id and event_type='activation_credentials') then raise exception 'activation credentials event missing'; end if;
  if not exists(select 1 from public.application_employer_onboarding where application_id=app_id and status='pending') then raise exception 'onboarding pending state missing'; end if;
end $$;
rollback;
