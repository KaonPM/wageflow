select pg_sleep(1);
select public.schedule_application_payment_reminder(
  '00000000-0000-0000-0000-000000000101'::uuid,
  'initial-payment-reminder:00000000-0000-0000-0000-000000000104:5',
  'reminder@example.test','Reminder Test',5,'https://wageflow.test'
);
