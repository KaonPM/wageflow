begin;

alter table public.businesses
  add column if not exists postal_address text,
  add column if not exists worksite_address text,
  add column if not exists authorised_person text;

alter table public.employees
  add column if not exists uif_non_contributor_reason text;

alter table public.payslips
  add column if not exists hours_worked numeric(10,2);

commit;
