-- Disposable database only. The old worker must not finish a reclaimed email.
begin;
do $$
declare first_claim public.email_outbox%rowtype; second_claim public.email_outbox%rowtype;
begin
  insert into public.email_outbox(idempotency_key,event_type,recipient_email,payload)
    values('stage-f-lease-recovery','lease_recovery_test','test@example.test','{}');
  select * into first_claim from public.claim_email_outbox(25,30)
    where idempotency_key='stage-f-lease-recovery';
  if not found then raise exception 'First worker did not claim test email'; end if;
  update public.email_outbox set lease_expires_at=now()-interval '1 second'
    where id=first_claim.id;
  select * into second_claim from public.claim_email_outbox(25,30)
    where id=first_claim.id;
  if not found or second_claim.claim_token=first_claim.claim_token then
    raise exception 'Expired lease was not reclaimed with a new token';
  end if;
  if public.finish_email_outbox(first_claim.id,first_claim.claim_token,true,0,null) then
    raise exception 'Old worker completed a reclaimed email';
  end if;
  if not public.finish_email_outbox(second_claim.id,second_claim.claim_token,true,0,null) then
    raise exception 'New worker could not complete reclaimed email';
  end if;
end $$;
rollback;
