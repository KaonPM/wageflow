-- Apply after application_payment_activation.sql, payment_lifecycle_lock_order_hardening.sql,
-- employer_onboarding_outbox_hardening.sql, paystack_recurring_checkout_claim_hardening.sql,
-- and paystack_recurring_checkout_claim_ambiguity_fix.sql.
-- Existing paid signup rows are not rewritten. Review cross-month activations separately.
begin;

alter table public.subscription_statements
  add column if not exists payment_authorization_url text;

-- Only the current claimant can save the Paystack checkout URL. The URL and
-- initialized state become visible together, so a return visit can reopen it.
create or replace function public.finalize_subscription_statement_checkout_url(
  statement_id_input uuid, claim_input uuid, authorization_url_input text
) returns boolean language plpgsql security definer set search_path=public as $$
declare statement_row public.subscription_statements%rowtype;
begin
  if authorization_url_input is null or authorization_url_input !~ '^https://' or length(authorization_url_input) > 4096 then
    raise exception 'Invalid checkout URL';
  end if;
  select s.* into statement_row from public.subscription_statements as s
  where s.id=statement_id_input and s.payment_initialization_claim=claim_input for update;
  if not found or statement_row.paid_at is not null or statement_row.status in ('paid','emailed')
    or statement_row.payment_initialized_at is not null then return false; end if;
  update public.subscription_statements as s set
    payment_authorization_url=authorization_url_input,
    payment_initialized_at=now(),
    payment_initialization_claim=null,
    payment_initialization_claimed_at=null,
    payment_initialization_lease_expires_at=null
  where s.id=statement_row.id;
  return true;
end $$;

revoke all on function public.finalize_subscription_statement_checkout_url(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.finalize_subscription_statement_checkout_url(uuid,uuid,text) to service_role;

-- The first monthly charge begins in the month the paid business activates.
-- This runs inside activate_verified_application's transaction, after it has
-- locked the application and payment and while the subscription becomes active.
create or replace function public.align_signup_covered_month_on_activation()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.lifecycle_status='activated' and old.lifecycle_status is distinct from new.lifecycle_status then
    update public.application_initial_payments as p
    set covered_month=date_trunc('month', now() at time zone 'UTC')::date, updated_at=now()
    where p.application_id=new.id and p.status='verified';
  end if;
  return new;
end $$;

revoke all on function public.align_signup_covered_month_on_activation() from public,anon,authenticated;
drop trigger if exists align_signup_covered_month_on_activation on public.wageflow_setup_requests;
create trigger align_signup_covered_month_on_activation
after update of lifecycle_status on public.wageflow_setup_requests
for each row execute function public.align_signup_covered_month_on_activation();

-- Freeze the price accepted by a pending signup payment. Activation may still
-- update subscription_status and setup_paid without changing the agreed price.
create or replace function public.prevent_pending_signup_price_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.plan_name is distinct from new.plan_name
    or old.monthly_fee is distinct from new.monthly_fee
    or old.setup_fee is distinct from new.setup_fee then
    if exists (
      select 1 from public.application_initial_payments as p
      join public.wageflow_setup_requests as a on a.id=p.application_id
      where p.subscription_id=old.id
        and a.lifecycle_status in ('awaiting_initial_payment','payment_verified')
        and p.status in ('awaiting_payment','payment_pending','verified')
    ) then
      raise exception 'Signup payment terms are locked until activation or resolution';
    end if;
  end if;
  return new;
end $$;

revoke all on function public.prevent_pending_signup_price_change() from public,anon,authenticated;
drop trigger if exists prevent_pending_signup_price_change on public.subscriptions;
create trigger prevent_pending_signup_price_change
before update of plan_name,monthly_fee,setup_fee on public.subscriptions
for each row execute function public.prevent_pending_signup_price_change();

commit;
