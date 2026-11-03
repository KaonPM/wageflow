-- Apply after signup_billing_checkout_recovery.sql and paystack_webhook_and_recurring_hardening.sql.
-- No existing subscription is enrolled. A verified, reusable card and explicit
-- employer consent are required before any automatic charge can be claimed.
begin;

create table public.subscription_auto_payment_methods (
  subscription_id uuid primary key references public.subscriptions(id),
  business_id uuid not null references public.businesses(id),
  authorization_ciphertext text not null,
  authorization_email text not null,
  authorized_plan text not null,
  authorized_amount numeric(12,2) not null check (authorized_amount>0),
  paystack_mode text not null check (paystack_mode in ('test','live')),
  card_brand text not null,
  card_last4 text not null check (card_last4 ~ '^[0-9]{4}$'),
  consented_by uuid not null references auth.users(id),
  consented_at timestamptz not null default now(),
  revoked_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.subscription_auto_payment_methods enable row level security;
revoke all on public.subscription_auto_payment_methods from public, anon, authenticated;
grant select, insert, update on public.subscription_auto_payment_methods to service_role;

create table public.subscription_auto_charge_attempts (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id),
  statement_id uuid not null references public.subscription_statements(id),
  business_id uuid not null references public.businesses(id),
  attempt_no integer not null check (attempt_no between 1 and 4),
  provider_reference text not null unique,
  status text not null check (status in ('claimed','pending','failed','succeeded','review')),
  claim_token uuid,
  lease_expires_at timestamptz,
  next_action_at timestamptz not null default now(),
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (statement_id, attempt_no)
);
create unique index subscription_auto_charge_one_active
  on public.subscription_auto_charge_attempts(subscription_id)
  where status in ('claimed','pending','review');
create index subscription_auto_charge_due_idx
  on public.subscription_auto_charge_attempts(status,next_action_at);
alter table public.subscription_auto_charge_attempts enable row level security;
revoke all on public.subscription_auto_charge_attempts from public, anon, authenticated;
grant select on public.subscription_auto_charge_attempts to service_role;

create or replace function public.set_subscription_auto_payment_method(
  subscription_id_input uuid, business_id_input uuid, actor_input uuid,
  ciphertext_input text, email_input text, brand_input text, last4_input text, mode_input text
) returns boolean language plpgsql security definer set search_path='' as $$
declare sub public.subscriptions%rowtype;
begin
  select * into sub from public.subscriptions where id=subscription_id_input for update;
  if not found or sub.business_id<>business_id_input or sub.subscription_status<>'active'
     or sub.plan_name not in ('Starter','Growth') or sub.monthly_fee<=0
     or not exists (select 1 from public.employer_business_memberships m
       where m.employer_id=actor_input and m.business_id=business_id_input and m.is_active=true)
     or ciphertext_input is null or length(ciphertext_input)>4096
     or email_input is null or length(email_input)>320 or last4_input !~ '^[0-9]{4}$'
     or brand_input is null or length(brand_input)>40 then return false; end if;
  if mode_input is null or mode_input not in ('test','live') then return false; end if;
  if exists (select 1 from public.subscription_auto_charge_attempts a
    where a.subscription_id=sub.id and a.status in ('claimed','pending','review')) then return false; end if;
  insert into public.subscription_auto_payment_methods
    (subscription_id,business_id,authorization_ciphertext,authorization_email,authorized_plan,authorized_amount,
     paystack_mode,card_brand,card_last4,consented_by,consented_at,revoked_at)
  values (sub.id,business_id_input,ciphertext_input,email_input,sub.plan_name,sub.monthly_fee,
    mode_input,brand_input,last4_input,actor_input,now(),null)
  on conflict (subscription_id) do update set
    authorization_ciphertext=excluded.authorization_ciphertext,
    authorization_email=excluded.authorization_email,card_brand=excluded.card_brand,
    authorized_plan=excluded.authorized_plan,authorized_amount=excluded.authorized_amount,
    paystack_mode=excluded.paystack_mode,
    card_last4=excluded.card_last4,consented_by=excluded.consented_by,
    consented_at=now(),revoked_at=null,updated_at=now();
  return true;
end $$;

create or replace function public.revoke_subscription_auto_payment_method(
  subscription_id_input uuid, business_id_input uuid
) returns boolean language plpgsql security definer set search_path='' as $$
begin
  update public.subscription_auto_payment_methods
  set revoked_at=coalesce(revoked_at,now()),authorization_ciphertext='',updated_at=now()
  where subscription_id=subscription_id_input and business_id=business_id_input;
  return found;
end $$;

