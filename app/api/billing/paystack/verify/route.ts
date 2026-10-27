import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../_lib/authorization";
import { completePaystackStatement, verifyPaystackPayment } from "../../../_lib/billing";
import { verifyPaystackTransaction } from "../../../_lib/paystack";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { reference?: string } | null;
  const reference = String(body?.reference || "").trim();
  if (!/^[-.=A-Za-z0-9]{12,200}$/.test(reference)) return NextResponse.json({ error: "Invalid payment reference." }, { status: 400 });
  const admin = getSupabaseAdmin();
  try {
    const transaction = await verifyPaystackTransaction(reference);
    const { data: attempt } = await admin.from("application_payment_attempts").select("id,expected_amount,currency,status").eq("provider_reference", reference).maybeSingle();
    if (attempt) {
      if (transaction.status !== "success" || transaction.currency !== attempt.currency || Number(transaction.amount) !== Math.round(Number(attempt.expected_amount) * 100)) throw new Error("Payment could not be verified.");
      const { data: result, error } = await admin.rpc("process_application_payment_success", { payment_attempt: attempt.id, provider_tx_id: String(transaction.id), paid_at: transaction.paid_at || new Date().toISOString() });
      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true, result });
    }
    const statement = await verifyPaystackPayment(admin, transaction);
    const result = await completePaystackStatement(admin, statement.id, reference);
    return NextResponse.json({ success: true, alreadyPaid: result.alreadyPaid });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Payment could not be verified." }, { status: 400 });
  }
}
