import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../_lib/authorization";
import { EmployerOnboardingError, createEmployerPasswordSetupLink, employerPasswordSetupHtml, provisionEmployerOnboarding, queueEmployerPasswordSetup } from "../../_lib/employerOnboarding";
import { queueEmail } from "../../_lib/applicationWorkflow";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  try {
    const admin = getSupabaseAdmin();
    const summary = { scheduled: 0, scheduleSkipped: 0, archived: 0, closureQueued: 0, delivered: 0, cancelled: 0, failed: 0, issues: [] as string[] };
    try {
      await queuePendingPaymentReminders(admin, request, summary);
    } catch {
      summary.issues.push("reminder_scheduling_scan_failed");
    }
    const { data: outbox, error: claimError } = await admin.rpc("claim_email_outbox", { max_rows: 50, lease_seconds: 300 });
    if (claimError || !Array.isArray(outbox)) {
      summary.issues.push("outbox_claim_failed");
      return NextResponse.json({ success: false, ...summary }, { status: 500 });
    }
    for (const item of outbox) {
      const result = await deliverOutboxItem(admin, item as Record<string, unknown>, request);
      if (result === "delivered") summary.delivered += 1;
      else if (result === "cancelled") summary.cancelled += 1;
      else if (result !== "skipped") summary.failed += 1;
      if (result !== "delivered" && result !== "cancelled" && result !== "skipped") summary.issues.push(result);
    }
    return NextResponse.json({ success: summary.issues.length === 0, ...summary }, { status: summary.issues.length ? 500 : 200 });
  } catch {
    return NextResponse.json({ success: false, issues: ["reminder_worker_failed"] }, { status: 500 });
  }
}

type Summary = { scheduled: number; scheduleSkipped: number; archived: number; closureQueued: number; delivered: number; cancelled: number; failed: number; issues: string[] };
type Payment = { id: string; application_id: string; created_at: string; wageflow_setup_requests: { email: string; business_name: string; lifecycle_status: string } };

async function loadPayments(admin: ReturnType<typeof getSupabaseAdmin>, lifecycle: string): Promise<Payment[]> {
  const payments: Payment[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await admin.from("application_initial_payments")
      .select("id,application_id,created_at,wageflow_setup_requests!inner(email,business_name,lifecycle_status)")
      .in("status", ["awaiting_payment", "payment_pending"])
      .eq("wageflow_setup_requests.lifecycle_status", lifecycle).order("id").range(offset, offset + 499);
    if (error || !Array.isArray(data)) throw new Error("payment_list_failed");
    payments.push(...data as unknown as Payment[]);
    if (data.length < 500) break;
  }
  return payments;
}

async function queueClosure(admin: ReturnType<typeof getSupabaseAdmin>, payment: Payment, summary: Summary) {
  const application = payment.wageflow_setup_requests;
  try {
    const result = await queueEmail(admin, { idempotencyKey: `initial-payment-closure:${payment.id}`, eventType: "initial_payment_closure", recipient: application.email, applicationId: payment.application_id, initialPaymentId: payment.id, payload: { businessName: application.business_name } });
    if (result.queued) summary.closureQueued += 1;
  } catch {
    summary.issues.push("closure_queue_failed");
  }
}

