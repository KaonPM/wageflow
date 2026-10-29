update public.wageflow_setup_requests
set lifecycle_status = 'awaiting_initial_payment', status = 'Payment Pending', archived_at = null
where id = '00000000-0000-0000-0000-000000000101'::uuid;

update public.application_initial_payments
set status = 'awaiting_payment'
where id = '00000000-0000-0000-0000-000000000104'::uuid;

select public.schedule_application_payment_reminder(
  '00000000-0000-0000-0000-000000000101'::uuid,
  'initial-payment-reminder:00000000-0000-0000-0000-000000000104:3',
  'reminder@example.test',
  'Reminder Test',
  3,
  'https://wageflow.test'
);

select public.archive_unpaid_application('00000000-0000-0000-0000-000000000101'::uuid);

do $$
begin
  if (select status from public.email_outbox where idempotency_key = 'initial-payment-reminder:00000000-0000-0000-0000-000000000104:3') <> 'cancelled' then
    raise exception 'queued reminder was not cancelled by archival';
  end if;
  if (select count(*) from public.application_payment_attempts where initial_payment_id='00000000-0000-0000-0000-000000000104'::uuid and status in ('created','initialized','pending')) <> 0 then
    raise exception 'archival left a live payment attempt';
  end if;
end $$;
