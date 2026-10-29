import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../_lib/authorization";
import { completeVerifiedPaystackReference } from "../../../_lib/paystackCompletion";
import { hasValidPaystackSignature } from "../../../_lib/paystack";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!hasValidPaystackSignature(rawBody, request.headers.get("x-paystack-signature"))) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  let event: { event?: string; data?: { reference?: string; id?: string | number } };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return NextResponse.json({ error: "Malformed webhook payload." }, { status: 400 });
  }
  if (event.event !== "charge.success" || !event.data?.reference) return NextResponse.json({ received: true });
  const eventKey = `paystack:${event.data.id || createHash("sha256").update(rawBody).digest("hex")}`;
  const admin = getSupabaseAdmin();
  try {
    const eventInsert = await admin.from("payment_webhook_events").insert({ provider: "paystack", event_key: eventKey, provider_reference: event.data.reference, event_type: event.event });
    if (eventInsert.error?.code === "23505") return NextResponse.json({ received: true, duplicate: true });
    if (eventInsert.error) throw new Error(eventInsert.error.message);
    await completeVerifiedPaystackReference(admin, event.data.reference);
    await admin.from("payment_webhook_events").update({ processed_at: new Date().toISOString() }).eq("event_key", eventKey);
  } catch (error) {
    await admin.from("payment_webhook_events").update({ processing_error: error instanceof Error ? error.message.slice(0, 500) : "Unknown processing error" }).eq("event_key", eventKey);
    console.error("Paystack webhook processing failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Payment could not be processed." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
