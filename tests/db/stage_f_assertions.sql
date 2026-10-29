-- Run only in the disposable Stage F database after reminder_concurrency_seed.sql.
do $$
declare claimed public.email_outbox%rowtype; attempt_hash text;
begin
  if to_regprocedure('extensions.gen_random_bytes(integer)') is null
     or to_regprocedure('extensions.digest(text,text)') is null then
    raise exception 'Qualified pgcrypto functions are missing';
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.email_outbox'::regclass
    and conname='email_outbox_status_check' and pg_get_constraintdef(oid) like '%cancelled%') then
    raise exception 'Outbox cancelled status is not allowed';
  end if;
  if not (
    has_function_privilege('service_role','public.issue_application_payment_replacement(uuid)','EXECUTE')
    and has_function_privilege('service_role','public.schedule_application_payment_reminder(uuid,text,text,text,integer,text)','EXECUTE')
    and has_function_privilege('service_role','public.can_deliver_application_payment_email(uuid,uuid)','EXECUTE')
    and has_function_privilege('service_role','public.cancel_email_outbox(uuid,uuid,text)','EXECUTE')
    and has_function_privilege('service_role','public.archive_unpaid_application(uuid)','EXECUTE')
  ) then raise exception 'Service role lacks a required RPC grant'; end if;
  if has_function_privilege('anon','public.issue_application_payment_replacement(uuid)','EXECUTE')
     or has_function_privilege('authenticated','public.schedule_application_payment_reminder(uuid,text,text,text,integer,text)','EXECUTE')
     or has_function_privilege('anon','public.can_deliver_application_payment_email(uuid,uuid)','EXECUTE')
     or has_function_privilege('authenticated','public.cancel_email_outbox(uuid,uuid,text)','EXECUTE')
     or has_function_privilege('anon','public.archive_unpaid_application(uuid)','EXECUTE') then
    raise exception 'Unprivileged role can execute a protected RPC';
  end if;

  select * into claimed from public.claim_email_outbox(25,300)
    where idempotency_key='initial-payment-reminder:00000000-0000-0000-0000-000000000104:1';
  if not found then raise exception 'Reminder was not claimed'; end if;
  attempt_hash := encode(extensions.digest(split_part(claimed.payload->>'paymentUrl','/pay/',2),'sha256'),'hex');
  if not exists(select 1 from public.application_payment_attempts where payment_link_token_hash=attempt_hash and status='created') then
    raise exception 'Queued token does not match its live payment attempt';
  end if;
  if not public.can_deliver_application_payment_email(claimed.id,claimed.claim_token) then
    raise exception 'Valid claimed reminder was rejected';
  end if;
  if public.cancel_email_outbox(claimed.id,gen_random_uuid(),'Wrong worker') then
    raise exception 'Wrong claim cancelled an outbox row';
  end if;
  if not public.cancel_email_outbox(claimed.id,claimed.claim_token,'Test cancellation') then
    raise exception 'Owning worker could not cancel';
  end if;
  if public.finish_email_outbox(claimed.id,claimed.claim_token,true,0,null) then
    raise exception 'Cancelled row was completed';
  end if;
end $$;

do $$
begin
  if public.schedule_application_payment_reminder(
    '00000000-0000-0000-0000-000000000101',
    'initial-payment-reminder:00000000-0000-0000-0000-000000000104:1',
    'reminder@example.test','Reminder Test',1,'https://wageflow.test') then
    raise exception 'Duplicate logical reminder was scheduled';
  end if;
  if (select count(*) from public.email_outbox where idempotency_key=
    'initial-payment-reminder:00000000-0000-0000-0000-000000000104:1') <> 1 then
    raise exception 'Duplicate reminder outbox rows exist';
  end if;
end $$;
