# Automatic monthly billing

Automatic collection is opt-in. Existing businesses remain on manual Paystack checkout until an employer with billing access authorizes a reusable card from a verified WageFlow payment. The card must have been charged previously through Paystack. WageFlow stores the Paystack authorization code encrypted with AES-256-GCM, plus the authorization's original email and masked card details. It never stores full card data. The mandate records the approved plan, maximum monthly amount, and Paystack mode; a price increase, plan change, or Test-to-Live switch requires fresh authorization.

## Release order

1. Review and apply `supabase/automatic_monthly_billing.sql` after `signup_billing_checkout_recovery.sql` and `paystack_webhook_and_recurring_hardening.sql`. The migration creates no mandates and charges no customer. Apply to a disposable database first; `tests/sql/automatic_monthly_billing_fixture.sql`, `tests/sql/automatic_monthly_billing_checks.sql`, `tests/sql/automatic_monthly_billing_concurrent.sh`, and `tests/sql/automatic_monthly_billing_recovery.sql` provide a minimal validation fixture.
2. Add `BILLING_AUTHORIZATION_KEY` to the server environment as a 32-byte random key encoded with standard Base64. Keep this key stable and private; losing or changing it makes stored mandates unusable. Use different keys for test and production. Do not place it in a `NEXT_PUBLIC_` variable or commit it.
3. Deploy the application with `AUTOMATIC_BILLING_ENABLED` unset or `false`. Confirm the employer billing page and manual checkout work with the new schema.
4. In a test environment, enroll a test business from a verified Paystack card payment and exercise a statement charge, a confirmed decline, a retry, revocation, webhook completion, and manual recovery. Confirm the statement is paid exactly once, notices are delivered, and no provider reference is reused across **confirmed failed** attempts.
5. Set `AUTOMATIC_BILLING_ENABLED=true` only after the test results and production configuration have been reviewed. Enabling the worker does not enroll existing businesses, but it does email unpaid monthly statements and charge any business that has explicitly opted in.

## Collection rules

- The monthly statement job runs daily at 02:00 UTC and uses the existing unique `(subscription_id, statement_type, statement_month)` constraint, so a missed invocation can catch up. It skips the month covered by a verified signup payment and any free or inactive plan.
- The collection worker runs daily at 03:00 UTC. It charges only an active Starter or Growth subscription whose current monthly fee equals the statement amount and whose employer has a current mandate.
- A database row lock and unique active-attempt index allow only one active charge per subscription. Each attempt gets a unique Paystack reference. An ambiguous provider result keeps the same reference for verification; it never advances to a fresh reference on a timeout.
- A confirmed failed charge can be retried three times: after 1, 2, then 4 further days. After the fourth failure, automatic attempts stop and the employer can return to manual checkout. A payment in an uncertain state remains blocked from manual checkout until reconciled.
- Paystack success must pass the existing reference, ZAR currency, amount, and verified completion checks. Both webhook and return paths update the attempt ledger through the paid-statement trigger.
- Employer notices use the existing email outbox and retry worker. Before delivery, the worker checks that the statement remains unpaid and that the recipient is the current business billing email.
- Revocation prevents new automatic attempts. A provider request already in progress may still complete; the user interface states this explicitly. Any pending reference continues to be verified after revocation.

## Operations

- Watch the Vercel logs for `/api/cron/monthly-statements`, `/api/cron/automatic-monthly-billing`, `/api/cron/application-payment-reminders`, and `/api/cron/paystack-webhook-reconciliation`. A nonzero `issues` count requires investigation. Vercel does not automatically retry a failed cron invocation; the daily statement job catches up on its next run.
- Watch `subscription_auto_charge_attempts` with status `review`, `email_outbox` with status `permanently_failed`, and `payment_webhook_events` with `manual_review_required_at` populated. Never clear an uncertain attempt or create a new reference until the provider transaction has been reconciled.
- If an authorization becomes invalid or the card changes, the employer must pay a statement with a new card and authorize that card on the billing page. If the encryption key must rotate, use a controlled re-encryption migration while the old key remains available; do not simply replace it.
- Manual checkout after a confirmed automatic failure revokes the mandate before starting a new Paystack transaction. The employer can re-enroll after a successful card payment.

## Limits

The SQL fixture validates function behavior, privileges, and a two-session race against PostgreSQL, but it is not a copy of the full production schema. A controlled Paystack Test Mode charge and decline are still required before switching on automatic collection for real customers. Ambiguous provider results require review rather than risking a duplicate debit.
