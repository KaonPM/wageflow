import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../_lib/authorization";
import { completePaystackStatement, verifyPaystackPayment } from "../../../_lib/billing";
import { verifyPaystackTransaction } from "../../../_lib/paystack";
import { tokenHash } from "../../../_lib/applicationWorkflow";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { reference?: string; token?: string } | null;
  const reference = String(body?.reference || "").trim();
  const token = typeof body?.token === "string" ? body.token : null;
  if (!/^[-.=A-Za-z0-9]{12,200}$/.test(reference)) return NextResponse.json({ error: "Invalid payment reference." }, { status: 400 });
  if (token !== null && token.length < 40) return NextResponse.json({ error: "This payment link is unavailable." }, { status: 404 });
  const admin = getSupabaseAdmin();
  try {
    const transaction = await verifyPaystackTransaction(reference);
    if (transaction.reference !== reference) throw new Error("Payment could not be verified.");
    let attemptQuery = admin.from("application_payment_attempts").select("id,initial_payment_id,expected_amount,currency,status").eq("provider_reference", reference);
    if (token !== null) attemptQuery = attemptQuery.eq("payment_link_token_hash", tokenHash(token));
    const { data: attempt, error: attemptError } = await attemptQuery.maybeSingle();
    if (attemptError) throw new Error("Payment could not be verified.");
    if (token !== null && !attempt) return NextResponse.json({ error: "This payment link is unavailable." }, { status: 404 });
    if (attempt) {
      if (token === null) return NextResponse.json({ error: "This payment link is unavailable." }, { status: 404 });
      if (transaction.status !== "success" || transaction.currency !== attempt.currency || Number(transaction.amount) !== Math.round(Number(attempt.expected_amount) * 100)) throw new Error("Payment could not be verified.");
      const { data: result, error } = await admin.rpc("complete_application_payment", { payment_attempt_id: attempt.id, provider_transaction: String(transaction.id), paid_amount_minor: Number(transaction.amount), paid_currency: transaction.currency, paid_at: transaction.paid_at || new Date().toISOString() });
      if (error) throw new Error(error.message);
      if (result === "financial_resolution_required") return NextResponse.json({ error: "Payment was received after this link became invalid. Contact WageFlow for financial resolution.", result }, { status: 409 });
      if (result === "already_verified") {
        const { data: payment, error: paymentError } = await admin.from("application_initial_payments").select("status").eq("id", attempt.initial_payment_id).maybeSingle();
        if (paymentError || !payment) throw new Error("Payment could not be verified.");
        if (payment.status !== "verified") return NextResponse.json({ error: "Payment requires financial resolution. Contact WageFlow.", result: "financial_resolution_required" }, { status: 409 });
      }
      return NextResponse.json({ success: true, result });
    }
    if (transaction.status !== "success") {
      const failed = transaction.status === "failed" || transaction.status === "abandoned";
      return NextResponse.json({
        success: false,
        paymentState: failed ? "failed" : "pending",
        error: failed
          ? "Paystack reports that this checkout did not complete. You can return to billing and try again."
          : "Paystack has not confirmed this payment yet. Please check again shortly.",
      }, { status: 409 });
    }
    const statement = await verifyPaystackPayment(admin, transaction);
    const result = await completePaystackStatement(admin, statement.id, reference, String(transaction.id));
    return NextResponse.json({ success: true, alreadyPaid: result.alreadyPaid });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Payment could not be verified." }, { status: 400 });
  }
}
