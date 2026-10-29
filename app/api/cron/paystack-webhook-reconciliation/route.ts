import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../_lib/authorization";
import { completeVerifiedPaystackReference } from "../../_lib/paystackCompletion";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data: events, error } = await admin.rpc("claim_failed_payment_webhook_events", { max_rows: 25, lease_seconds: 300 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let reconciled = 0;
  for (const event of events || []) {
    const retryAfter = Math.max(60, Number(event.processing_attempt_count || 1) * 900);
    try {
      if (!event.provider_reference || event.provider !== "paystack" || event.event_type !== "charge.success") throw new Error("Webhook event is not eligible for reconciliation.");
      await completeVerifiedPaystackReference(admin, event.provider_reference);
      await admin.rpc("finish_failed_payment_webhook_event", { event_id_input: event.id, claim_input: event.processing_claim, processed: true, retry_after_seconds: 0, error_detail: null });
      reconciled += 1;
    } catch (failure) {
      await admin.rpc("finish_failed_payment_webhook_event", { event_id_input: event.id, claim_input: event.processing_claim, processed: false, retry_after_seconds: retryAfter, error_detail: failure instanceof Error ? failure.message : "Webhook reconciliation failed." });
    }
  }
  return NextResponse.json({ success: true, reconciled });
}