async function queuePendingPaymentReminders(admin: ReturnType<typeof getSupabaseAdmin>, request: Request, summary: Summary) {
  const payments = await loadPayments(admin, "awaiting_initial_payment");
  const now = Date.now();
  for (const payment of payments) {
    const application = payment.wageflow_setup_requests;
    const ageDays = (now - new Date(payment.created_at).getTime()) / 86_400_000;
    if (ageDays >= 14) {
      const { data: archived, error } = await admin.rpc("archive_unpaid_application", { application_id_input: payment.application_id });
      if (error) summary.issues.push("archive_rpc_failed");
      else if (archived === "archived") { summary.archived += 1; await queueClosure(admin, payment, summary); }
      else if (archived !== "not_eligible" && archived !== "not_found") summary.issues.push("archive_result_unexpected");
      continue;
    }
    const day = [7, 3, 1].find((value) => ageDays >= value);
    if (!day) continue;
    const key = `initial-payment-reminder:${payment.id}:${day}`;
    const { data: scheduled, error } = await admin.rpc("schedule_application_payment_reminder", { application_id_input: payment.application_id, reminder_key: key, recipient_input: application.email, business_name_input: application.business_name, reminder_day: day, origin_input: new URL(request.url).origin });
    if (error) summary.issues.push("reminder_schedule_failed");
    else if (scheduled === true) summary.scheduled += 1;
    else if (scheduled === false) summary.scheduleSkipped += 1;
    else summary.issues.push("reminder_schedule_result_unexpected");
  }
  // An archived payment remains queryable after a failed outbox insert. The unique key suppresses repeat jobs.
  for (const payment of await loadPayments(admin, "archived")) await queueClosure(admin, payment, summary);
}

async function deliverOutboxItem(admin: ReturnType<typeof getSupabaseAdmin>, item: Record<string, unknown>, request: Request) {
  const claim = String(item.claim_token || "");
  const applicationId = String(item.application_id || "");
  const retryAfter = Math.max(60, Number(item.attempt_count || 1) * 900);
  let providerAccepted = false;
  try {
    if (!claim || !item.id) throw new WorkerFailure("outbox_claim_invalid");
    if (item.event_type === "activation_credentials") {
      const businessId = String((item.payload as Record<string, unknown> | null)?.business_id || "");
      if (!applicationId || !businessId) throw new EmployerOnboardingError("The activation event is incomplete.", true);
      const { context } = await provisionEmployerOnboarding(admin, { applicationId, businessId, claimToken: claim });
      await queueEmployerPasswordSetup(admin, context);
      await finishOutbox(admin, item.id, claim, true, 0, null);
      return "skipped";
    }
    if (item.event_type === "employer_password_setup") {
      if (!applicationId) throw new EmployerOnboardingError("The password setup event is incomplete.", true);
      const { context, setupUrl } = await createEmployerPasswordSetupLink(admin, { applicationId, origin: new URL(request.url).origin });
      const response = await sendBrevo(String(item.recipient_email), "Your WageFlow employer account is ready", employerPasswordSetupHtml(context.contactName, context.email, setupUrl));
      providerAccepted = Boolean(response?.ok);
      const { data, error } = await admin.rpc("finish_employer_password_setup_email", { outbox_id: item.id, claim, delivered: providerAccepted, retry_after_seconds: retryAfter, error_detail: providerAccepted ? null : "Email provider did not accept the message." });
      if (error || data !== true) throw new WorkerFailure("employer_email_finish_failed");
      return providerAccepted ? "delivered" : "email_provider_rejected";
    }
    const payload = item.payload as Record<string, unknown> | null;
    const link = typeof payload?.paymentUrl === "string" ? `<p><a href="${escape(payload.paymentUrl)}">Pay securely with Paystack</a></p>` : "";
    const html = `<div style="font-family:Arial,sans-serif"><h2>WageFlow</h2><p>${escape(messageFor(String(item.event_type), payload || {}))}</p>${link}</div>`;
    if (item.event_type === "initial_payment_request" || item.event_type === "initial_payment_reminder") {
      const { data: eligible, error: eligibilityError } = await admin.rpc("can_deliver_application_payment_email", { outbox_id_input: item.id, worker_claim: claim });
      if (eligibilityError) throw new WorkerFailure("payment_email_eligibility_failed");
      if (eligible === false) {
        const { data: cancelled, error: cancelError } = await admin.rpc("cancel_email_outbox", { outbox_id_input: item.id, worker_claim: claim, cancellation_reason: "Payment link is no longer eligible for delivery." });
        if (cancelError || cancelled !== true) throw new WorkerFailure("payment_email_cancel_failed");
        return "cancelled";
      }
      if (eligible !== true) throw new WorkerFailure("payment_email_eligibility_unexpected");
    }
    const response = await sendBrevo(String(item.recipient_email), subjectFor(String(item.event_type)), html);
    providerAccepted = Boolean(response?.ok);
    await finishOutbox(admin, item.id, claim, providerAccepted, retryAfter, providerAccepted ? null : "Email provider did not accept the message.");
    return providerAccepted ? "delivered" : "email_provider_rejected";
  } catch (error) {
    // Provider acceptance is uncertain after a failed DB finish. Quarantine with the same claim
    // rather than knowingly retrying a message Brevo accepted. A DB outage can still defeat this.
    if (providerAccepted) {
      try {
        const { data, error: quarantineError } = await admin.from("email_outbox")
          .update({ status: "permanently_failed", last_error: "Provider accepted email; delivery confirmation requires manual review.", claim_token: null, claimed_at: null, lease_expires_at: null, updated_at: new Date().toISOString() })
          .eq("id", item.id).eq("status", "processing").eq("claim_token", claim).select("id").maybeSingle();
        return !quarantineError && data ? "provider_accepted_manual_review" : "provider_accepted_unresolved";
      } catch {
        return "provider_accepted_unresolved";
      }
    }
    const onboardingError = error instanceof EmployerOnboardingError ? error : null;
    if (item.event_type === "activation_credentials" && applicationId && claim && onboardingError?.requiresManualRecovery) {
      const { error: recoveryError } = await admin.rpc("fail_application_employer_onboarding", { application_id_input: applicationId, worker_claim: claim, error_detail: onboardingError.message, requires_manual_recovery: true });
      if (recoveryError) return "onboarding_recovery_failed";
    }
    try {
      await finishOutbox(admin, item.id, claim, false, retryAfter, onboardingError?.message || "Outbox processing failed.");
    } catch {
      return "outbox_recovery_failed";
    }
    return error instanceof WorkerFailure ? error.code : "outbox_delivery_failed";
  }
}

