-- Forward-only Stage C onboarding delivery hardening. Validate in an isolated database first.
begin;

create table if not exists public.application_employer_onboarding (
  application_id uuid primary key references public.wageflow_setup_requests(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  employer_id uuid,
  status text not null default 'pending' check (status in ('pending','provisioning','provisioned','password_setup_queued','password_setup_delivered','manual_recovery_required','ineligible')),
  provisioning_claim uuid,
  provisioning_lease_expires_at timestamptz,
  provisioned_at timestamptz,
  password_setup_queued_at timestamptz,
  password_setup_delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists application_employer_onboarding_status_idx on public.application_employer_onboarding(status, provisioning_lease_expires_at);
alter table public.application_employer_onboarding enable row level security;

create or replace function public.claim_application_employer_onboarding(application_id_input uuid, business_id_input uuid, worker_claim uuid, lease_seconds integer default 300)
returns public.application_employer_onboarding language plpgsql security definer set search_path = public as $$
declare application public.wageflow_setup_requests%rowtype; payment public.application_initial_payments%rowtype; business public.businesses%rowtype; subscription public.subscriptions%rowtype; onboarding public.application_employer_onboarding%rowtype;
begin
  select * into application from public.wageflow_setup_requests where id=application_id_input for update;
  select * into payment from public.application_initial_payments where application_id=application_id_input for update;
  select * into business from public.businesses where id=business_id_input for update;
  select * into subscription from public.subscriptions where id=payment.subscription_id for update;
  if application.id is null or payment.id is null or business.id is null or subscription.id is null or payment.business_id <> business_id_input or application.lifecycle_status <> 'activated' or payment.status <> 'verified' or lower(coalesce(business.status,'')) <> 'active' or lower(coalesce(subscription.subscription_status,'')) <> 'active' then
    insert into public.application_employer_onboarding(application_id,business_id,status,last_error)
    values(application_id_input,business_id_input,'ineligible','Activation eligibility changed before employer provisioning.')
    on conflict(application_id) do update set status='ineligible',last_error='Activation eligibility changed before employer provisioning.',updated_at=now();
    insert into public.master_audit_log(entity_type,entity_id,action,after_data) values('wageflow_setup_request',application_id_input,'employer_onboarding_ineligible',jsonb_build_object('business_id',business_id_input));
    select * into onboarding from public.application_employer_onboarding where application_id=application_id_input;
    return onboarding;
  end if;
  insert into public.application_employer_onboarding(application_id,business_id) values(application_id_input,business_id_input) on conflict(application_id) do nothing;
  select * into onboarding from public.application_employer_onboarding where application_id=application_id_input for update;
  if onboarding.business_id <> business_id_input or onboarding.status in ('password_setup_delivered','manual_recovery_required','ineligible') then return onboarding; end if;
  if onboarding.status='provisioning' and onboarding.provisioning_claim is distinct from worker_claim and onboarding.provisioning_lease_expires_at > now() then return onboarding; end if;
  update public.application_employer_onboarding set status='provisioning',provisioning_claim=worker_claim,provisioning_lease_expires_at=now()+make_interval(secs => greatest(30,least(lease_seconds,3600))),last_error=null,updated_at=now() where application_id=application_id_input returning * into onboarding;
  return onboarding;
end $$;

create or replace function public.complete_application_employer_onboarding(application_id_input uuid, worker_claim uuid, employer_id_input uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.application_employer_onboarding set employer_id=employer_id_input,status='provisioned',provisioned_at=coalesce(provisioned_at,now()),provisioning_claim=null,provisioning_lease_expires_at=null,last_error=null,updated_at=now()
  where application_id=application_id_input and status='provisioning' and provisioning_claim=worker_claim;
  if found then insert into public.master_audit_log(entity_type,entity_id,action,after_data) values('wageflow_setup_request',application_id_input,'employer_onboarding_provisioned',jsonb_build_object('employer_id',employer_id_input)); end if;
  return found;
end $$;

create or replace function public.queue_application_employer_password_setup(application_id_input uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.application_employer_onboarding set status='password_setup_queued',password_setup_queued_at=coalesce(password_setup_queued_at,now()),updated_at=now()
  where application_id=application_id_input and status in ('provisioned','password_setup_queued','password_setup_delivered','manual_recovery_required');
  return found;
end $$;

create or replace function public.finish_employer_password_setup_email(outbox_id uuid, claim uuid, delivered boolean, retry_after_seconds integer default 0, error_detail text default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare outbox public.email_outbox%rowtype; terminal_failure boolean;
begin
  select * into outbox from public.email_outbox where id=outbox_id and status='processing' and claim_token=claim and event_type='employer_password_setup' for update;
  if not found then return false; end if;
  terminal_failure := not delivered and outbox.attempt_count >= 4;
  update public.email_outbox set status=case when delivered then 'delivered' when terminal_failure then 'permanently_failed' else 'retryable_failure' end,delivered_at=case when delivered then now() else delivered_at end,next_attempt_at=case when delivered or terminal_failure then next_attempt_at else now()+make_interval(secs => greatest(60,retry_after_seconds)) end,last_error=case when delivered then null else left(error_detail,500) end,claim_token=null,claimed_at=null,lease_expires_at=null,updated_at=now() where id=outbox.id;
  if delivered then
    update public.application_employer_onboarding set status='password_setup_delivered',password_setup_delivered_at=now(),last_error=null,updated_at=now() where application_id=outbox.application_id;
    insert into public.master_audit_log(entity_type,entity_id,action) values('wageflow_setup_request',outbox.application_id,'employer_password_setup_delivered');
  elsif terminal_failure then
    update public.application_employer_onboarding set status='manual_recovery_required',last_error=left(error_detail,500),updated_at=now() where application_id=outbox.application_id;
    insert into public.master_audit_log(entity_type,entity_id,action) values('wageflow_setup_request',outbox.application_id,'employer_password_setup_manual_recovery_required');
  end if;
  return true;
end $$;

create or replace function public.fail_application_employer_onboarding(application_id_input uuid, worker_claim uuid, error_detail text, requires_manual_recovery boolean default false)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.application_employer_onboarding set status=case when requires_manual_recovery then 'manual_recovery_required' else 'provisioning' end,provisioning_claim=case when requires_manual_recovery then null else provisioning_claim end,provisioning_lease_expires_at=case when requires_manual_recovery then null else provisioning_lease_expires_at end,last_error=left(error_detail,500),updated_at=now()
  where application_id=application_id_input and provisioning_claim=worker_claim;
  if found and requires_manual_recovery then insert into public.master_audit_log(entity_type,entity_id,action) values('wageflow_setup_request',application_id_input,'employer_onboarding_manual_recovery_required'); end if;
  return found;
end $$;

create or replace function public.activate_verified_application(application_id_input uuid, actor uuid, decision_reason text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare application public.wageflow_setup_requests%rowtype; payment public.application_initial_payments%rowtype;
begin
  if not exists(select 1 from public.profiles where id=actor and lower(role) in ('master','master_admin') and coalesce(lower(access_status),'active') in ('active','approved')) then raise exception 'Not authorised'; end if;
  select * into application from public.wageflow_setup_requests where id=application_id_input for update;
  if not found then raise exception 'Application not found'; end if;
  select * into payment from public.application_initial_payments where application_id=application.id for update;
  if application.lifecycle_status <> 'payment_verified' or payment.status <> 'verified' then raise exception 'Application is not eligible for activation'; end if;
  update public.businesses set status='active' where id=payment.business_id;
  update public.subscriptions set subscription_status='active',setup_paid=true where id=payment.subscription_id;
  update public.wageflow_setup_requests set lifecycle_status='activated',status='Approved',approved_at=now(),final_reviewed_at=now(),final_reviewed_by=actor,activation_decision_reason=left(decision_reason,500) where id=application.id;
  insert into public.application_employer_onboarding(application_id,business_id,status) values(application.id,payment.business_id,'pending') on conflict(application_id) do nothing;
  insert into public.master_audit_log(actor_id,entity_type,entity_id,action,after_data) values(actor,'wageflow_setup_request',application.id,'final_activation_approved',jsonb_build_object('business_id',payment.business_id,'subscription_id',payment.subscription_id));
  insert into public.email_outbox(idempotency_key,event_type,recipient_email,application_id,initial_payment_id,payload) values ('activation-credentials:'||application.id,'activation_credentials',application.email,application.id,payment.id,jsonb_build_object('business_id',payment.business_id)) on conflict (idempotency_key) do nothing;
  return payment.business_id;
end $$;

revoke all on table public.application_employer_onboarding from public,anon,authenticated;
revoke all on function public.claim_application_employer_onboarding(uuid,uuid,uuid,integer) from public,anon,authenticated;
revoke all on function public.complete_application_employer_onboarding(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.queue_application_employer_password_setup(uuid) from public,anon,authenticated;
revoke all on function public.finish_employer_password_setup_email(uuid,uuid,boolean,integer,text) from public,anon,authenticated;
revoke all on function public.fail_application_employer_onboarding(uuid,uuid,text,boolean) from public,anon,authenticated;
revoke all on function public.activate_verified_application(uuid,uuid,text) from public,anon,authenticated;
commit;
