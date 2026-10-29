-- Execute after each two-session case with :case set to replacement, archive, or payment.
select set_config('stage_f.case', :'case', false);
do $$
declare case_name text := current_setting('stage_f.case');
begin
  if case_name='replacement' then
    if (select count(*) from public.application_payment_attempts where initial_payment_id='00000000-0000-0000-0000-000000000104'::uuid and status in ('created','initialized','pending')) <> 1 then
      raise exception 'Replacement race left zero or multiple live attempts';
    end if;
    if not exists (
      select 1 from public.email_outbox o join public.application_payment_attempts a
        on a.payment_link_token_hash=encode(extensions.digest(split_part(o.payload->>'paymentUrl','/pay/',2),'sha256'),'hex')
      where o.idempotency_key='initial-payment-reminder:00000000-0000-0000-0000-000000000104:4'
        and (o.status='cancelled' or a.status in ('created','initialized','pending'))
    ) then raise exception 'Reminder is neither cancelled nor tied to a live attempt'; end if;
  elsif case_name='archive' then
    if (select lifecycle_status from public.wageflow_setup_requests where id='00000000-0000-0000-0000-000000000101'::uuid) <> 'archived' then
      raise exception 'Archive race did not archive application';
    end if;
    if exists (select 1 from public.email_outbox where idempotency_key='initial-payment-reminder:00000000-0000-0000-0000-000000000104:5' and status<>'cancelled') then
      raise exception 'Archive race left a noncancelled reminder';
    end if;
  elsif case_name='payment' then
    if (select lifecycle_status from public.wageflow_setup_requests where id='00000000-0000-0000-0000-000000000101'::uuid) not in ('payment_verified','archived') then
      raise exception 'Payment race left an unexpected lifecycle';
    end if;
    if (select status from public.application_initial_payments where id='00000000-0000-0000-0000-000000000104'::uuid) not in ('verified','financial_resolution_required') then
      raise exception 'Payment race failed to record the provider transaction';
    end if;
  else raise exception 'Unknown concurrency case'; end if;
end $$;
