begin;

-- BCEA-compatible defaults. Existing employee balances remain unchanged.
alter table public.businesses
  add column if not exists work_week_days smallint not null default 5,
  add column if not exists annual_leave_allowance numeric(6,2) not null default 15,
  add column if not exists sick_leave_allowance numeric(6,2) not null default 30,
  add column if not exists family_responsibility_leave_allowance numeric(6,2) not null default 3;

alter table public.businesses
  drop constraint if exists businesses_work_week_days_check;

alter table public.businesses
  add constraint businesses_work_week_days_check check (work_week_days in (5, 6));

commit;
