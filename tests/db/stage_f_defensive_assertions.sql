-- Run only against a disposable database after the Stage F migration sequence
-- and reminder_concurrency_seed.sql. Roll back every test fixture change.
begin;
do $$
declare
  missing_application constant uuid := '00000000-0000-0000-0000-000000000201';
  eligible_application constant uuid := '00000000-0000-0000-0000-000000000101';
  payment_id constant uuid := '00000000-0000-0000-0000-000000000104';
  successful_key constant text := 'stage-f-defensive-success';
  blocked_key constant text := 'stage-f-defensive-blocked';
  result boolean;
  claimed public.email_outbox%rowtype;
begin
  insert into public.wageflow_setup_requests(id,business_name,contact_person,email,status,lifecycle_status)
    values(missing_application,'Missing Payment Test','Owner','missing@example.test',
      'Awaiting Initial Payment','awaiting_initial_payment');

  -- An existing application without a payment must produce a deliberate error
  -- for replacement and a deliberate false result for reminder scheduling.
  begin
    perform * from public.issue_application_payment_replacement(missing_application);
    raise exception 'Replacement unexpectedly accepted an application without a payment';
  exception when others then
    if sqlerrm <> 'Initial payment not found' then raise; end if;
  end;
  result := public.schedule_application_payment_reminder(missing_application,
    'stage-f-defensive-missing','missing@example.test','Missing Payment Test',1,'https://wageflow.test');
  if result is distinct from false then
    raise exception 'Scheduler did not explicitly reject missing payment';
  end if;
  if exists(select 1 from public.email_outbox where idempotency_key='stage-f-defensive-missing') then
    raise exception 'Missing payment created an outbox job';
  end if;

  -- Preserve lifecycle gating for an application that does have a payment.
  update public.wageflow_setup_requests set lifecycle_status='rejected',status='Rejected'
    where id=eligible_application;
  begin
    perform * from public.issue_application_payment_replacement(eligible_application);
    raise exception 'Replacement unexpectedly accepted an ineligible application';
  exception when others then
    if sqlerrm <> 'Application is not eligible for a replacement payment link' then raise; end if;
  end;
  result := public.schedule_application_payment_reminder(eligible_application,
    'stage-f-defensive-ineligible','reminder@example.test','Reminder Test',1,'https://wageflow.test');
  if result is distinct from false then raise exception 'Scheduler accepted an ineligible application'; end if;
  update public.wageflow_setup_requests set lifecycle_status='awaiting_initial_payment',status='Awaiting Initial Payment'
    where id=eligible_application;

  -- One eligible schedule creates exactly one logical outbox job and a matching live attempt.
  result := public.schedule_application_payment_reminder(eligible_application,
    successful_key,'reminder@example.test','Reminder Test',1,'https://wageflow.test');
  if result is distinct from true then raise exception 'Eligible scheduling failed'; end if;
  if (select count(*) from public.email_outbox where idempotency_key=successful_key) <> 1 then
    raise exception 'Eligible scheduling did not create exactly one job';
  end if;
  if not exists(
    select 1 from public.email_outbox o
    join public.application_payment_attempts a
      on a.payment_link_token_hash=encode(extensions.digest(split_part(o.payload->>'paymentUrl','/pay/',2),'sha256'),'hex')
    where o.idempotency_key=successful_key and a.initial_payment_id=payment_id
      and a.status in ('created','initialized','pending')
  ) then raise exception 'Scheduled link does not match the live attempt'; end if;

  result := public.schedule_application_payment_reminder(eligible_application,
    successful_key,'reminder@example.test','Reminder Test',1,'https://wageflow.test');
  if result is distinct from false then raise exception 'Duplicate reminder key was accepted'; end if;
  if (select count(*) from public.email_outbox where idempotency_key=successful_key) <> 1 then
    raise exception 'Duplicate reminder key created another job';
  end if;

  -- A live claim must block both replacement and reminder link rotation.
  select * into claimed from public.claim_email_outbox(25,300)
    where idempotency_key=successful_key;
  if not found then raise exception 'Could not claim scheduled reminder'; end if;
  begin
    perform * from public.issue_application_payment_replacement(eligible_application);
    raise exception 'Replacement unexpectedly ignored the active delivery claim';
  exception when others then
    if sqlerrm <> 'Payment email delivery is in progress' then raise; end if;
  end;
  result := public.schedule_application_payment_reminder(eligible_application,
    blocked_key,'reminder@example.test','Reminder Test',2,'https://wageflow.test');
  if result is distinct from false then raise exception 'Scheduler ignored the active delivery claim'; end if;
  if exists(select 1 from public.email_outbox where idempotency_key=blocked_key) then
    raise exception 'Active delivery claim still allowed another job';
  end if;
end $$;
rollback;