create or replace function public.claim_subscription_auto_charge(
  statement_id_input uuid, reference_input text, claim_input uuid, mode_input text
) returns table (
  outcome text, attempt_id uuid, charge_reference text, charge_amount numeric,
  authorization_ciphertext text, authorization_email text, attempt_number integer,
  attempt_created_at timestamptz
) language plpgsql security definer set search_path='' as $$
declare stmt public.subscription_statements%rowtype;
declare sub public.subscriptions%rowtype;
declare active_business boolean;
declare method public.subscription_auto_payment_methods%rowtype;
declare prior public.subscription_auto_charge_attempts%rowtype;
declare next_no integer;
declare new_id uuid;
begin
  select * into stmt from public.subscription_statements where id=statement_id_input for update;
  if not found or stmt.statement_type<>'monthly' or stmt.paid_at is not null or stmt.amount<=0 then return; end if;
  -- Reconcile a charge already sent to Paystack even if the plan, business,
  -- mandate, or deployment mode changed after the attempt began.
  select * into prior from public.subscription_auto_charge_attempts
    where statement_id=stmt.id order by attempt_no desc limit 1 for update;
  if prior.id is not null and prior.status in ('claimed','pending','review') then
    if prior.next_action_at>now()
       or (prior.status='claimed' and prior.lease_expires_at>now()) then return; end if;
    update public.subscription_auto_charge_attempts set
      status='claimed',claim_token=claim_input,lease_expires_at=now()+interval '5 minutes',updated_at=now()
    where id=prior.id;
    select * into method from public.subscription_auto_payment_methods
      where subscription_id=stmt.subscription_id and business_id=stmt.business_id for update;
    return query select 'reconcile'::text,prior.id,prior.provider_reference,stmt.amount,
      coalesce(method.authorization_ciphertext,''),coalesce(method.authorization_email,''),prior.attempt_no,prior.created_at;
    return;
  end if;
  select * into sub from public.subscriptions where id=stmt.subscription_id for update;
  if not found or sub.business_id<>stmt.business_id or sub.subscription_status<>'active'
     or sub.plan_name not in ('Starter','Growth') or sub.monthly_fee<>stmt.amount then return; end if;
  select lower(b.status)='active' into active_business from public.businesses b
    where b.id=stmt.business_id for update;
  if active_business is not true then return; end if;
  if exists (select 1 from public.application_initial_payments p where p.subscription_id=sub.id
             and p.covered_month=stmt.statement_month and p.status='verified') then return; end if;
  select * into method from public.subscription_auto_payment_methods
    where subscription_id=sub.id and business_id=stmt.business_id and revoked_at is null for update;
  if not found then return; end if;
  if mode_input is null or method.paystack_mode<>mode_input or method.authorized_plan<>sub.plan_name
    or method.authorized_amount<stmt.amount then return; end if;
  if prior.id is not null and (prior.status='succeeded' or prior.attempt_no>=4 or prior.next_action_at>now()) then return; end if;
  if stmt.payment_initialization_claim is not null and stmt.payment_initialization_lease_expires_at>now() then return; end if;
  if stmt.payment_reference is not null and (prior.id is null or stmt.payment_reference<>prior.provider_reference) then return; end if;
  if exists (select 1 from public.subscription_auto_charge_attempts a where a.subscription_id=sub.id
             and a.statement_id<>stmt.id and a.status in ('claimed','pending','review')) then return; end if;
  next_no:=coalesce(prior.attempt_no,0)+1;
  insert into public.subscription_auto_charge_attempts
    (subscription_id,statement_id,business_id,attempt_no,provider_reference,status,claim_token,lease_expires_at)
  values (sub.id,stmt.id,stmt.business_id,next_no,reference_input,'claimed',claim_input,now()+interval '5 minutes')
  returning id into new_id;
  update public.subscription_statements set payment_provider='paystack',payment_reference=reference_input,
    payment_initialized_at=now(),payment_authorization_url=null where id=stmt.id;
  return query select 'charge'::text,new_id,reference_input,stmt.amount,
    method.authorization_ciphertext,method.authorization_email,next_no,now();
end $$;

