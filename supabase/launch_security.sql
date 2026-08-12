-- WageFlow launch security migration
-- Uses profiles.business_id and businesses.employer_id (there is no owner_id).
-- Run once in the Supabase SQL editor, then run launch_security_verify.sql.
begin;

-- Remove legacy policies first. PostgreSQL ORs permissive policies together,
-- so an older broad policy would otherwise weaken the reviewed policy set.
do $$
declare policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles','businesses','employees','employee_accounts','payroll_runs','payslips','employee_documents','disciplinary_records','hr_notes','approval_requests','payslip_notifications','business_settings','subscriptions','wageflow_setup_requests','contact_enquiries')
  loop
    execute format('drop policy if exists %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;

  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (lower(policyname) like '%employee document%' or lower(policyname) like '%contract file%' or policyname like 'employee_documents_storage_%')
  loop
    execute format('drop policy if exists %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
end $$;

create or replace function public.current_business_id()
returns uuid language sql stable security definer set search_path = public
as $$ select business_id from public.profiles where id = auth.uid() $$;

create or replace function public.is_wageflow_master()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and lower(role) in ('master','master_admin') and coalesce(lower(access_status), 'active') in ('active','approved')) $$;

create or replace function public.is_current_employer()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and lower(role) = 'employer' and coalesce(lower(access_status), 'active') in ('active','approved')) $$;

create or replace function public.current_employee_id()
returns uuid language sql stable security definer set search_path = public
as $$ select employee_id from public.employee_accounts where auth_user_id = auth.uid() and portal_enabled is true limit 1 $$;

revoke all on function public.current_business_id() from public;
revoke all on function public.is_wageflow_master() from public;
revoke all on function public.is_current_employer() from public;
revoke all on function public.current_employee_id() from public;
grant execute on function public.current_business_id(), public.is_wageflow_master(), public.is_current_employer(), public.current_employee_id() to authenticated;

alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_wageflow_master());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid() or public.is_wageflow_master()) with check (id = auth.uid() or public.is_wageflow_master());

create or replace function public.protect_profile_authorisation_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' and not public.is_wageflow_master() and (new.role is distinct from old.role or new.business_id is distinct from old.business_id or new.access_status is distinct from old.access_status) then
    raise exception 'Authorisation fields may only be changed by a WageFlow administrator';
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_authorisation_fields on public.profiles;
create trigger protect_profile_authorisation_fields before update on public.profiles for each row execute function public.protect_profile_authorisation_fields();

alter table public.businesses enable row level security;
drop policy if exists businesses_select on public.businesses;
drop policy if exists businesses_insert on public.businesses;
drop policy if exists businesses_update on public.businesses;
create policy businesses_select on public.businesses for select to authenticated using (public.is_wageflow_master() or employer_id = auth.uid() or id = public.current_business_id());
create policy businesses_insert on public.businesses for insert to authenticated with check (public.is_wageflow_master() or (public.is_current_employer() and employer_id = auth.uid()));
create policy businesses_update on public.businesses for update to authenticated using (public.is_wageflow_master() or (public.is_current_employer() and (employer_id = auth.uid() or id = public.current_business_id()))) with check (public.is_wageflow_master() or (public.is_current_employer() and (employer_id = auth.uid() or id = public.current_business_id())));

do $$
declare table_name text;
begin
  foreach table_name in array array['employees','payroll_runs','payslips','employee_documents','disciplinary_records','hr_notes','approval_requests','payslip_notifications','business_settings','subscriptions'] loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('drop policy if exists %I on public.%I', table_name || '_business_manage', table_name);
      execute format('create policy %I on public.%I for all to authenticated using (public.is_wageflow_master() or (public.is_current_employer() and business_id = public.current_business_id())) with check (public.is_wageflow_master() or (public.is_current_employer() and business_id = public.current_business_id()))', table_name || '_business_manage', table_name);
    end if;
  end loop;
end $$;

-- An employee row uses id; child records use employee_id.
drop policy if exists employees_employee_read on public.employees;
create policy employees_employee_read on public.employees for select to authenticated using (id = public.current_employee_id());

-- Employees may read only their own employee-scoped child records.
do $$
declare table_name text;
begin
  foreach table_name in array array['payslips','employee_documents','disciplinary_records','hr_notes','approval_requests','payslip_notifications'] loop
    if to_regclass('public.' || table_name) is not null then
      execute format('drop policy if exists %I on public.%I', table_name || '_employee_read', table_name);
      execute format('create policy %I on public.%I for select to authenticated using (employee_id = public.current_employee_id())', table_name || '_employee_read', table_name);
    end if;
  end loop;
