-- WageFlow subscription entitlements.
-- Run this in the Supabase SQL editor after deploying the application update.

create or replace function public.enforce_employee_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_plan text;
  employee_limit integer;
  active_employees integer;
begin
  -- Do not block a historical/terminated employee record.
  if coalesce(lower(new.employment_status), 'active') not in ('active', 'on leave') then
    return new;
  end if;

  select plan_name
    into selected_plan
    from public.subscriptions
   where business_id = new.business_id
   limit 1;

  employee_limit := case
    when coalesce(selected_plan, '') ilike any (array['%growth%', '%pro%', '%elite%']) then 20
    else 10
  end;

  select count(*)
    into active_employees
    from public.employees
   where business_id = new.business_id
     and id is distinct from new.id
     and coalesce(lower(employment_status), 'active') in ('active', 'on leave');

  if active_employees >= employee_limit then
    raise exception 'Your % plan supports up to % active employees. Upgrade your plan to add another employee.', coalesce(selected_plan, 'Starter'), employee_limit
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_employee_plan_limit on public.employees;
create trigger enforce_employee_plan_limit
before insert or update of business_id, employment_status on public.employees
for each row execute function public.enforce_employee_plan_limit();
