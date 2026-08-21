-- Employer-admin roles and scoped permissions. Run once in the Supabase SQL editor.
begin;

alter table public.profiles add column if not exists admin_permissions jsonb not null default '[]'::jsonb;
alter table public.employer_business_memberships drop constraint if exists employer_business_memberships_role_check;
alter table public.employer_business_memberships add constraint employer_business_memberships_role_check check (membership_role in ('owner', 'admin', 'payroll_admin', 'hr_manager', 'viewer'));

create or replace function public.has_employer_permission(permission_name text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and lower(role) = 'employer_admin'
      and coalesce(lower(access_status), 'active') in ('active', 'approved')
      and admin_permissions ? permission_name
  )
$$;

revoke all on function public.has_employer_permission(text) from public;
grant execute on function public.has_employer_permission(text) to authenticated;

-- Existing owner policies remain unchanged. These additive policies grant admins only
-- the business data needed by each selected feature.
drop policy if exists businesses_admin_read on public.businesses;
drop policy if exists businesses_admin_settings_update on public.businesses;
create policy businesses_admin_read on public.businesses for select to authenticated using (public.is_business_member(id));
create policy businesses_admin_settings_update on public.businesses for update to authenticated using (public.is_business_member(id) and public.has_employer_permission('settings')) with check (public.is_business_member(id) and public.has_employer_permission('settings'));

do $$
declare item record;
begin
  for item in select * from (values
    ('employees', 'employees'), ('payroll_runs', 'payroll'), ('payslips', 'payslips'),
    ('employee_documents', 'hr'), ('disciplinary_records', 'hr'), ('hr_notes', 'hr'),
    ('approval_requests', 'hr'), ('payslip_notifications', 'payslips'),
    ('business_settings', 'settings')
  ) as x(table_name, permission_name)
  loop
    if to_regclass('public.' || item.table_name) is not null then
      execute format('drop policy if exists %I on public.%I', item.table_name || '_admin_manage', item.table_name);
      execute format('create policy %I on public.%I for all to authenticated using (public.is_business_member(business_id) and public.has_employer_permission(%L)) with check (public.is_business_member(business_id) and public.has_employer_permission(%L))', item.table_name || '_admin_manage', item.table_name, item.permission_name, item.permission_name);
    end if;
  end loop;
end $$;

drop policy if exists subscriptions_admin_read on public.subscriptions;
create policy subscriptions_admin_read on public.subscriptions for select to authenticated using (public.is_business_member(business_id));

commit;
