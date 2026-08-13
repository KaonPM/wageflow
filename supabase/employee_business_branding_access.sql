begin;

-- Employees need read-only access to the business linked to their employee
-- record so their portal can display the correct name, colours and logo.
drop policy if exists businesses_select on public.businesses;
create policy businesses_select
on public.businesses
for select
to authenticated
using (
  public.is_wageflow_master()
  or public.is_business_member(id)
  or employer_id = auth.uid()
  or id = public.current_business_id()
  or id = (
    select employee.business_id
    from public.employees as employee
    where employee.id = public.current_employee_id()
    limit 1
  )
);

commit;
