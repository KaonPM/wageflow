begin;

create table if not exists public.master_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists master_audit_log_created_at_idx on public.master_audit_log (created_at desc);
create index if not exists master_audit_log_entity_idx on public.master_audit_log (entity_type, entity_id);

create table if not exists public.notification_delivery_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  channel text not null default 'push',
  event_type text not null,
  recipient_count integer not null default 0,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists notification_delivery_log_created_at_idx on public.notification_delivery_log (created_at desc);
alter table public.notification_delivery_log enable row level security;
drop policy if exists notification_delivery_log_master_read on public.notification_delivery_log;
create policy notification_delivery_log_master_read on public.notification_delivery_log
for select to authenticated using (public.is_wageflow_master());

alter table public.master_audit_log enable row level security;
drop policy if exists master_audit_log_master_read on public.master_audit_log;
create policy master_audit_log_master_read on public.master_audit_log
for select to authenticated using (public.is_wageflow_master());

create or replace function public.log_master_audit_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.master_audit_log (actor_id, entity_type, entity_id, action, before_data, after_data)
  values (
    auth.uid(),
    tg_table_name,
    coalesce(new.id, old.id),
    lower(tg_op),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_profiles_changes on public.profiles;
create trigger audit_profiles_changes after update on public.profiles
for each row when (old.role is distinct from new.role or old.business_id is distinct from new.business_id or old.access_status is distinct from new.access_status)
execute function public.log_master_audit_event();

drop trigger if exists audit_subscriptions_changes on public.subscriptions;
create trigger audit_subscriptions_changes after update on public.subscriptions
for each row when (old.plan_name is distinct from new.plan_name or old.monthly_fee is distinct from new.monthly_fee or old.setup_fee is distinct from new.setup_fee or old.subscription_status is distinct from new.subscription_status)
execute function public.log_master_audit_event();

create or replace function public.protect_last_active_master()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if lower(coalesce(old.role, '')) in ('master', 'master_admin')
       and lower(coalesce(old.access_status, 'active')) in ('active', 'approved')
       and (select count(*) from public.profiles where lower(coalesce(role, '')) in ('master', 'master_admin') and lower(coalesce(access_status, 'active')) in ('active', 'approved')) <= 1 then
      raise exception 'At least one active Master admin must remain.';
    end if;
    return old;
  end if;

  if lower(coalesce(old.role, '')) in ('master', 'master_admin')
     and lower(coalesce(old.access_status, 'active')) in ('active', 'approved')
     and not (lower(coalesce(new.role, '')) in ('master', 'master_admin') and lower(coalesce(new.access_status, 'active')) in ('active', 'approved'))
     and (select count(*) from public.profiles where lower(coalesce(role, '')) in ('master', 'master_admin') and lower(coalesce(access_status, 'active')) in ('active', 'approved')) <= 1 then
    raise exception 'At least one active Master admin must remain.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_last_master_removal on public.profiles;
create trigger prevent_last_master_removal before update or delete on public.profiles
for each row execute function public.protect_last_active_master();

commit;
