-- Disposable PostgreSQL seed for independent-session reminder scheduler contention.
insert into public.wageflow_setup_requests (id,business_name,contact_person,email,status,lifecycle_status)
values ('00000000-0000-0000-0000-000000000101','Reminder Test','Owner','reminder@example.test','Awaiting Initial Payment','awaiting_initial_payment');
insert into public.businesses (id,business_name,email,status,source_request_id)
values ('00000000-0000-0000-0000-000000000102','Reminder Test','reminder@example.test','pending_payment','00000000-0000-0000-0000-000000000101');
insert into public.subscriptions (id,business_id,plan_name,monthly_fee,setup_fee,setup_paid,subscription_status)
values ('00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000102','Starter',199,249,false,'pending');
insert into public.application_initial_payments (id,application_id,business_id,subscription_id,setup_amount,first_month_amount,total_amount,covered_month,status)
values ('00000000-0000-0000-0000-000000000104','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000103',249,199,448,current_date,'awaiting_payment');
insert into public.application_payment_attempts (initial_payment_id,provider_reference,payment_link_token_hash,expected_amount,currency,expires_at)
values ('00000000-0000-0000-0000-000000000104','wf-app-old-attempt','old-attempt-hash',448,'ZAR',now()+interval '1 day');
