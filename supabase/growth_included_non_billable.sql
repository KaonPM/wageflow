-- Free/internal/client partnership plans receive Growth features without billing.
begin;

update public.subscriptions
set plan_name = 'Growth Included', monthly_fee = 0, setup_fee = 0, setup_paid = true, subscription_status = 'active'
where lower(coalesce(plan_name, '')) in ('pilot', 'daily bloom', 'daily bloom wageflow', 'edu bloom', 'edu bloom wageflow', 'demo', '')
   or (coalesce(monthly_fee, 0) = 0 and coalesce(setup_fee, 0) = 0 and lower(coalesce(plan_name, '')) <> 'starter');

update public.businesses
set selected_package = 'Growth Included'
where lower(coalesce(selected_package, '')) in ('pilot', 'daily bloom', 'daily bloom wageflow', 'edu bloom', 'edu bloom wageflow', 'demo', '');

commit;
