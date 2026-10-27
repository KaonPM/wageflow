import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../_lib/authorization";
import { initializePaystackTransaction } from "../../_lib/paystack";
import { checkRateLimit, isSameOrigin } from "../../_lib/rateLimit";
import { tokenHash } from "../../_lib/applicationWorkflow";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  if (!checkRateLimit(request, "application-payment", 10, 15 * 60_000).allowed) return NextResponse.json({ error: "Please try again later." }, { status: 429 });
  const body = await request.json().catch(() => null) as { token?: string } | null; const token = String(body?.token || "");
  if (token.length < 40) return NextResponse.json({ error: "This payment link is unavailable." }, { status: 404 });
  const admin = getSupabaseAdmin(); const { data: attempt, error } = await admin.from("application_payment_attempts").select("id,provider_reference,expected_amount,currency,expires_at,status,initial_payment_id,application_initial_payments!inner(application_id,wageflow_setup_requests!inner(email,lifecycle_status))").eq("payment_link_token_hash", tokenHash(token)).maybeSingle();
  if (error || !attempt || new Date(attempt.expires_at) <= new Date() || !["created","initialized","pending"].includes(attempt.status)) return NextResponse.json({ error: "This payment link is unavailable." }, { status: 404 });
  const nested = attempt.application_initial_payments as unknown as { application_id:string; wageflow_setup_requests:{email:string;lifecycle_status:string} };
  if (nested.wageflow_setup_requests.lifecycle_status !== "awaiting_initial_payment") return NextResponse.json({ error: "This payment link is unavailable." }, { status: 404 });
  try { const authorizationUrl = await initializePaystackTransaction({ email:nested.wageflow_setup_requests.email, amount:Number(attempt.expected_amount), reference:attempt.provider_reference, callbackUrl:new URL(`/pay/${token}`,request.url).toString(), statementId:attempt.initial_payment_id, businessId:nested.application_id }); await admin.from("application_payment_attempts").update({ status:"initialized", initialized_at:new Date().toISOString() }).eq("id",attempt.id); return NextResponse.json({ authorizationUrl }); } catch { return NextResponse.json({ error:"Checkout is temporarily unavailable." },{status:502}); }
}
