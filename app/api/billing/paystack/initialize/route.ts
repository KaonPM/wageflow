import { NextResponse } from "next/server";
import { requireRole } from "../../../_lib/authorization";
import { randomUUID } from "crypto";
import { createPaystackReference, initializePaystackTransaction } from "../../../_lib/paystack";
import { hasEmployerBillingPermission } from "../../../_lib/employerBillingAccess";

export const runtime = "nodejs";
const checkoutHeaders = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const access = await requireRole(request, ["master", "master_admin", "employer", "employer_admin"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => null) as { statementId?: string } | null;
  const statementId = String(body?.statementId || "").trim();
  if (!statementId) return NextResponse.json({ error: "A statement is required." }, { status: 400 });

  const role = String(access.profile?.role || "").toLowerCase();
  const isEmployer = role === "employer" || role === "employer_admin";
  if (isEmployer) {
    if (!hasEmployerBillingPermission(access.profile)) return NextResponse.json({ error: "Your employer administrator account has not been granted billing access." }, { status: 403 });
    const businessId = String(access.profile.business_id || "");
    const [{ data: statement }, { data: membership }] = await Promise.all([
      access.admin.from("subscription_statements").select("business_id").eq("id", statementId).maybeSingle(),
      access.admin.from("employer_business_memberships").select("business_id").eq("employer_id", access.user.id).eq("business_id", businessId).eq("is_active", true).maybeSingle(),
    ]);
    if (!businessId || !membership || !statement || statement.business_id !== businessId) {
      return NextResponse.json({ error: "You do not have access to this billing statement." }, { status: 403 });
    }
  }

  const claim = randomUUID();
  const { data: claims, error: claimError } = await access.admin.rpc("claim_subscription_statement_checkout", {
    statement_id_input: statementId,
    reference_input: createPaystackReference(statementId),
    claim_input: claim,
    lease_seconds: 120,
  });
  if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 });
  const statement = Array.isArray(claims) ? claims[0] : claims;
  if (!statement) return NextResponse.json({ error: "Statement not found." }, { status: 404 });
  if (isEmployer && statement.business_id !== String(access.profile.business_id || "")) {
    if (statement.outcome === "claimed") await access.admin.rpc("finish_subscription_statement_checkout_claim", { statement_id_input: statement.id, claim_input: claim, initialized: false });
    return NextResponse.json({ error: "You do not have access to this billing statement." }, { status: 403 });
  }
  if (statement.outcome === "paid") return NextResponse.json({ error: "This statement has already been paid." }, { status: 409 });
  if (statement.outcome === "unavailable") return NextResponse.json({ error: "A positive amount and billing email are required before checkout." }, { status: 400 });
  if (statement.outcome === "initializing") return NextResponse.json({ error: "Checkout initialization is already in progress. Please wait before trying again." }, { status: 409 });
  if (statement.outcome === "already_initialized") {
    const { data: existing, error: existingError } = await access.admin.from("subscription_statements")
      .select("payment_authorization_url,payment_reference,paid_at")
      .eq("id", statementId).maybeSingle();
    if (existingError) return NextResponse.json({ error: "Checkout could not be reopened." }, { status: 500 });
    if (existing?.paid_at) return NextResponse.json({ error: "This statement has already been paid." }, { status: 409 });
    if (existing?.payment_reference === statement.payment_reference && existing?.payment_authorization_url) {
      return NextResponse.json({ authorizationUrl: existing.payment_authorization_url }, { headers: checkoutHeaders });
    }
    return NextResponse.json({ error: "This checkout needs payment reconciliation before it can be reopened. Please contact support." }, { status: 409 });
  }
  if (statement.outcome !== "claimed" || !statement.payment_reference || !statement.recipient_email) return NextResponse.json({ error: "Statement checkout could not be claimed." }, { status: 409 });

  const callbackUrl = new URL("/billing/payment-return", request.url);
  callbackUrl.searchParams.set("returnTo", isEmployer ? "employer-billing" : "master-billing");
  const authorizationUrl = await initializePaystackTransaction({
    email: statement.recipient_email,
    amount: Number(statement.amount),
    reference: statement.payment_reference,
    callbackUrl: callbackUrl.toString(),
    statementId: statement.id,
    businessId: statement.business_id,
  }).catch((cause: unknown) => ({ error: cause instanceof Error ? cause.message : "Paystack could not start the checkout." }));
  if (typeof authorizationUrl !== "string") {
    await access.admin.rpc("finish_subscription_statement_checkout_claim", { statement_id_input: statement.id, claim_input: claim, initialized: false });
    return NextResponse.json({ error: authorizationUrl.error }, { status: 502 });
  }

  const { data: finalized, error: finalizeError } = await access.admin.rpc("finalize_subscription_statement_checkout_url", { statement_id_input: statement.id, claim_input: claim, authorization_url_input: authorizationUrl });
  if (finalizeError) return NextResponse.json({ error: finalizeError.message }, { status: 500 });
  if (!finalized) return NextResponse.json({ error: "Checkout initialization was superseded. Please refresh the statement before trying again." }, { status: 409 });
  return NextResponse.json({ authorizationUrl }, { headers: checkoutHeaders });
}
