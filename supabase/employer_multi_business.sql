begin;

create table if not exists public.employer_business_memberships (
  employer_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  membership_role text not null default 'owner',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (employer_id, business_id),
  constraint employer_business_memberships_role_check
    check (membership_role in ('owner', 'payroll_admin', 'hr_manager', 'viewer'))
);

insert into public.employer_business_memberships (employer_id, business_id, membership_role)
select b.employer_id, b.id, 'owner'
from public.businesses b
join public.profiles p on p.id = b.employer_id and lower(p.role) = 'employer'
where b.employer_id is not null
on conflict (employer_id, business_id) do update set is_active = true;

insert into public.employer_business_memberships (employer_id, business_id, membership_role)
select p.id, p.business_id, 'owner'
from public.profiles p
where lower(p.role) = 'employer' and p.business_id is not null
on conflict (employer_id, business_id) do update set is_active = true;

alter table public.employer_business_memberships enable row level security;
drop policy if exists employer_memberships_self_read on public.employer_business_memberships;
create policy employer_memberships_self_read
on public.employer_business_memberships for select to authenticated
using (employer_id = auth.uid() or public.is_wageflow_master());

create or replace function public.is_business_member(target_business_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.employer_business_memberships
    where employer_id = auth.uid()
      and business_id = target_business_id
      and is_active is true
  )
$$;

revoke all on function public.is_business_member(uuid) from public;
grant execute on function public.is_business_member(uuid) to authenticated;

drop policy if exists businesses_select on public.businesses;
create policy businesses_select on public.businesses for select to authenticated
using (
  public.is_wageflow_master()
  or public.is_business_member(id)
  or employer_id = auth.uid()
  or id = public.current_business_id()
);

commit;
