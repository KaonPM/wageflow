-- Run in disposable stage_f_replacement after the two-session replacement case.
do $$
declare claimed public.email_outbox%rowtype;
begin
  if not public.schedule_application_payment_reminder(
    '00000000-0000-0000-0000-000000000101',
    'initial-payment-reminder:00000000-0000-0000-0000-000000000104:6',
    'reminder@example.test','Reminder Test',6,'https://wageflow.test') then
    raise exception 'Could not seed an eligible reminder';
  end if;
  select * into claimed from public.claim_email_outbox(25,300)
    where idempotency_key='initial-payment-reminder:00000000-0000-0000-0000-000000000104:6';
  if not found then raise exception 'Could not claim reminder'; end if;
  if not public.can_deliver_application_payment_email(claimed.id,claimed.claim_token) then
    raise exception 'Claimed reminder is unexpectedly ineligible';
  end if;
  begin
    perform * from public.issue_application_payment_replacement('00000000-0000-0000-0000-000000000101'::uuid);
    raise exception 'Replacement incorrectly proceeded during active delivery';
  exception when others then
    if sqlerrm <> 'Payment email delivery is in progress' then raise; end if;
  end;
  if public.schedule_application_payment_reminder(
    '00000000-0000-0000-0000-000000000101',
    'initial-payment-reminder:00000000-0000-0000-0000-000000000104:7',
    'reminder@example.test','Reminder Test',7,'https://wageflow.test') then
    raise exception 'Scheduler rotated a link during active delivery';
  end if;
  if not public.cancel_email_outbox(claimed.id,claimed.claim_token,'Disposable test') then
    raise exception 'Claim owner could not cancel';
  end if;
  perform * from public.issue_application_payment_replacement('00000000-0000-0000-0000-000000000101'::uuid);
  if (select count(*) from public.application_payment_attempts
      where initial_payment_id='00000000-0000-0000-0000-000000000104'::uuid
        and status in ('created','initialized','pending')) <> 1 then
    raise exception 'Replacement left an invalid live-attempt count';
  end if;
end $$;
