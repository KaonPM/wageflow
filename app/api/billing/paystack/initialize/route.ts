import { NextResponse } from "next/server";
import { requireRole } from "../../../_lib/authorization";
import { createPaystackReference, initializePaystackTransaction } from "../../../_lib/paystack";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const access = await requireRole(request, ["master", "master_admin"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => null) as { statementId?: string } | null;
  const statementId = String(body?.statementId || "").trim();
  if (!statementId) return NextResponse.json({ error: "A statement is required." }, { status: 400 });

  const { data: statement, error } = await access.admin
    .from("subscription_statements")
    .select("id,business_id,amount,status,paid_at,recipient_email")
    .eq("id", statementId)
    .maybeSingle();
  if (error || !statement) return NextResponse.json({ error: error?.message || "Statement not found." }, { status: 404 });
  if (statement.paid_at || statement.status === "paid") return NextResponse.json({ error: "This statement has already been paid." }, { status: 409 });
  if (Number(statement.amount) <= 0 || !statement.recipient_email) return NextResponse.json({ error: "A positive amount and billing email are required before checkout." }, { status: 400 });

  const reference = createPaystackReference(statement.id);
  const callbackUrl = new URL("/billing/payment-return", request.url);
  const authorizationUrl = await initializePaystackTransaction({
    email: statement.recipient_email,
    amount: Number(statement.amount),
    reference,
    callbackUrl: callbackUrl.toString(),
    statementId: statement.id,
    businessId: statement.business_id,
  }).catch((cause: unknown) => ({ error: cause instanceof Error ? cause.message : "Paystack could not start the checkout." }));
  if (typeof authorizationUrl !== "string") return NextResponse.json({ error: authorizationUrl.error }, { status: 502 });

  const update = await access.admin.from("subscription_statements").update({ payment_provider: "paystack", payment_reference: reference, payment_initialized_at: new Date().toISOString() }).eq("id", statement.id);
  if (update.error) return NextResponse.json({ error: update.error.message }, { status: 500 });
  return NextResponse.json({ authorizationUrl });
}
