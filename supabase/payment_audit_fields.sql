begin;

alter table public.payroll_runs
  add column if not exists payment_exported_at timestamptz,
  add column if not exists payment_paid_at timestamptz,
  add column if not exists payment_date date,
  add column if not exists external_payment_reference text;

alter table public.payroll_runs
  drop constraint if exists payroll_runs_external_payment_reference_length;

alter table public.payroll_runs
  add constraint payroll_runs_external_payment_reference_length
  check (external_payment_reference is null or char_length(external_payment_reference) <= 120);

commit;
