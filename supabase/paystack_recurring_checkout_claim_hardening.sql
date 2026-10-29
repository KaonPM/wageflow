-- Forward-only recurring Paystack checkout reservation. Apply after paystack_billing.sql.
begin;

alter table public.subscription_statements
  add column if not exists payment_initialization_claim uuid,
  add column if not exists payment_initialization_claimed_at timestamptz,
  add column if not exists payment_initialization_lease_expires_at timestamptz;

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
  select * into statement_row from public.subscription_statements where id=statement_id_input for update;
  if not found then return; end if;

  if statement_row.paid_at is not null or statement_row.status in ('paid','emailed') then
    return query select 'paid', statement_row.id, statement_row.business_id, statement_row.amount, statement_row.recipient_email, statement_row.payment_reference;
    return;
  end if;
  if statement_row.amount <= 0 or statement_row.recipient_email is null then
    return query select 'unavailable', statement_row.id, statement_row.business_id, statement_row.amount, statement_row.recipient_email, statement_row.payment_reference;
    return;
  end if;
  if statement_row.payment_initialized_at is not null and statement_row.payment_reference is not null then
    return query select 'already_initialized', statement_row.id, statement_row.business_id, statement_row.amount, statement_row.recipient_email, statement_row.payment_reference;
    return;
  end if;
  if statement_row.payment_initialization_claim is not null and statement_row.payment_initialization_lease_expires_at > now() then
    return query select 'initializing', statement_row.id, statement_row.business_id, statement_row.amount, statement_row.recipient_email, statement_row.payment_reference;
    return;
  end if;

  -- A retry must retain the original reference. It may have reached Paystack even if
  -- the initiating request timed out, so a later request must never replace it.
  update public.subscription_statements set
    payment_provider='paystack',
    payment_reference=coalesce(statement_row.payment_reference, left(reference_input,120)),
    payment_initialization_claim=claim_input,
    payment_initialization_claimed_at=now(),
    payment_initialization_lease_expires_at=now()+make_interval(secs => greatest(30,least(lease_seconds,600)))
  where id=statement_row.id;

  return query select 'claimed', statement_row.id, statement_row.business_id, statement_row.amount, statement_row.recipient_email, coalesce(statement_row.payment_reference, left(reference_input,120));
end $$;

create or replace function public.finish_subscription_statement_checkout_claim(
  statement_id_input uuid,
  claim_input uuid,
  initialized boolean
) returns boolean language plpgsql security definer set search_path=public as $$
declare statement_row public.subscription_statements%rowtype;
begin
  select * into statement_row from public.subscription_statements
  where id=statement_id_input and payment_initialization_claim=claim_input for update;
  if not found or statement_row.paid_at is not null then return false; end if;

  update public.subscription_statements set
    payment_initialized_at=case when initialized then now() else payment_initialized_at end,
    payment_initialization_claim=null,
    payment_initialization_claimed_at=null,
    payment_initialization_lease_expires_at=null
  where id=statement_row.id;
  return true;
end $$;

revoke all on function public.claim_subscription_statement_checkout(uuid,text,uuid,integer) from public,anon,authenticated;
revoke all on function public.finish_subscription_statement_checkout_claim(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.claim_subscription_statement_checkout(uuid,text,uuid,integer) to service_role;
grant execute on function public.finish_subscription_statement_checkout_claim(uuid,uuid,boolean) to service_role;
commit;
