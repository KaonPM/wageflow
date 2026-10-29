-- Run with stage_f_archive_session_b.sql in a second session, disposable DB only.
begin;
select public.archive_unpaid_application('00000000-0000-0000-0000-000000000101'::uuid);
select pg_sleep(5);
commit;
