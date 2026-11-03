-- Run after fixture and automatic_monthly_billing.sql in a disposable database.
do $$
declare r record;
declare claimed boolean;
declare first_id uuid;
begin
  select public.set_subscription_auto_payment_method(
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'encrypted-test-value','payer@example.test','Visa','1234','test') into claimed;
  if claimed is not true then raise exception 'Enrollment failed'; end if;
  if exists (select 1 from public.claim_subscription_auto_charge(
    '00000000-0000-0000-0000-000000000004','wf-wrong-mode',
    '00000000-0000-0000-0000-000000000005','live')) then raise exception 'Cross-mode charge allowed'; end if;
  select * into r from public.claim_subscription_auto_charge(
    '00000000-0000-0000-0000-000000000004','wf-first',
    '00000000-0000-0000-0000-000000000005','test');
  if r.outcome <> 'charge' or r.charge_reference <> 'wf-first' then raise exception 'First claim failed'; end if;
  first_id:=r.attempt_id;
  if exists (select 1 from public.claim_subscription_auto_charge(
    '00000000-0000-0000-0000-000000000004','wf-competing',
    '00000000-0000-0000-0000-000000000006','test')) then raise exception 'Competing claim succeeded'; end if;
  if public.set_subscription_auto_payment_method(
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'replacement','payer@example.test','Visa','1234','test')
    then raise exception 'Active charge mandate was replaced'; end if;
  if not public.finish_subscription_auto_charge(r.attempt_id,
    '00000000-0000-0000-0000-000000000005','failed') then raise exception 'Finish failed'; end if;
  if exists (select 1 from public.claim_subscription_auto_charge(
    '00000000-0000-0000-0000-000000000004','wf-too-early',
    '00000000-0000-0000-0000-000000000006','test')) then raise exception 'Backoff not enforced'; end if;
  update public.subscription_auto_charge_attempts set next_action_at=now()-interval '1 minute' where id=r.attempt_id;
  select * into r from public.claim_subscription_auto_charge(
    '00000000-0000-0000-0000-000000000004','wf-second',
    '00000000-0000-0000-0000-000000000006','test');
  if r.outcome<>'charge' or r.charge_reference<>'wf-second' or r.attempt_number<>2
    then raise exception 'Retry reference wrong'; end if;
  if public.finish_subscription_auto_charge(first_id,
    '00000000-0000-0000-0000-000000000005','succeeded') then raise exception 'Stale claim finished'; end if;
  update public.subscription_statements set paid_at=now(),status='paid'
    where id='00000000-0000-0000-0000-000000000004';
  if not exists (select 1 from public.subscription_auto_charge_attempts
    where provider_reference='wf-second' and status='succeeded') then raise exception 'Webhook completion trigger failed'; end if;
  update public.subscriptions set monthly_fee=249 where id='00000000-0000-0000-0000-000000000003';
  insert into public.subscription_statements values (
    '00000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002','monthly','2027-02-01',249,'pending',
    null,null,null,null,null,null,null);
  if exists (select 1 from public.claim_subscription_auto_charge(
    '00000000-0000-0000-0000-000000000013','wf-price-increase',
    '00000000-0000-0000-0000-000000000014','test')) then raise exception 'Unconsented price increase charged'; end if;
  update public.subscriptions set monthly_fee=199 where id='00000000-0000-0000-0000-000000000003';
end $$;

select proname, has_function_privilege('service_role',oid,'EXECUTE') as service_role,
  has_function_privilege('anon',oid,'EXECUTE') as anon,
  has_function_privilege('authenticated',oid,'EXECUTE') as authenticated
from pg_proc where proname in ('claim_subscription_auto_charge','finish_subscription_auto_charge',
  'set_subscription_auto_payment_method','revoke_subscription_auto_payment_method',
  'release_failed_auto_charge_for_manual','can_deliver_monthly_payment_email')
order by proname;
