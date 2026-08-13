begin;

create or replace function public.assign_employee_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  business_label text;
  business_prefix text;
  next_number integer;
begin
  if nullif(btrim(new.employee_number), '') is not null then
    return new;
  end if;

  if new.business_id is null then
    raise exception 'A business is required before an employee number can be generated';
  end if;

  -- Serialise number allocation per business so concurrent saves cannot
  -- receive the same employee number.
  perform pg_advisory_xact_lock(hashtext(new.business_id::text));

  select business_name
  into business_label
  from public.businesses
  where id = new.business_id;

  select string_agg(left(word, 1), '' order by position)
  into business_prefix
  from unnest(regexp_split_to_array(coalesce(business_label, ''), '[^[:alnum:]]+'))
       with ordinality as words(word, position)
  where word <> '';

  business_prefix := upper(regexp_replace(coalesce(business_prefix, ''), '[^A-Z0-9]', '', 'g'));
  if business_prefix = '' then
    business_prefix := 'BUS';
  end if;

  select coalesce(max((regexp_match(employee_number, '-([0-9]+)$'))[1]::integer), 0) + 1
  into next_number
  from public.employees
  where business_id = new.business_id
    and employee_number ~ ('^' || business_prefix || '-[0-9]+$');

  new.employee_number := business_prefix || '-' || lpad(next_number::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists employees_assign_employee_number on public.employees;
create trigger employees_assign_employee_number
before insert on public.employees
for each row
execute function public.assign_employee_number();

commit;
