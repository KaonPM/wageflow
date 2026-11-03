import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../_lib/authorization";
import { createPaystackReference, chargePaystackAuthorization, verifyPaystackTransaction } from "../../_lib/paystack";
import { assertAutomaticBillingKeyConfigured, decryptAuthorization } from "../../_lib/autoBillingCrypto";
import { completeVerifiedPaystackReference } from "../../_lib/paystackCompletion";
import { queueEmail } from "../../_lib/applicationWorkflow";

export const runtime = "nodejs";

type Claim = {
  outcome: "charge" | "reconcile"; attempt_id: string; charge_reference: string;
  charge_amount: number; authorization_ciphertext: string; authorization_email: string;
  attempt_number: number; attempt_created_at: string;
};
type OpenStatement = { id: string; subscription_id: string; business_id: string; amount: number;
  recipient_email: string | null; statement_month: string; created_at: string };

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  if (process.env.AUTOMATIC_BILLING_ENABLED !== "true") return NextResponse.json({ enabled: false });
  if (process.env.PAYSTACK_MODE !== "test" && process.env.PAYSTACK_MODE !== "live") return NextResponse.json({ error: "Paystack mode is not configured." }, { status: 503 });
  try { assertAutomaticBillingKeyConfigured(); }
  catch { return NextResponse.json({ error: "Automatic billing encryption is not configured." }, { status: 503 }); }
  const admin = getSupabaseAdmin();
  const summary = { checked: 0, charged: 0, failed: 0, pending: 0, review: 0, notices: 0, issues: 0 };
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await admin.from("subscription_statements")
      .select("id,subscription_id,business_id,amount,recipient_email,statement_month,created_at")
      .eq("statement_type", "monthly").is("paid_at", null)
      .order("created_at", { ascending: true }).range(offset, offset + 99);
    if (error) return NextResponse.json({ error: "Monthly statements could not be loaded.", ...summary }, { status: 500 });
    const statements = (data || []) as OpenStatement[];
    for (const statement of statements) {
      summary.checked += 1;
      try {
        const result = await processStatement(admin, statement, request);
        if (result === "charged") summary.charged += 1;
        else if (result === "failed") summary.failed += 1;
        else if (result === "pending") summary.pending += 1;
        else if (result === "review") summary.review += 1;
        else if (result === "notice") summary.notices += 1;
      } catch {
        summary.issues += 1;
      }
    }
    if (statements.length < 100) break;
  }
  return NextResponse.json({ success: summary.issues === 0, ...summary }, { status: summary.issues ? 500 : 200 });
}

