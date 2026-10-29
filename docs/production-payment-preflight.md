# Payment-gated onboarding production preflight

Run [production_payment_preflight.sql](../supabase/production_payment_preflight.sql) manually and read-only in the intended Supabase project before applying any Stage A–E migration. It only returns schema metadata and aggregate operational findings.

Stop for a human decision if migration history is incomplete, an expected relation/RLS setting/index is absent, duplicate recurring provider transaction IDs exist, incompatible business statuses appear, stale outbox/webhook work requires review, or initial-payment coverage overlaps existing monthly statements. Do not use the script to repair data or apply migrations.

The operator must additionally compare the returned function grants and `SECURITY DEFINER` definitions with the reviewed migration files, verify the deployed cron secrets/provider configuration out of band, and retain the redacted result with the release evidence.
