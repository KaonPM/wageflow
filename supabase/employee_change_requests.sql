-- Employee self-service change requests. Run once in the Supabase SQL editor.
begin;

create table if not exists public.employee_change_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  request_type text not null check (request_type in ('contact', 'emergency_contact', 'banking')),
  requested_changes jsonb not null default '{}'::jsonb,
  evidence_path text,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Declined', 'Cancelled')),
  employee_note text,
  employer_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_change_requests_business_status_idx
  on public.employee_change_requests (business_id, status, created_at desc);
create index if not exists employee_change_requests_employee_created_idx
  on public.employee_change_requests (employee_id, created_at desc);

alter table public.employee_change_requests enable row level security;
drop policy if exists employee_change_requests_employee_read on public.employee_change_requests;
drop policy if exists employee_change_requests_employer_read on public.employee_change_requests;
drop policy if exists employee_change_requests_master_read on public.employee_change_requests;
create policy employee_change_requests_employee_read on public.employee_change_requests
  for select to authenticated using (employee_id = public.current_employee_id());
create policy employee_change_requests_employer_read on public.employee_change_requests
  for select to authenticated using (public.is_current_employer() and business_id = public.current_business_id());
create policy employee_change_requests_master_read on public.employee_change_requests
  for select to authenticated using (public.is_wageflow_master());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'employee-change-evidence',
  'employee-change-evidence',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

commit;
