import type { SupabaseClient } from "@supabase/supabase-js";
import { completePaystackStatement, verifyPaystackPayment } from "./billing";
import { verifyPaystackTransaction } from "./paystack";

export async function completeVerifiedPaystackReference(admin: SupabaseClient, reference: string) {
  const transaction = await verifyPaystackTransaction(reference);
  if (transaction.reference !== reference) throw new Error("Payment could not be verified.");
  const { data: attempt, error: attemptError } = await admin.from("application_payment_attempts").select("id,expected_amount,currency").eq("provider_reference", transaction.reference).maybeSingle();
  if (attemptError) throw new Error(attemptError.message);
  if (attempt) {
    if (transaction.status !== "success" || transaction.currency !== attempt.currency || Number(transaction.amount) !== Math.round(Number(attempt.expected_amount) * 100)) throw new Error("Payment could not be verified.");
    const { error } = await admin.rpc("complete_application_payment", { payment_attempt_id: attempt.id, provider_transaction: String(transaction.id), paid_amount_minor: Number(transaction.amount), paid_currency: transaction.currency, paid_at: transaction.paid_at || new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { kind: "initial" as const };
  }
  const statement = await verifyPaystackPayment(admin, transaction);
  await completePaystackStatement(admin, statement.id, transaction.reference, String(transaction.id));
  return { kind: "statement" as const };
}
