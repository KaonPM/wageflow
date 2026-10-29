-- Disposable database only; run after stage_f_processing_race_assertions.sql.
do $$
declare claimed public.email_outbox%rowtype;
begin
  if not public.schedule_application_payment_reminder(
    '00000000-0000-0000-0000-000000000101',
    'initial-payment-reminder:00000000-0000-0000-0000-000000000104:8',
    'reminder@example.test','Reminder Test',8,'https://wageflow.test') then
    raise exception 'Could not seed post-claim test';
  end if;
  select * into claimed from public.claim_email_outbox(25,300)
    where idempotency_key='initial-payment-reminder:00000000-0000-0000-0000-000000000104:8';
  if not found then raise exception 'Could not claim post-claim reminder'; end if;
  if public.archive_unpaid_application('00000000-0000-0000-0000-000000000101') <> 'archived' then
    raise exception 'Could not archive application';
  end if;
  if public.can_deliver_application_payment_email(claimed.id,claimed.claim_token) then
    raise exception 'Archived application remained eligible for send';
  end if;
  if not public.cancel_email_outbox(claimed.id,claimed.claim_token,'Archived before send') then
    raise exception 'Claimed reminder could not be cancelled after archival';
  end if;
  if (select status from public.email_outbox where id=claimed.id) <> 'cancelled' then
    raise exception 'Reminder was not cancelled';
  end if;
end $$;
