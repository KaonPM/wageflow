-- Durable employer/employee tasks and an optional company payroll default.
begin;

alter table public.businesses add column if not exists default_payment_day smallint;
alter table public.businesses drop constraint if exists businesses_default_payment_day_check;
alter table public.businesses add constraint businesses_default_payment_day_check check (default_payment_day is null or default_payment_day between 1 and 31);

create table if not exists public.portal_tasks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  recipient_role text not null check (recipient_role in ('employer','employee')),
  title text not null,
  message text not null,
  href text not null,
  task_type text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists portal_tasks_recipient_created_idx on public.portal_tasks(recipient_user_id, created_at desc);
alter table public.portal_tasks enable row level security;
drop policy if exists portal_tasks_recipient_read on public.portal_tasks;
drop policy if exists portal_tasks_recipient_update on public.portal_tasks;
create policy portal_tasks_recipient_read on public.portal_tasks for select to authenticated using (recipient_user_id = auth.uid() or public.is_wageflow_master());
create policy portal_tasks_recipient_update on public.portal_tasks for update to authenticated using (recipient_user_id = auth.uid() or public.is_wageflow_master()) with check (recipient_user_id = auth.uid() or public.is_wageflow_master());

commit;
