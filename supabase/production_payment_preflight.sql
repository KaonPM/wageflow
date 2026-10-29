-- READ ONLY. Run manually in the intended Supabase SQL editor before deployment.
-- Do not run this script as a migration. It contains no repair or schema changes.

-- Hosted Supabase does not guarantee SQL Editor access to migration-history tables.
-- Check the Dashboard/CLI migration history separately. This verifies deployed objects instead.
with expected(object_name) as (values
  ('application_initial_payments'),('application_payment_attempts'),('payment_webhook_events'),('email_outbox'),('application_employer_onboarding'),('subscription_statements')
)
select expected.object_name,coalesce(cls.relkind::text,'missing') as relation_kind
from expected left join pg_class cls on cls.relname=expected.object_name and cls.relnamespace='public'::regnamespace
order by expected.object_name;

-- Required relation and RLS presence, without exposing application/payment data.
select c.relname as relation_name,c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('application_initial_payments','application_payment_attempts','payment_webhook_events','email_outbox','application_employer_onboarding','subscription_statements')
order by c.relname;

select table_class.relname as table_name,index_class.relname as index_name,index_meta.indisunique
from pg_index index_meta
join pg_class table_class on table_class.oid=index_meta.indrelid
join pg_class index_class on index_class.oid=index_meta.indexrelid
join pg_namespace table_schema on table_schema.oid=table_class.relnamespace
where table_schema.nspname='public'
  and table_class.relname in ('application_payment_attempts','application_initial_payments','subscription_statements')
order by table_class.relname,index_class.relname;

-- Human decision required before the recurring provider-transaction unique index.
select payment_provider_transaction_id,count(*) as duplicate_count
from public.subscription_statements where payment_provider_transaction_id is not null
group by payment_provider_transaction_id having count(*)>1 order by duplicate_count desc limit 50;

-- Valid deployed status values and inconsistent lifecycle aggregates.
select status,count(*) from public.businesses group by status order by status;
select lifecycle_status,count(*) from public.wageflow_setup_requests group by lifecycle_status order by lifecycle_status;
select payment.status as payment_status,request.lifecycle_status,count(*)
from public.application_initial_payments payment join public.wageflow_setup_requests request on request.id=payment.application_id
group by payment.status,request.lifecycle_status order by payment.status,request.lifecycle_status;

-- Operational exceptions requiring review; output is aggregate-only.
select 'stale_outbox_leases' as check_name,count(*) from public.email_outbox where status='processing' and lease_expires_at < now()
union all select 'webhook_processing_errors',count(*) from public.payment_webhook_events where processing_error is not null and processed_at is null
union all select 'webhook_manual_review',count(*) from public.payment_webhook_events where manual_review_required_at is not null
union all select 'initial_month_also_statemented',count(*) from public.application_initial_payments payment join public.subscription_statements statement on statement.subscription_id=payment.subscription_id and statement.statement_type='monthly' and statement.statement_month=payment.covered_month where payment.status='verified';

-- Inspect grants, policies and SECURITY DEFINER functions before approving deployment.
select routine_name,security_type from information_schema.routines where routine_schema='public' and routine_name in ('complete_application_payment','activate_verified_application','complete_subscription_statement_payment','claim_email_outbox','claim_failed_payment_webhook_events','finish_failed_payment_webhook_event') order by routine_name;
select grantee,routine_name,privilege_type from information_schema.routine_privileges where specific_schema='public' and routine_name in ('complete_application_payment','activate_verified_application','complete_subscription_statement_payment','claim_email_outbox','claim_failed_payment_webhook_events','finish_failed_payment_webhook_event') order by routine_name,grantee;
