-- Run in the disposable fixture database after concurrent.sh.
do $$
declare race_attempt uuid;
declare fallback_attempt uuid;
declare claimed boolean;
begin
  select id into race_attempt from public.subscription_auto_charge_attempts
    where provider_reference='wf-race-one';
  if not public.finish_subscription_auto_charge(race_attempt,
    '00000000-0000-0000-0000-000000000008','failed') then raise exception 'Race claim could not be released'; end if;
  insert into public.subscription_statements values (
    '00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002','monthly','2027-01-01',199,'pending',
    null,null,null,null,null,null,null);
  select attempt_id into fallback_attempt from public.claim_subscription_auto_charge(
    '00000000-0000-0000-0000-000000000010','wf-fallback',
    '00000000-0000-0000-0000-000000000011','test');
  if fallback_attempt is null then raise exception 'Fallback claim missing'; end if;
  if not public.finish_subscription_auto_charge(fallback_attempt,
    '00000000-0000-0000-0000-000000000011','failed') then raise exception 'Fallback failure not recorded'; end if;
  select public.release_failed_auto_charge_for_manual(
    '00000000-0000-0000-0000-000000000010') into claimed;
  if claimed is not true then raise exception 'Manual fallback not released'; end if;
  if exists (select 1 from public.subscription_auto_payment_methods
    where subscription_id='00000000-0000-0000-0000-000000000003'
      and (revoked_at is null or authorization_ciphertext<>'')) then raise exception 'Mandate not revoked'; end if;
  if exists (select 1 from public.subscription_statements
    where id='00000000-0000-0000-0000-000000000010'
      and (payment_reference is not null or payment_initialized_at is not null))
    then raise exception 'Manual checkout not cleared'; end if;
  if exists (select 1 from public.claim_subscription_auto_charge(
    '00000000-0000-0000-0000-000000000010','wf-should-not-charge',
    '00000000-0000-0000-0000-000000000012','test')) then raise exception 'Revoked mandate charged'; end if;
end $$;
