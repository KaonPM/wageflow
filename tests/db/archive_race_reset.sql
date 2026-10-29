update public.wageflow_setup_requests
set lifecycle_status = 'awaiting_initial_payment', status = 'Payment Pending', archived_at = null
where id = '00000000-0000-0000-0000-000000000101'::uuid;

update public.application_initial_payments
set status = 'awaiting_payment'
where id = '00000000-0000-0000-0000-000000000104'::uuid;
