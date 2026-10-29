-- Apply after paystack_recurring_checkout_claim_hardening.sql.
-- Qualify statement columns that collide with RETURNS TABLE output names.
begin;

create or replace function public.claim_subscription_statement_checkout(
  statement_id_input uuid,
  reference_input text,
  claim_input uuid,
  lease_seconds integer default 120
) returns table (
  outcome text,
  id uuid,
  business_id uuid,
  amount numeric,
  recipient_email text,
  payment_reference text
) language plpgsql security definer set search_path=public as $$
declare statement_row public.subscription_statements%rowtype;
begin
  select s.* into statement_row
  from public.subscription_statements as s
  where s.id=statement_id_input
  for update;
  if not found then return; end if;

  if statement_row.paid_at is not null or statement_row.status in ('paid','emailed') then
    return query select 'paid'::text, statement_row.id, statement_row.business_id, statement_row.amount, statement_row.recipient_email, statement_row.payment_reference;
    return;
  end if;
  if statement_row.amount <= 0 or statement_row.recipient_email is null then
    return query select 'unavailable'::text, statement_row.id, statement_row.business_id, statement_row.amount, statement_row.recipient_email, statement_row.payment_reference;
    return;
  end if;
  if statement_row.payment_initialized_at is not null and statement_row.payment_reference is not null then
    return query select 'already_initialized'::text, statement_row.id, statement_row.business_id, statement_row.amount, statement_row.recipient_email, statement_row.payment_reference;
    return;
  end if;
  if statement_row.payment_initialization_claim is not null and statement_row.payment_initialization_lease_expires_at > now() then
    return query select 'initializing'::text, statement_row.id, statement_row.business_id, statement_row.amount, statement_row.recipient_email, statement_row.payment_reference;
    return;
  end if;

  -- Retain the reference if a prior Paystack request may have succeeded.
  update public.subscription_statements as s set
    payment_provider='paystack',
    payment_reference=coalesce(statement_row.payment_reference, left(reference_input,120)),
    payment_initialization_claim=claim_input,
    payment_initialization_claimed_at=now(),
    payment_initialization_lease_expires_at=now()+make_interval(secs => greatest(30,least(lease_seconds,600)))
  where s.id=statement_row.id;

  return query select 'claimed'::text, statement_row.id, statement_row.business_id, statement_row.amount, statement_row.recipient_email, coalesce(statement_row.payment_reference, left(reference_input,120));
end $$;

revoke all on function public.claim_subscription_statement_checkout(uuid,text,uuid,integer) from public,anon,authenticated;
grant execute on function public.claim_subscription_statement_checkout(uuid,text,uuid,integer) to service_role;
commit;
