import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../_lib/authorization";
import { completePaystackStatement, verifyPaystackPayment } from "../../../_lib/billing";
import { hasValidPaystackSignature, verifyPaystackTransaction } from "../../../_lib/paystack";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!hasValidPaystackSignature(rawBody, request.headers.get("x-paystack-signature"))) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  const event = JSON.parse(rawBody) as { event?: string; data?: { reference?: string } };
  if (event.event !== "charge.success" || !event.data?.reference) return NextResponse.json({ received: true });
  try {
    const admin = getSupabaseAdmin();
    const transaction = await verifyPaystackTransaction(event.data.reference);
    const { data: attempt } = await admin.from("application_payment_attempts").select("id,expected_amount,currency").eq("provider_reference", transaction.reference).maybeSingle();
    if (attempt) {
      if (transaction.status !== "success" || transaction.currency !== attempt.currency || Number(transaction.amount) !== Math.round(Number(attempt.expected_amount) * 100)) throw new Error("Payment could not be verified.");
      const { error } = await admin.rpc("process_application_payment_success", { payment_attempt: attempt.id, provider_tx_id: String(transaction.id), paid_at: transaction.paid_at || new Date().toISOString() });
      if (error) throw new Error(error.message);
      return NextResponse.json({ received: true });
    }
    const statement = await verifyPaystackPayment(admin, transaction);
    await completePaystackStatement(admin, statement.id, transaction.reference);
  } catch (error) {
    console.error("Paystack webhook processing failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Payment could not be processed." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
