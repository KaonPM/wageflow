-- Disposable database only. Check settlement without activation for stale links.
begin;
do $$
declare scenario record; application_id uuid; payment_id uuid; attempt_id uuid; outcome text;
begin
  for scenario in
    select * from (values
      ('revoked','awaiting_initial_payment','awaiting_payment','revoked',false,'financial_resolution_required'),
      ('expired','awaiting_initial_payment','awaiting_payment','created',true,'financial_resolution_required'),
      ('archived','archived','awaiting_payment','created',false,'financial_resolution_required'),
      ('already_paid','payment_verified','verified','verified',false,'already_verified')
    ) as cases(name,lifecycle,payment_status,attempt_status,expired,expected)
  loop
    application_id:=gen_random_uuid(); payment_id:=gen_random_uuid(); attempt_id:=gen_random_uuid();
    insert into public.wageflow_setup_requests(id,business_name,contact_person,email,status,lifecycle_status)
      values(application_id,'Token Safety Test','Owner','token-test@example.test',
        'Test',scenario.lifecycle);
    insert into public.application_initial_payments(
      id,application_id,setup_amount,first_month_amount,total_amount,covered_month,status,verified_transaction_id)
      values(payment_id,application_id,249,199,448,current_date,scenario.payment_status,
        case when scenario.name='already_paid' then 'preexisting-'||payment_id else null end);
    insert into public.application_payment_attempts(
      id,initial_payment_id,provider_reference,payment_link_token_hash,status,expected_amount,expires_at)
      values(attempt_id,payment_id,'test-'||attempt_id,'hash-'||attempt_id,scenario.attempt_status,448,
        case when scenario.expired then now()-interval '1 minute' else now()+interval '1 day' end);
    outcome:=public.complete_application_payment(attempt_id,'settled-'||attempt_id,44800,'ZAR',now());
    if outcome is distinct from scenario.expected then
      raise exception 'Unexpected completion outcome for %',scenario.name;
    end if;
    if (select lifecycle_status from public.wageflow_setup_requests where id=application_id)='activated' then
      raise exception 'Stale payment activated application for %',scenario.name;
    end if;
    if scenario.name <> 'already_paid' and
       (select status from public.application_initial_payments where id=payment_id)<>'financial_resolution_required' then
      raise exception 'Stale payment was not recorded for financial resolution: %',scenario.name;
    end if;
  end loop;

  application_id:=gen_random_uuid(); payment_id:=gen_random_uuid(); attempt_id:=gen_random_uuid();
  insert into public.wageflow_setup_requests(id,business_name,contact_person,email,status,lifecycle_status)
    values(application_id,'Amount Safety Test','Owner','amount-test@example.test','Test','awaiting_initial_payment');
  insert into public.application_initial_payments(id,application_id,setup_amount,first_month_amount,total_amount,covered_month,status)
    values(payment_id,application_id,249,199,448,current_date,'awaiting_payment');
  insert into public.application_payment_attempts(id,initial_payment_id,provider_reference,payment_link_token_hash,status,expected_amount,expires_at)
    values(attempt_id,payment_id,'test-'||attempt_id,'hash-'||attempt_id,'created',448,now()+interval '1 day');
  begin
    perform public.complete_application_payment(attempt_id,'mismatched-'||attempt_id,1,'ZAR',now());
    raise exception 'Mismatched amount was accepted';
  exception when others then
    if sqlerrm <> 'Payment amount or currency does not match' then raise; end if;
  end;
  if (select status from public.application_initial_payments where id=payment_id)<>'awaiting_payment' then
    raise exception 'Mismatched amount changed payment state';
  end if;
end $$;
rollback;