create or replace function public.finish_subscription_auto_charge(
  attempt_id_input uuid, claim_input uuid, result_input text
) returns boolean language plpgsql security definer set search_path='' as $$
declare a public.subscription_auto_charge_attempts%rowtype;
declare paid boolean;
declare related_statement uuid;
begin
  if result_input not in ('succeeded','failed','pending','review') then return false; end if;
  select statement_id into related_statement from public.subscription_auto_charge_attempts where id=attempt_id_input;
  if related_statement is null then return false; end if;
  select paid_at is not null into paid from public.subscription_statements where id=related_statement for update;
  select * into a from public.subscription_auto_charge_attempts
    where id=attempt_id_input and claim_token=claim_input and status='claimed' for update;
  if not found then return false; end if;
  if result_input='succeeded' and not paid then return false; end if;
  if paid and result_input<>'succeeded' then return false; end if;
  update public.subscription_auto_charge_attempts set status=result_input,
    claim_token=null,lease_expires_at=null,updated_at=now(),
    next_action_at=case when result_input='failed' then
      now()+make_interval(days=>case a.attempt_no when 1 then 1 when 2 then 2 when 3 then 4 else 0 end)
      when result_input='pending' then now()+interval '1 hour'
      when result_input='review' then now()+interval '1 day' else now() end
  where id=a.id;
  return true;
end $$;

-- Both the return route and webhook use the existing verified completion RPC.
-- Reflect either path in the attempt ledger in the same database transaction.
create or replace function public.mark_successful_subscription_auto_charge()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.paid_at is not null and old.paid_at is null then
    update public.subscription_auto_charge_attempts set status='succeeded',claim_token=null,
      lease_expires_at=null,updated_at=now()
    where statement_id=new.id and provider_reference=new.payment_reference;
  end if;
  return new;
end $$;
revoke all on function public.mark_successful_subscription_auto_charge() from public,anon,authenticated;
create trigger mark_successful_subscription_auto_charge
after update of paid_at on public.subscription_statements
for each row execute function public.mark_successful_subscription_auto_charge();

-- The employer may move to manual checkout only after a confirmed failed charge.
-- An uncertain charge remains locked for reconciliation to avoid double billing.
create or replace function public.release_failed_auto_charge_for_manual(statement_id_input uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare stmt public.subscription_statements%rowtype;
declare prior public.subscription_auto_charge_attempts%rowtype;
begin
  select * into stmt from public.subscription_statements where id=statement_id_input for update;
  if not found or stmt.paid_at is not null then return false; end if;
  select * into prior from public.subscription_auto_charge_attempts where statement_id=stmt.id
    order by attempt_no desc limit 1 for update;
  if not found or prior.status<>'failed' or stmt.payment_reference<>prior.provider_reference then return false; end if;
  update public.subscription_auto_payment_methods set revoked_at=coalesce(revoked_at,now()),
    authorization_ciphertext='',updated_at=now() where subscription_id=stmt.subscription_id;
  update public.subscription_statements set payment_reference=null,payment_initialized_at=null,
    payment_authorization_url=null where id=stmt.id;
  return true;
end $$;

create or replace function public.can_deliver_monthly_payment_email(outbox_id_input uuid, worker_claim uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare item public.email_outbox%rowtype;
begin
  select * into item from public.email_outbox where id=outbox_id_input
    and claim_token=worker_claim and status='processing' for update;
  if not found or item.event_type not in ('monthly_payment_due','monthly_payment_retry','monthly_payment_action_required')
     or coalesce(item.payload->>'statementId','') !~ '^[0-9a-f-]{36}$' then return false; end if;
  return exists (
    select 1 from public.subscription_statements s join public.businesses b on b.id=s.business_id
    where s.id=(item.payload->>'statementId')::uuid and s.business_id=(item.payload->>'businessId')::uuid
      and s.paid_at is null and lower(b.email)=lower(item.recipient_email)
  );
end $$;

revoke all on function public.set_subscription_auto_payment_method(uuid,uuid,uuid,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.revoke_subscription_auto_payment_method(uuid,uuid) from public,anon,authenticated;
revoke all on function public.claim_subscription_auto_charge(uuid,text,uuid,text) from public,anon,authenticated;
revoke all on function public.finish_subscription_auto_charge(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.release_failed_auto_charge_for_manual(uuid) from public,anon,authenticated;
revoke all on function public.can_deliver_monthly_payment_email(uuid,uuid) from public,anon,authenticated;
grant execute on function public.set_subscription_auto_payment_method(uuid,uuid,uuid,text,text,text,text,text) to service_role;
grant execute on function public.revoke_subscription_auto_payment_method(uuid,uuid) to service_role;
grant execute on function public.claim_subscription_auto_charge(uuid,text,uuid,text) to service_role;
grant execute on function public.finish_subscription_auto_charge(uuid,uuid,text) to service_role;
grant execute on function public.release_failed_auto_charge_for_manual(uuid) to service_role;
grant execute on function public.can_deliver_monthly_payment_email(uuid,uuid) to service_role;
commit;