end $$;

alter table public.employee_accounts enable row level security;
drop policy if exists employee_accounts_self_read on public.employee_accounts;
drop policy if exists employee_accounts_self_update on public.employee_accounts;
create policy employee_accounts_self_read on public.employee_accounts for select to authenticated using (auth_user_id = auth.uid() or public.is_wageflow_master());
create policy employee_accounts_self_update on public.employee_accounts for update to authenticated using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());
create or replace function public.protect_employee_account_link()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' and not public.is_wageflow_master() and (new.auth_user_id is distinct from old.auth_user_id or new.employee_id is distinct from old.employee_id or new.portal_enabled is distinct from old.portal_enabled) then
    raise exception 'Employee account linkage may only be changed by a WageFlow administrator';
  end if;
  return new;
end $$;
drop trigger if exists protect_employee_account_link on public.employee_accounts;
create trigger protect_employee_account_link before update on public.employee_accounts for each row execute function public.protect_employee_account_link();

-- Employee portal writes used by the existing application.
drop policy if exists approval_requests_employee_insert on public.approval_requests;
drop policy if exists approval_requests_employee_update on public.approval_requests;
create policy approval_requests_employee_insert on public.approval_requests for insert to authenticated with check (employee_id = public.current_employee_id() and business_id = public.current_business_id());
create policy approval_requests_employee_update on public.approval_requests for update to authenticated using (employee_id = public.current_employee_id()) with check (employee_id = public.current_employee_id() and business_id = public.current_business_id());

drop policy if exists payslips_employee_update on public.payslips;
create policy payslips_employee_update on public.payslips for update to authenticated using (employee_id = public.current_employee_id()) with check (employee_id = public.current_employee_id());
create or replace function public.protect_employee_payslip_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_wageflow_master() and new.business_id is distinct from public.current_business_id() and new.employee_id = public.current_employee_id() then raise exception 'Access denied'; end if;
  if new.employee_id = public.current_employee_id() and (to_jsonb(new) - array['viewed_at','downloaded_at','received_confirmed','received_confirmed_at','status']) is distinct from (to_jsonb(old) - array['viewed_at','downloaded_at','received_confirmed','received_confirmed_at','status']) then raise exception 'Employees may only update payslip receipt fields'; end if;
  if new.employee_id = public.current_employee_id() and new.status is distinct from old.status and new.status <> 'received_confirmed' then raise exception 'Invalid employee payslip status'; end if;
  return new;
end $$;
drop trigger if exists protect_employee_payslip_fields on public.payslips;
create trigger protect_employee_payslip_fields before update on public.payslips for each row execute function public.protect_employee_payslip_fields();

drop policy if exists payslip_notifications_employee_update on public.payslip_notifications;
drop policy if exists payslip_notifications_employee_insert on public.payslip_notifications;
create policy payslip_notifications_employee_insert on public.payslip_notifications for insert to authenticated with check (employee_id = public.current_employee_id() and business_id = public.current_business_id());
create policy payslip_notifications_employee_update on public.payslip_notifications for update to authenticated using (employee_id = public.current_employee_id()) with check (employee_id = public.current_employee_id());

alter table public.wageflow_setup_requests enable row level security;
drop policy if exists setup_requests_master_manage on public.wageflow_setup_requests;
create policy setup_requests_master_manage on public.wageflow_setup_requests for all to authenticated using (public.is_wageflow_master()) with check (public.is_wageflow_master());

alter table public.contact_enquiries enable row level security;
drop policy if exists contact_enquiries_master_read on public.contact_enquiries;
create policy contact_enquiries_master_read on public.contact_enquiries for select to authenticated using (public.is_wageflow_master());

update storage.buckets set public = false where id in ('employee-documents', 'employee-contracts');
drop policy if exists employee_documents_storage_read on storage.objects;
drop policy if exists employee_documents_storage_write on storage.objects;
drop policy if exists employee_documents_storage_delete on storage.objects;
create policy employee_documents_storage_read on storage.objects for select to authenticated using (bucket_id = 'employee-documents' and (public.is_wageflow_master() or (public.is_current_employer() and (storage.foldername(name))[1] = public.current_business_id()::text)));
create policy employee_documents_storage_write on storage.objects for insert to authenticated with check (bucket_id = 'employee-documents' and public.is_current_employer() and (storage.foldername(name))[1] = public.current_business_id()::text);
create policy employee_documents_storage_delete on storage.objects for delete to authenticated using (bucket_id = 'employee-documents' and (public.is_wageflow_master() or (public.is_current_employer() and (storage.foldername(name))[1] = public.current_business_id()::text)));

commit;