async function processStatement(admin: ReturnType<typeof getSupabaseAdmin>, statement: OpenStatement, request: Request) {
  const { data: method, error: methodError } = await admin.from("subscription_auto_payment_methods")
    .select("revoked_at,authorized_plan,authorized_amount,paystack_mode")
    .eq("subscription_id", statement.subscription_id).maybeSingle();
  if (methodError) throw new Error("method_lookup_failed");

  const claimToken = randomUUID();
  const { data: rows, error } = await admin.rpc("claim_subscription_auto_charge", {
    statement_id_input: statement.id, reference_input: createPaystackReference(statement.id), claim_input: claimToken,
    mode_input: process.env.PAYSTACK_MODE,
  });
  if (error) throw new Error("charge_claim_failed");
  const claim = (Array.isArray(rows) ? rows[0] : rows) as Claim | undefined;
  if (!claim) {
    if (method && !method.revoked_at && method.paystack_mode === process.env.PAYSTACK_MODE
      && Number(method.authorized_amount) >= Number(statement.amount)) {
      const { data: sub } = await admin.from("subscriptions").select("plan_name")
        .eq("id", statement.subscription_id).maybeSingle();
      if (sub?.plan_name === method.authorized_plan) return "skipped";
    }
    const { data: active, error: activeError } = await admin.from("subscription_auto_charge_attempts")
      .select("id").eq("statement_id", statement.id).in("status", ["claimed", "pending", "review"])
      .limit(1).maybeSingle();
    if (activeError) throw new Error("charge_state_lookup_failed");
    return active ? "skipped" : queueDueNotice(admin, statement, request);
  }
  let result: "succeeded" | "failed" | "pending" | "review" = "pending";
  try {
    const provider = await verifyPaystackTransaction(claim.charge_reference).catch(() => null);
    if (provider?.status === "success") {
      await completeVerifiedPaystackReference(admin, claim.charge_reference);
      result = "succeeded";
    } else if (provider?.status === "failed" || provider?.status === "abandoned") {
      result = "failed";
    } else if (provider) {
      result = "pending";
    } else if (claim.outcome === "charge") {
      await chargePaystackAuthorization({ authorizationCode: decryptAuthorization(claim.authorization_ciphertext),
        email: claim.authorization_email, amount: Number(claim.charge_amount), reference: claim.charge_reference,
        statementId: statement.id, businessId: statement.business_id });
      result = await verifyCharge(admin, claim.charge_reference);
    } else if (method && !method.revoked_at && method.paystack_mode === process.env.PAYSTACK_MODE
      && Date.now() - new Date(claim.attempt_created_at).getTime() > 24 * 60 * 60 * 1000
      && Date.now() - new Date(claim.attempt_created_at).getTime() <= 72 * 60 * 60 * 1000) {
      // Reuse exactly the same reference after an ambiguous provider response.
      // A duplicate-reference rejection must be reconciled, never assigned a new reference.
      await chargePaystackAuthorization({ authorizationCode: decryptAuthorization(claim.authorization_ciphertext),
        email: claim.authorization_email, amount: Number(claim.charge_amount), reference: claim.charge_reference,
        statementId: statement.id, businessId: statement.business_id });
      result = await verifyCharge(admin, claim.charge_reference);
    }
  } catch {
    result = "pending";
  }
  if (result === "pending" && Date.now() - new Date(claim.attempt_created_at).getTime() > 72 * 60 * 60 * 1000) {
    result = "review";
  }
  const { data: finished, error: finishError } = await admin.rpc("finish_subscription_auto_charge", {
    attempt_id_input: claim.attempt_id, claim_input: claimToken, result_input: result,
  });
  if (finishError) throw new Error("charge_finish_failed");
  // A concurrent verified webhook can finish the statement and clear this claim.
  if (finished !== true && result !== "succeeded") {
    const { data: current } = await admin.from("subscription_statements").select("paid_at")
      .eq("id", statement.id).maybeSingle();
    if (!current?.paid_at) throw new Error("charge_finish_conflict");
  }
  if (result === "failed" || result === "review") await queueChargeNotice(admin, statement, request, claim.attempt_number, result);
  return result === "succeeded" ? "charged" : result;
}

async function verifyCharge(admin: ReturnType<typeof getSupabaseAdmin>, reference: string) {
  const verified = await verifyPaystackTransaction(reference);
  if (verified.status === "success") {
    await completeVerifiedPaystackReference(admin, reference);
    return "succeeded" as const;
  }
  if (verified.status === "failed" || verified.status === "abandoned") return "failed" as const;
  return "pending" as const;
}

async function queueDueNotice(admin: ReturnType<typeof getSupabaseAdmin>, statement: OpenStatement, request: Request) {
  if (!statement.recipient_email) return "skipped";
  const age = (Date.now() - new Date(statement.created_at).getTime()) / 86_400_000;
  const day = [7, 3, 0].find((threshold) => age >= threshold);
  if (day === undefined) return "skipped";
  const queued = await queueEmail(admin, {
    idempotencyKey: `monthly-payment-due:${statement.id}:${day}`, eventType: "monthly_payment_due",
    recipient: statement.recipient_email,
    payload: { statementId: statement.id, businessId: statement.business_id,
      paymentUrl: new URL("/employer/billing", request.url).toString() },
  });
  return queued.queued ? "notice" : "skipped";
}

async function queueChargeNotice(admin: ReturnType<typeof getSupabaseAdmin>, statement: OpenStatement,
  request: Request, attempt: number, result: "failed" | "review") {
  if (!statement.recipient_email) return;
  await queueEmail(admin, {
    idempotencyKey: `monthly-auto-charge:${statement.id}:${attempt}:${result}`,
    eventType: result === "review" || attempt === 4 ? "monthly_payment_action_required" : "monthly_payment_retry",
    recipient: statement.recipient_email,
    payload: { statementId: statement.id, businessId: statement.business_id, attempt,
      paymentUrl: new URL("/employer/billing", request.url).toString() },
  });
}
