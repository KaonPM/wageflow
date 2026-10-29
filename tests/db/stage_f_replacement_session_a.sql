-- Run with stage_f_replacement_session_b.sql in a second session, disposable DB only.
begin;
do $$ begin
  perform * from public.issue_application_payment_replacement('00000000-0000-0000-0000-000000000101'::uuid);
end $$;
select pg_sleep(5);
commit;
