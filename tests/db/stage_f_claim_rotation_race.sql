-- Disposable database only, after the Stage F migrations and reminder_concurrency_seed.sql.
-- Run with -v operation=replacement or -v operation=reminder.
create extension if not exists dblink;
select set_config('stage_f.operation', :'operation', false);

create or replace function public.stage_f_pause_attempt_update()
returns trigger language plpgsql as $$
begin
  perform pg_advisory_xact_lock(91726028);
  return new;
end $$;
create trigger stage_f_pause_attempt_update
before update on public.application_payment_attempts
for each row when (old.status in ('created','initialized','pending'))
execute function public.stage_f_pause_attempt_update();

create or replace function public.stage_f_try_rotation(operation text, reminder_key text)
returns text language plpgsql as $$
begin
  if operation='replacement' then
    begin
      perform * from public.issue_application_payment_replacement('00000000-0000-0000-0000-000000000101');
      return 'rotated';
    exception when others then
      if sqlerrm='Payment email delivery is in progress' then return 'blocked'; end if;
      raise;
    end;
  elsif operation='reminder' then
    if public.schedule_application_payment_reminder(
      '00000000-0000-0000-0000-000000000101',reminder_key,
      'reminder@example.test','Reminder Test',9,'https://wageflow.test')
    then return 'rotated'; end if;
    return 'blocked';
  end if;
  raise exception 'Unknown test operation';
end $$;

do $$
declare
  operation text := current_setting('stage_f.operation');
  connection text := 'dbname='||current_database()||' user=postgres';
  waiting boolean;
  claimed integer;
  outcome text;
  claimed_id uuid;
  claimed_token uuid;
  seeded boolean;
begin
  if operation not in ('replacement','reminder') then raise exception 'Invalid test operation'; end if;
  perform dblink_connect('stage_f_guard',connection||' application_name=stage_f_guard');
  perform dblink_connect('stage_f_rotator',connection||' application_name=stage_f_rotator');
  perform dblink_connect('stage_f_claimer',connection||' application_name=stage_f_claimer');
  select result into seeded from dblink('stage_f_rotator',
    'select public.schedule_application_payment_reminder(''00000000-0000-0000-0000-000000000101'',''stage-f-race-baseline-one'',''reminder@example.test'',''Reminder Test'',8,''https://wageflow.test'')')
    as t(result boolean);
  if seeded is distinct from true then raise exception 'Could not seed baseline reminder'; end if;

  -- Rotation first: pause after it has locked the attempt and outbox, then try to claim.
  perform dblink_exec('stage_f_guard',
    'do $guard$ begin perform pg_advisory_lock(91726028); end $guard$;');
  perform dblink_send_query('stage_f_rotator',
    format('select public.stage_f_try_rotation(%L,%L)',operation,'stage-f-race-after-first'));
  waiting:=false;
  for i in 1..1000 loop
    select exists(select 1 from pg_stat_activity
      where application_name='stage_f_rotator'
        and wait_event_type='Lock' and wait_event='advisory') into waiting;
    exit when waiting;
    perform pg_sleep(0.01);
  end loop;
  if not waiting then raise exception 'Rotator did not reach the attempt-update barrier'; end if;

  select n into claimed from dblink('stage_f_claimer',
    'select count(*)::integer from public.claim_email_outbox(25,300)') as t(n integer);
  if claimed <> 0 then raise exception 'Claimer took an outbox row locked by rotation'; end if;
  perform dblink_exec('stage_f_guard',
    'do $guard$ begin perform pg_advisory_unlock(91726028); end $guard$;');
  select result into outcome from dblink_get_result('stage_f_rotator') as t(result text);
  perform * from dblink_get_result('stage_f_rotator') as t(result text);
  if outcome <> 'rotated' then raise exception 'Rotation did not complete after its lock was released'; end if;
  if (select status from public.email_outbox where idempotency_key='stage-f-race-baseline-one') <> 'cancelled' then
    raise exception 'Rotation left the earlier queued email available';
  end if;

  -- Claim first: keep its transaction open while rotation waits for the outbox row.
  select result into seeded from dblink('stage_f_rotator',
    'select public.schedule_application_payment_reminder(''00000000-0000-0000-0000-000000000101'',''stage-f-race-baseline-two'',''reminder@example.test'',''Reminder Test'',10,''https://wageflow.test'')')
    as t(result boolean);
  if seeded is distinct from true then raise exception 'Could not seed second baseline reminder'; end if;
  perform dblink_exec('stage_f_claimer','begin');
  select id,claim_token into claimed_id,claimed_token
    from dblink('stage_f_claimer',
      'select id,claim_token from public.claim_email_outbox(25,300) where idempotency_key=''stage-f-race-baseline-two''')
      as t(id uuid,claim_token uuid);
  if claimed_id is null then raise exception 'Claimer did not obtain the second baseline'; end if;
  perform dblink_send_query('stage_f_rotator',
    format('select public.stage_f_try_rotation(%L,%L)',operation,'stage-f-race-after-second'));
  waiting:=false;
  for i in 1..1000 loop
    select exists(select 1 from pg_stat_activity
      where application_name='stage_f_rotator' and wait_event_type='Lock') into waiting;
    exit when waiting;
    perform pg_sleep(0.01);
  end loop;
  if not waiting then raise exception 'Rotator did not wait for the claim transaction'; end if;
  perform dblink_exec('stage_f_claimer','commit');
  select result into outcome from dblink_get_result('stage_f_rotator') as t(result text);
  perform * from dblink_get_result('stage_f_rotator') as t(result text);
  if outcome <> 'blocked' then raise exception 'Rotation invalidated an active delivery claim'; end if;
  if not public.can_deliver_application_payment_email(claimed_id,claimed_token) then
    raise exception 'Claim-first reminder lost its valid payment attempt';
  end if;
  if not public.cancel_email_outbox(claimed_id,claimed_token,'Disposable test cleanup') then
    raise exception 'Claim owner could not cancel the disposable job';
  end if;

  perform dblink_disconnect('stage_f_claimer');
  perform dblink_disconnect('stage_f_rotator');
  perform dblink_disconnect('stage_f_guard');
end $$;

drop trigger stage_f_pause_attempt_update on public.application_payment_attempts;
drop function public.stage_f_pause_attempt_update();
drop function public.stage_f_try_rotation(text,text);
