-- Forward-only webhook reconciliation hardening. Apply only after the payment activation migrations.
begin;

alter table public.payment_webhook_events
  add column if not exists processing_attempt_count integer not null default 0,
  add column if not exists next_retry_at timestamptz,
  add column if not exists processing_claim uuid,
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_lease_expires_at timestamptz,
  add column if not exists manual_review_required_at timestamptz;
create index if not exists payment_webhook_events_retry_idx
  on public.payment_webhook_events(processed_at, manual_review_required_at, next_retry_at, processing_lease_expires_at);

create or replace function public.claim_failed_payment_webhook_events(max_rows integer default 25, lease_seconds integer default 300)
returns setof public.payment_webhook_events language plpgsql security definer set search_path=public as $$
begin
  return query
  with eligible as (
    select id from public.payment_webhook_events
    where processed_at is null
      and processing_error is not null
      and manual_review_required_at is null
      and (next_retry_at is null or next_retry_at <= now())
      and (processing_claim is null or processing_lease_expires_at <= now())
    order by coalesce(next_retry_at, received_at), received_at
    for update skip locked
    limit greatest(1,least(max_rows,100))
  )
  update public.payment_webhook_events event set
    processing_attempt_count=event.processing_attempt_count+1,
    processing_claim=gen_random_uuid(),
    processing_started_at=now(),
    processing_lease_expires_at=now()+make_interval(secs => greatest(30,least(lease_seconds,3600))),
    processing_error=null
  from eligible where event.id=eligible.id returning event.*;
end $$;

create or replace function public.finish_failed_payment_webhook_event(event_id_input uuid, claim_input uuid, processed boolean, retry_after_seconds integer default 0, error_detail text default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare event_row public.payment_webhook_events%rowtype; terminal boolean;
begin
  select * into event_row from public.payment_webhook_events where id=event_id_input and processed_at is null and processing_claim=claim_input for update;
  if not found then return false; end if;
  terminal := not processed and event_row.processing_attempt_count >= 4;
  update public.payment_webhook_events set
    processed_at=case when processed then now() else null end,
    processing_error=case when processed then null else left(coalesce(error_detail,'Webhook reconciliation failed.'),500) end,
    next_retry_at=case when processed or terminal then null else now()+make_interval(secs => greatest(60,retry_after_seconds)) end,
    processing_claim=null,
    processing_started_at=null,
    processing_lease_expires_at=null,
    manual_review_required_at=case when terminal then now() else manual_review_required_at end
  where id=event_row.id;
  if terminal then
    insert into public.master_audit_log(entity_type,entity_id,action,after_data)
    values('payment_webhook_event',event_row.id,'paystack_webhook_manual_recovery_required',jsonb_build_object('provider_reference',event_row.provider_reference));
  end if;
  return true;
end $$;

revoke all on function public.claim_failed_payment_webhook_events(integer,integer) from public,anon,authenticated;
revoke all on function public.finish_failed_payment_webhook_event(uuid,uuid,boolean,integer,text) from public,anon,authenticated;
commit;
