select public.schedule_application_payment_reminder(
  '00000000-0000-0000-0000-000000000101'::uuid,
  'initial-payment-reminder:00000000-0000-0000-0000-000000000104:1',
  'reminder@example.test',
  'Reminder Test',
  1,
  'https://wageflow.test'
);
