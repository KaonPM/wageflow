#!/bin/sh
# Run only inside the disposable PostgreSQL test container after checks.sql.
set -eu
psql -v ON_ERROR_STOP=1 -U postgres -At -c "insert into public.subscription_statements values (
 '00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000003',
 '00000000-0000-0000-0000-000000000002','monthly','2026-12-01',199,'pending',
 null,null,null,null,null,null,null)" >/dev/null
psql -v ON_ERROR_STOP=1 -U postgres -At -c "begin;
 select outcome from public.claim_subscription_auto_charge(
 '00000000-0000-0000-0000-000000000007','wf-race-one',
 '00000000-0000-0000-0000-000000000008','test');
 select pg_sleep(2); commit;" >/tmp/wageflow-first-result &
first_pid=$!
sleep 0.3
psql -v ON_ERROR_STOP=1 -U postgres -At -c "select outcome from public.claim_subscription_auto_charge(
 '00000000-0000-0000-0000-000000000007','wf-race-two',
 '00000000-0000-0000-0000-000000000009','test');" >/tmp/wageflow-second-result &
second_pid=$!
wait "$first_pid"
wait "$second_pid"
first=$(grep -c '^charge$' /tmp/wageflow-first-result || true)
second=$(grep -c '^charge$' /tmp/wageflow-second-result || true)
attempts=$(psql -v ON_ERROR_STOP=1 -U postgres -At -c "select count(*) from public.subscription_auto_charge_attempts where statement_id='00000000-0000-0000-0000-000000000007'")
test "$first" = 1
test "$second" = 0
test "$attempts" = 1
echo 'Concurrent claim passed: one charge claim and one attempt.'
