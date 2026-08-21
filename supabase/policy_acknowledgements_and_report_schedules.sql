-- Policy acknowledgement and scheduled employer report delivery.
begin;

create table if not exists public.company_policies (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 160),
  version text not null default '1.0' check (char_length(version) between 1 and 40),
  policy_text text,
  file_path text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists company_policies_business_idx on public.company_policies(business_id, published_at desc);

create table if not exists public.policy_assignments (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.company_policies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique(policy_id, employee_id)
);
create index if not exists policy_assignments_employee_idx on public.policy_assignments(employee_id, assigned_at desc);

create table if not exists public.policy_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  policy_assignment_id uuid not null unique references public.policy_assignments(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  acknowledgement_text text not null default 'I acknowledge that I have received and read this policy.',
  ip_address text
);

create table if not exists public.report_schedules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  report_type text not null check (report_type in ('payroll_summary', 'employee_master_list', 'employee_exit_report', 'uif_report', 'paye_report')),
  recipient_email text not null,
  frequency text not null default 'monthly' check (frequency in ('monthly')),
  delivery_day smallint not null default 1 check (delivery_day between 1 and 28),
  active boolean not null default true,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists report_schedules_due_idx on public.report_schedules(active, delivery_day, last_sent_at);

alter table public.company_policies enable row level security;
alter table public.policy_assignments enable row level security;
alter table public.policy_acknowledgements enable row level security;
alter table public.report_schedules enable row level security;

drop policy if exists company_policies_employer_access on public.company_policies;
create policy company_policies_employer_access on public.company_policies for all to authenticated
  using (public.is_wageflow_master() or (public.is_current_employer() and business_id = public.current_business_id()))
  with check (public.is_wageflow_master() or (public.is_current_employer() and business_id = public.current_business_id()));

drop policy if exists policy_assignments_employer_access on public.policy_assignments;
create policy policy_assignments_employer_access on public.policy_assignments for all to authenticated
  using (public.is_wageflow_master() or exists (select 1 from public.company_policies p where p.id = policy_id and p.business_id = public.current_business_id() and public.is_current_employer()))
  with check (public.is_wageflow_master() or exists (select 1 from public.company_policies p where p.id = policy_id and p.business_id = public.current_business_id() and public.is_current_employer()));

drop policy if exists report_schedules_employer_access on public.report_schedules;
create policy report_schedules_employer_access on public.report_schedules for all to authenticated
  using (public.is_wageflow_master() or (public.is_current_employer() and business_id = public.current_business_id()))
  with check (public.is_wageflow_master() or (public.is_current_employer() and business_id = public.current_business_id()));

commit;