class WorkerFailure extends Error {
  constructor(readonly code: string) { super(code); }
}

async function finishOutbox(admin: ReturnType<typeof getSupabaseAdmin>, outboxId: unknown, claim: string, delivered: boolean, retryAfter: number, detail: string | null) {
  const { data, error } = await admin.rpc("finish_email_outbox", { outbox_id: outboxId, claim, delivered, retry_after_seconds: retryAfter, error_detail: detail });
  if (error || data !== true) throw new WorkerFailure("outbox_finish_failed");
}

async function sendBrevo(to: string, subject: string, htmlContent: string) {
  if (!process.env.BREVO_API_KEY || !process.env.BREVO_FROM_EMAIL) return null;
  return fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "Content-Type": "application/json", "api-key": process.env.BREVO_API_KEY }, body: JSON.stringify({ sender: { name: "WageFlow", email: process.env.BREVO_FROM_EMAIL }, to: [{ email: to }], subject, htmlContent }), signal: AbortSignal.timeout(30_000) });
}
function subjectFor(type: string) { return ({ application_acknowledgement: "We received your WageFlow application", application_admin_alert: "New WageFlow application", initial_payment_request: "Your WageFlow payment link", initial_payment_reminder: "WageFlow payment reminder", initial_payment_closure: "WageFlow application archived" } as Record<string, string>)[type] || "WageFlow update"; }
function messageFor(type: string, payload: Record<string, unknown>) { const name = String(payload.businessName || "your business"); if (type === "application_acknowledgement") return `We received the application for ${name}. Our team will review it shortly.`; if (type === "initial_payment_request") return "Your application was approved for payment. Use the secure link in this email to complete the initial payment."; if (type === "initial_payment_closure") return `The payment window for ${name} has closed. You may submit a new application later.`; return `There is an update regarding ${name}.`; }
function escape(value: string) { return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character); }
