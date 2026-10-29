-- Run with stage_f_payment_session_b.sql in a second session, disposable DB only.
begin;
select public.complete_application_payment(
  (select id from public.application_payment_attempts where initial_payment_id='00000000-0000-0000-0000-000000000104'::uuid order by created_at limit 1),
  'stage-f-disposable-provider-transaction',44800,'ZAR',now()
);
select pg_sleep(5);
commit;
