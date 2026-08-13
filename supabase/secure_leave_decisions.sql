begin;

drop policy if exists approval_requests_employee_insert on public.approval_requests;
create policy approval_requests_employee_insert
on public.approval_requests
for insert
to authenticated
with check (
  employee_id = public.current_employee_id()
  and business_id = public.current_business_id()
  and status = 'Pending'
  and approved_by is null
  and approved_at is null
  and employer_note is null
);

create or replace function public.protect_approval_request_decision_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' or public.is_wageflow_master() then
    return new;
  end if;

  if old.employee_id = public.current_employee_id()
     and old.status = 'Pending'
     and new.status = 'Cancelled'
     and (to_jsonb(new) - array['status','updated_at']) = (to_jsonb(old) - array['status','updated_at']) then
    return new;
  end if;

  raise exception 'Approval decisions may only be made through the secure employer workflow';
end;
$$;

drop trigger if exists protect_approval_request_decision_fields on public.approval_requests;
create trigger protect_approval_request_decision_fields
before update on public.approval_requests
for each row
execute function public.protect_approval_request_decision_fields();

create or replace function public.decide_approval_request(
  target_request_id uuid,
  target_business_id uuid,
  decision_status text,
  decision_note text,
  decision_by text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_request public.approval_requests%rowtype;
  leave_days integer := 0;
  remaining_balance numeric;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Service role required';
  end if;
  if decision_status not in ('Approved', 'Declined') then
    raise exception 'Invalid approval decision';
  end if;
  if decision_status = 'Declined' and nullif(btrim(decision_note), '') is null then
    raise exception 'A decline reason is required';
  end if;

  select * into target_request
  from public.approval_requests
  where id = target_request_id and business_id = target_business_id
  for update;

  if not found then raise exception 'Approval request not found'; end if;
  if target_request.status <> 'Pending' then raise exception 'Only pending requests can be decided'; end if;

  if decision_status = 'Approved'
     and target_request.request_type = 'Leave request'
     and lower(coalesce(target_request.leave_type, '')) = 'annual leave' then
    if target_request.start_date is null or target_request.end_date is null or target_request.end_date < target_request.start_date then
      raise exception 'The leave dates are invalid';
    end if;

    select count(*)::integer into leave_days
    from generate_series(target_request.start_date::date, target_request.end_date::date, interval '1 day') as day
    where extract(isodow from day) between 1 and 5;

    select coalesce(leave_balance, 0) into remaining_balance
    from public.employees
    where id = target_request.employee_id and business_id = target_business_id
    for update;

    if not found then raise exception 'Employee not found'; end if;
    if remaining_balance < leave_days then
      raise exception 'Insufficient annual leave balance: % day(s) available, % requested', remaining_balance, leave_days;
    end if;

    update public.employees
    set leave_balance = remaining_balance - leave_days
    where id = target_request.employee_id and business_id = target_business_id;
  end if;

  update public.approval_requests
  set status = decision_status,
      employer_note = nullif(btrim(decision_note), ''),
      approved_by = decision_by,
      approved_at = now(),
      updated_at = now()
  where id = target_request_id and business_id = target_business_id;

  return jsonb_build_object('status', decision_status, 'leave_days_deducted', leave_days);
end;
$$;

revoke all on function public.decide_approval_request(uuid, uuid, text, text, text) from public;
grant execute on function public.decide_approval_request(uuid, uuid, text, text, text) to service_role;

commit;
