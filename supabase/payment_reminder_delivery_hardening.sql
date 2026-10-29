-- Forward-only: prevent archived applications from sending stale Paystack links.
-- Apply after payment_reminder_scheduling_hardening.sql.
begin;

alter table public.email_outbox drop constraint if exists email_outbox_status_check;
alter table public.email_outbox add constraint email_outbox_status_check
  check (status in ('queued','processing','delivered','retryable_failure','permanently_failed','cancelled'));

create or replace function public.can_deliver_application_payment_email(outbox_id_input uuid, worker_claim uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1
    from public.email_outbox o
    join public.wageflow_setup_requests a on a.id = o.application_id
    join public.application_initial_payments p on p.id = o.initial_payment_id
    join public.application_payment_attempts pa
      on pa.initial_payment_id = p.id
     and pa.payment_link_token_hash = encode(extensions.digest(split_part(o.payload->>'paymentUrl', '/pay/', 2), 'sha256'), 'hex')
    where o.id = outbox_id_input
      and o.claim_token = worker_claim
      and o.status = 'processing'
      and o.event_type in ('initial_payment_request', 'initial_payment_reminder')
      and a.lifecycle_status = 'awaiting_initial_payment'
      and p.status in ('awaiting_payment', 'payment_pending')
      and pa.status in ('created', 'initialized', 'pending')
      and pa.expires_at > now()
  );
$$;

create or replace function public.cancel_email_outbox(outbox_id_input uuid, worker_claim uuid, cancellation_reason text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.email_outbox
     set status = 'cancelled',
         last_error = left(coalesce(cancellation_reason, 'Email is no longer eligible for delivery.'), 500),
         claim_token = null,
         claimed_at = null,
         lease_expires_at = null,
         updated_at = now()
   where id = outbox_id_input
     and status = 'processing'
     and claim_token = worker_claim;
  return found;
end $$;

create or replace function public.archive_unpaid_application(application_id_input uuid)
returns text language plpgsql security definer set search_path = public as $$
declare payment public.application_initial_payments%rowtype; application public.wageflow_setup_requests%rowtype;
begin
  select * into application from public.wageflow_setup_requests where id=application_id_input for update;
  if not found then return 'not_found'; end if;
  select * into payment from public.application_initial_payments where application_id=application.id for update;
  if application.lifecycle_status <> 'awaiting_initial_payment' or payment.status not in ('awaiting_payment','payment_pending') then return 'not_eligible'; end if;
  update public.application_payment_attempts set status='expired',revoked_at=now() where initial_payment_id=payment.id and status in ('created','initialized','pending');
  update public.email_outbox
     set status='cancelled', last_error='Application payment window archived.', updated_at=now()
   where application_id=application.id
     and event_type in ('initial_payment_request','initial_payment_reminder')
     and status in ('queued','retryable_failure');
  update public.wageflow_setup_requests set lifecycle_status='archived',status='Archived',archived_at=now() where id=application.id;
  insert into public.master_audit_log(entity_type,entity_id,action) values ('wageflow_setup_request',application.id,'initial_payment_archived');
  return 'archived';
end $$;

revoke all on function public.can_deliver_application_payment_email(uuid,uuid) from public,anon,authenticated;
revoke all on function public.cancel_email_outbox(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.archive_unpaid_application(uuid) from public,anon,authenticated;
grant execute on function public.can_deliver_application_payment_email(uuid,uuid) to service_role;
grant execute on function public.cancel_email_outbox(uuid,uuid,text) to service_role;
grant execute on function public.archive_unpaid_application(uuid) to service_role;
commit;
