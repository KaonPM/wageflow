import { createHash, randomBytes, randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function newPaymentToken() { return randomBytes(32).toString("base64url"); }
export function newPaystackReference() { return `wf-app-${randomUUID()}`; }

export async function queueEmail(admin: SupabaseClient, input: {
  idempotencyKey: string; eventType: string; recipient: string; applicationId?: string; initialPaymentId?: string; payload: Record<string, unknown>;
}) {
  const result = await admin.from("email_outbox").insert({
    idempotency_key: input.idempotencyKey, event_type: input.eventType, recipient_email: input.recipient,
    application_id: input.applicationId || null, initial_payment_id: input.initialPaymentId || null, payload: input.payload,
  });
  if (result.error?.code === "23505") return { queued: false, duplicate: true };
  if (result.error) throw new Error(result.error.message);
  return { queued: true, duplicate: false };
}

export async function prepareInitialPayment(admin: SupabaseClient, input: {
  application: { id: string; business_name: string; email: string; phone?: string | null; selected_package: string; number_of_employees: number; default_employee_portal_enabled?: boolean | null };
  actorId: string; origin: string;
}) {
  const { application } = input;
  const { data: existingBusiness, error: businessLookupError } = await admin.from("businesses").select("id").eq("source_request_id", application.id).maybeSingle();
  if (businessLookupError) throw new Error(businessLookupError.message);
  let businessId = existingBusiness?.id as string | undefined;
  if (!businessId) {
    const { data, error } = await admin.from("businesses").insert({
      business_name: application.business_name, email: application.email, phone: application.phone || null, status: "pending_payment",
      source_request_id: application.id, selected_package: normalisePlan(application.selected_package), number_of_employees: application.number_of_employees,
      default_employee_portal_enabled: application.default_employee_portal_enabled === true,
    }).select("id").single();
    if (error || !data) throw new Error(error?.message || "Business could not be prepared.");
    businessId = data.id;
  }
  const plan = normalisePlan(application.selected_package);
  const monthlyFee = plan === "Growth" ? 299 : plan === "Starter" ? 199 : 0;
  const setupFee = monthlyFee > 0 ? 249 : 0;
  const { data: subscription, error: subscriptionError } = await admin.from("subscriptions").upsert({
    business_id: businessId, plan_name: plan, monthly_fee: monthlyFee, setup_fee: setupFee, setup_paid: monthlyFee === 0, subscription_status: "pending",
  }, { onConflict: "business_id" }).select("id,monthly_fee,setup_fee").single();
  if (subscriptionError || !subscription) throw new Error(subscriptionError?.message || "Subscription could not be prepared.");
  const coveredMonth = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}-01`;
  const { data: payment, error: paymentError } = await admin.from("application_initial_payments").upsert({
    application_id: application.id, business_id: businessId, subscription_id: subscription.id, setup_amount: Number(subscription.setup_fee || 0),
    first_month_amount: Number(subscription.monthly_fee || 0), total_amount: Number(subscription.setup_fee || 0) + Number(subscription.monthly_fee || 0), covered_month: coveredMonth,
  }, { onConflict: "application_id", ignoreDuplicates: true }).select("id,total_amount,status").maybeSingle();
  if (paymentError) throw new Error(paymentError.message);
  const initialPayment = payment || (await admin.from("application_initial_payments").select("id,total_amount,status").eq("application_id", application.id).single()).data;
  if (!initialPayment) throw new Error("Initial payment could not be prepared.");
  let token: string | null = null;
  if (["awaiting_payment", "payment_pending"].includes(String(initialPayment.status))) {
    const { data: attempt } = await admin.from("application_payment_attempts").select("id").eq("initial_payment_id", initialPayment.id).in("status", ["created", "initialized", "pending"]).maybeSingle();
    if (!attempt) {
      token = newPaymentToken();
      const { error: attemptError } = await admin.from("application_payment_attempts").insert({
        initial_payment_id: initialPayment.id, provider_reference: newPaystackReference(), payment_link_token_hash: tokenHash(token), expected_amount: initialPayment.total_amount,
        expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
      });
      if (attemptError) throw new Error(attemptError.message);
    }
  }
  await admin.from("wageflow_setup_requests").update({ lifecycle_status: "awaiting_initial_payment", status: "Awaiting Initial Payment", initial_reviewed_at: new Date().toISOString(), initial_reviewed_by: input.actorId }).eq("id", application.id);
  if (token) await queueEmail(admin, { idempotencyKey: `initial-payment:${initialPayment.id}`, eventType: "initial_payment_request", recipient: application.email, applicationId: application.id, initialPaymentId: initialPayment.id, payload: { businessName: application.business_name, paymentUrl: new URL(`/pay/${token}`, input.origin).toString() } });
  return { businessId, initialPaymentId: initialPayment.id, paymentRequestCreated: Boolean(token) };
}

function normalisePlan(value: string) {
  return ["Starter", "Growth"].includes(value) ? value : "Growth Included";
}
