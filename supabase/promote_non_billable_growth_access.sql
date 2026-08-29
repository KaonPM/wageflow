-- Ensure legacy non-billable packages have the same active Growth access as
-- newly approved Demo, Pilot, Daily Bloom and Edu Bloom businesses.
begin;

with eligible_businesses as (
  select business.id
  from public.businesses as business
  left join public.wageflow_setup_requests as request
    on request.id = business.source_request_id
  where lower(trim(coalesce(business.selected_package, ''))) in (
    'demo',
    'pilot',
    'daily bloom',
    'dailybloom',
    'daily bloom wageflow',
    'edubloom',
    'edu bloom',
    'edu bloom wageflow'
  )
  or lower(trim(coalesce(request.selected_package, ''))) in (
    'demo',
    'pilot',
    'daily bloom',
    'dailybloom',
    'daily bloom wageflow',
    'edubloom',
    'edu bloom',
    'edu bloom wageflow'
  )
)
update public.subscriptions as subscription
set
  plan_name = 'Growth Included',
  monthly_fee = 0,
  setup_fee = 0,
  setup_paid = true,
  subscription_status = 'active'
from eligible_businesses
where subscription.business_id = eligible_businesses.id;

insert into public.subscriptions (
  business_id,
  plan_name,
  monthly_fee,
  setup_fee,
  setup_paid,
  subscription_status
)
select
  business.id,
  'Growth Included',
  0,
  0,
  true,
  'active'
from public.businesses as business
left join public.wageflow_setup_requests as request
  on request.id = business.source_request_id
where not exists (
  select 1
  from public.subscriptions
  where subscriptions.business_id = business.id
)
and (
  lower(trim(coalesce(business.selected_package, ''))) in (
  'demo',
  'pilot',
  'daily bloom',
  'dailybloom',
  'daily bloom wageflow',
  'edubloom',
  'edu bloom',
  'edu bloom wageflow'
  )
  or lower(trim(coalesce(request.selected_package, ''))) in (
  'demo',
  'pilot',
  'daily bloom',
  'dailybloom',
  'daily bloom wageflow',
  'edubloom',
  'edu bloom',
  'edu bloom wageflow'
  )
);

update public.businesses as business
set selected_package = 'Growth Included'
from public.wageflow_setup_requests as request
where request.id = business.source_request_id
and (
  lower(trim(coalesce(business.selected_package, ''))) in (
  'demo',
  'pilot',
  'daily bloom',
  'dailybloom',
  'daily bloom wageflow',
  'edubloom',
    'edu bloom',
    'edu bloom wageflow'
  )
  or lower(trim(coalesce(request.selected_package, ''))) in (
    'demo',
    'pilot',
    'daily bloom',
    'dailybloom',
    'daily bloom wageflow',
    'edubloom',
    'edu bloom',
    'edu bloom wageflow'
  )
);

commit;
