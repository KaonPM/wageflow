-- Forward-only Stage C hardening. Validate against an isolated database before deployment.
begin;

alter table public.email_outbox
  add column if not exists claim_token uuid,
  add column if not exists claimed_at timestamptz,
  add column if not exists lease_expires_at timestamptz;
create index if not exists email_outbox_claim_idx on public.email_outbox(status, lease_expires_at, next_attempt_at);

create or replace function public.claim_email_outbox(max_rows integer default 25, lease_seconds integer default 300)
returns setof public.email_outbox language plpgsql security definer set search_path = public as $$
begin
  return query
  with eligible as (
    select id from public.email_outbox
    where (status in ('queued','retryable_failure') and next_attempt_at <= now())
       or (status='processing' and lease_expires_at <= now())
    order by next_attempt_at, created_at
    for update skip locked limit greatest(1, least(max_rows, 100))
  )
  update public.email_outbox o set status='processing',attempt_count=o.attempt_count+1,claim_token=gen_random_uuid(),claimed_at=now(),lease_expires_at=now()+make_interval(secs => greatest(30,least(lease_seconds,3600))),updated_at=now()
  from eligible where o.id=eligible.id returning o.*;
end $$;

create or replace function public.finish_email_outbox(outbox_id uuid, claim uuid, delivered boolean, retry_after_seconds integer default 0, error_detail text default null)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.email_outbox set
    status=case when delivered then 'delivered' when attempt_count >= 4 then 'permanently_failed' else 'retryable_failure' end,
    delivered_at=case when delivered then now() else delivered_at end,
    next_attempt_at=case when delivered or attempt_count >= 4 then next_attempt_at else now()+make_interval(secs => greatest(60,retry_after_seconds)) end,
    last_error=case when delivered then null else left(error_detail,500) end,
    claim_token=null,claimed_at=null,lease_expires_at=null,updated_at=now()
  where id=outbox_id and status='processing' and claim_token=claim;
  return found;
end $$;
revoke all on function public.claim_email_outbox(integer,integer) from public,anon,authenticated;
revoke all on function public.finish_email_outbox(uuid,uuid,boolean,integer,text) from public,anon,authenticated;
commit;
