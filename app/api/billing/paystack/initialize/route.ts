import { NextResponse } from "next/server";
import { requireRole } from "../../../_lib/authorization";
import { randomUUID } from "crypto";
import { createPaystackReference, initializePaystackTransaction } from "../../../_lib/paystack";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const access = await requireRole(request, ["master", "master_admin"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => null) as { statementId?: string } | null;
  const statementId = String(body?.statementId || "").trim();
  if (!statementId) return NextResponse.json({ error: "A statement is required." }, { status: 400 });

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
  if (statement.outcome === "paid") return NextResponse.json({ error: "This statement has already been paid." }, { status: 409 });
  if (statement.outcome === "unavailable") return NextResponse.json({ error: "A positive amount and billing email are required before checkout." }, { status: 400 });
  if (statement.outcome === "initializing") return NextResponse.json({ error: "Checkout initialization is already in progress. Please wait before trying again." }, { status: 409 });
  if (statement.outcome === "already_initialized") return NextResponse.json({ error: "Checkout has already been initialized for this statement." }, { status: 409 });
  if (statement.outcome !== "claimed" || !statement.payment_reference || !statement.recipient_email) return NextResponse.json({ error: "Statement checkout could not be claimed." }, { status: 409 });

  const callbackUrl = new URL("/billing/payment-return", request.url);
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

  const { data: finalized, error: finalizeError } = await access.admin.rpc("finish_subscription_statement_checkout_claim", { statement_id_input: statement.id, claim_input: claim, initialized: true });
  if (finalizeError) return NextResponse.json({ error: finalizeError.message }, { status: 500 });
  if (!finalized) return NextResponse.json({ error: "Checkout initialization was superseded. Please refresh the statement before trying again." }, { status: 409 });
  return NextResponse.json({ authorizationUrl });
}
