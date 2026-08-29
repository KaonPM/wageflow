-- Paper-first employee access and delivery preferences.
-- Run this once in the Supabase SQL editor before deploying this release.

begin;

alter table public.businesses
  add column if not exists default_employee_portal_enabled boolean not null default true;

alter table public.employees
  add column if not exists portal_requested boolean not null default false,
  add column if not exists payslip_delivery_method text not null default 'paper';

alter table public.employees
  drop constraint if exists employees_payslip_delivery_method_check;
alter table public.employees
  add constraint employees_payslip_delivery_method_check
  check (payslip_delivery_method in ('paper', 'portal_and_paper', 'portal_only'));

update public.employees employee
set portal_requested = true,
    payslip_delivery_method = case when employee.payslip_delivery_method = 'paper' then 'portal_and_paper' else employee.payslip_delivery_method end
where exists (
  select 1 from public.employee_accounts account
  where account.employee_id = employee.id and account.portal_enabled is true
);

alter table public.wageflow_setup_requests
  add column if not exists default_employee_portal_enabled boolean not null default true;

create table if not exists public.payslip_distribution_records (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  payslip_id uuid not null references public.payslips(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  delivery_status text not null default 'printed',
  delivered_to text,
  delivered_at timestamptz,
  received_by text,
  received_at timestamptz,
  notes text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payslip_id),
  constraint payslip_distribution_records_status_check
    check (delivery_status in ('printed', 'handed_to_supervisor', 'signed_received'))
);

alter table public.payslip_distribution_records enable row level security;
drop policy if exists payslip_distribution_records_business_manage on public.payslip_distribution_records;
create policy payslip_distribution_records_business_manage
on public.payslip_distribution_records for all to authenticated
using (public.is_wageflow_master() or (public.is_current_employer() and business_id = public.current_business_id()))
with check (public.is_wageflow_master() or (public.is_current_employer() and business_id = public.current_business_id()));

commit;
