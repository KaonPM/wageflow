-- Disposable database only, after Stage F migrations and reminder_concurrency_seed.sql.
-- Run with -v operation=schedule, archive, or payment in a fresh database for each case.
create extension if not exists dblink;
select set_config('stage_f.operation', :'operation', false);

create or replace function public.stage_f_pause_attempt_update()
returns trigger language plpgsql as $$
begin
  perform pg_advisory_xact_lock(91726029);
  return new;
end $$;
create trigger stage_f_pause_attempt_update
before update on public.application_payment_attempts
for each row when (old.status in ('created','initialized','pending'))
execute function public.stage_f_pause_attempt_update();

create or replace function public.stage_f_primary_lifecycle(operation text)
returns text language plpgsql as $$
declare result text; attempt_id uuid;
begin
  if operation='schedule' then
    return public.schedule_application_payment_reminder(
      '00000000-0000-0000-0000-000000000101','stage-f-primary-reminder',
      'reminder@example.test','Reminder Test',1,'https://wageflow.test')::text;
  elsif operation='archive' then
    return public.archive_unpaid_application('00000000-0000-0000-0000-000000000101');
  elsif operation='payment' then
    select id into attempt_id from public.application_payment_attempts
      where initial_payment_id='00000000-0000-0000-0000-000000000104'
        and status in ('created','initialized','pending') limit 1;
    result:=public.complete_application_payment(
      attempt_id,'stage-f-deterministic-payment',44800,'ZAR',now());
    return result;
  end if;
  raise exception 'Unknown lifecycle test operation';
end $$;

do $$
declare
  operation text := current_setting('stage_f.operation');
  connection text := 'dbname='||current_database()||' user=postgres';
  waiting boolean; primary_result text; secondary_result boolean;
begin
  if operation not in ('schedule','archive','payment') then raise exception 'Invalid test operation'; end if;
  perform dblink_connect('stage_f_guard',connection||' application_name=stage_f_guard');
  perform dblink_connect('stage_f_primary',connection||' application_name=stage_f_primary');
  perform dblink_connect('stage_f_secondary',connection||' application_name=stage_f_secondary');
  perform dblink_exec('stage_f_guard',
    'do $guard$ begin perform pg_advisory_lock(91726029); end $guard$;');
  perform dblink_send_query('stage_f_primary',
    format('select public.stage_f_primary_lifecycle(%L)',operation));
  waiting:=false;
  for i in 1..1000 loop
    select exists(select 1 from pg_stat_activity
      where application_name='stage_f_primary' and wait_event_type='Lock'
        and wait_event='advisory') into waiting;
    exit when waiting;
    perform pg_sleep(0.01);
  end loop;
  if not waiting then raise exception 'Primary did not reach the attempt-update barrier'; end if;

  perform dblink_send_query('stage_f_secondary',
    'select public.schedule_application_payment_reminder(''00000000-0000-0000-0000-000000000101'',''stage-f-primary-reminder'',''reminder@example.test'',''Reminder Test'',1,''https://wageflow.test'')');
  waiting:=false;
  for i in 1..1000 loop
    select exists(select 1 from pg_stat_activity
      where application_name='stage_f_secondary' and wait_event_type='Lock') into waiting;
    exit when waiting;
    perform pg_sleep(0.01);
  end loop;
  if not waiting then raise exception 'Secondary scheduler did not wait on the lifecycle lock'; end if;

  perform dblink_exec('stage_f_guard',
    'do $guard$ begin perform pg_advisory_unlock(91726029); end $guard$;');
  select result into primary_result from dblink_get_result('stage_f_primary') as t(result text);
  perform * from dblink_get_result('stage_f_primary') as t(result text);
  select result into secondary_result from dblink_get_result('stage_f_secondary') as t(result boolean);
  perform * from dblink_get_result('stage_f_secondary') as t(result boolean);

  if operation='schedule' then
    if primary_result<>'true' or secondary_result is distinct from false then
      raise exception 'Duplicate concurrent schedulers did not serialize';
    end if;
    if (select count(*) from public.application_payment_attempts
      where initial_payment_id='00000000-0000-0000-0000-000000000104'
        and status in ('created','initialized','pending'))<>1 then
      raise exception 'Concurrent schedulers left an invalid live-attempt count';
    end if;
    if (select count(*) from public.email_outbox
      where idempotency_key='stage-f-primary-reminder')<>1 then
      raise exception 'Duplicate schedulers created more than one email';
    end if;
  elsif operation='archive' then
    if primary_result<>'archived' or secondary_result is distinct from false then
      raise exception 'Archive did not block later scheduling';
    end if;
    if (select lifecycle_status from public.wageflow_setup_requests
      where id='00000000-0000-0000-0000-000000000101')<>'archived' then
      raise exception 'Archive race left incorrect lifecycle state';
    end if;
  elsif operation='payment' then
    if primary_result<>'verified' or secondary_result is distinct from false then
      raise exception 'Payment completion did not block later scheduling';
    end if;
    if (select lifecycle_status from public.wageflow_setup_requests
      where id='00000000-0000-0000-0000-000000000101')<>'payment_verified' then
      raise exception 'Payment race left incorrect lifecycle state';
    end if;
  end if;
  perform dblink_disconnect('stage_f_secondary');
  perform dblink_disconnect('stage_f_primary');
  perform dblink_disconnect('stage_f_guard');
end $$;

drop trigger stage_f_pause_attempt_update on public.application_payment_attempts;
drop function public.stage_f_pause_attempt_update();
drop function public.stage_f_primary_lifecycle(text);
