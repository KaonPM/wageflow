begin;

alter table public.businesses
  add column if not exists sdl_applicable boolean not null default false,
  add column if not exists sdl_reference text;

alter table public.employees
  add column if not exists passport_number text,
  add column if not exists date_of_birth date,
  add column if not exists end_date date,
  add column if not exists termination_reason text,
  add column if not exists uif_contributor boolean;

create table if not exists public.compliance_submissions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  payroll_run_id uuid references public.payroll_runs(id) on delete set null,
  authority text not null check (authority in ('sars','uif')),
  submission_type text not null,
  period text not null,
  submitted_at date not null,
  submission_reference text,
  status text not null default 'not_submitted' check (status in ('not_submitted','submitted_manually','submitted_electronically','accepted','rejected')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.compliance_exports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  payroll_run_id uuid references public.payroll_runs(id) on delete set null,
  export_type text not null,
  specification_version text not null,
  validation_status text not null check (validation_status in ('ready','blocked','unverified')),
  payroll_snapshot jsonb not null,
  generated_by uuid references public.profiles(id) on delete set null,
  generated_at timestamptz not null default now(),
  supersedes_export_id uuid references public.compliance_exports(id) on delete set null,
  regeneration_reason text
);

alter table public.compliance_submissions enable row level security;
alter table public.compliance_exports enable row level security;
drop policy if exists compliance_submissions_business_manage on public.compliance_submissions;
drop policy if exists compliance_exports_business_manage on public.compliance_exports;
create policy compliance_submissions_business_manage on public.compliance_submissions for all to authenticated using (public.is_wageflow_master() or (public.is_current_employer() and business_id = public.current_business_id())) with check (public.is_wageflow_master() or (public.is_current_employer() and business_id = public.current_business_id()));
create policy compliance_exports_business_manage on public.compliance_exports for all to authenticated using (public.is_wageflow_master() or (public.is_current_employer() and business_id = public.current_business_id())) with check (public.is_wageflow_master() or (public.is_current_employer() and business_id = public.current_business_id()));

commit;
