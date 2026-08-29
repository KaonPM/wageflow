import type { SupabaseClient } from "@supabase/supabase-js";
import { isBillablePlan } from "./subscription";

type Statement = {
  subscriptionId: string;
  businessId: string;
  businessName: string;
  email: string | null;
  planName: string | null;
  amount: number;
  statementType: "setup" | "monthly";
  statementMonth: string;
};

export async function issueStatement(admin: SupabaseClient, statement: Statement) {
  if (!isBillablePlan(statement.planName) || statement.amount <= 0) return { issued: false, reason: "not_billable" };

  const { data: created, error } = await admin.from("subscription_statements").insert({
    subscription_id: statement.subscriptionId,
    business_id: statement.businessId,
    statement_type: statement.statementType,
    statement_month: statement.statementMonth,
    amount: statement.amount,
    recipient_email: statement.email,
  }).select("id").maybeSingle();

  if (error?.code === "23505") return { issued: false, reason: "already_issued" };
  if (error || !created) throw new Error(error?.message || "Statement could not be created.");

  return { issued: true, emailed: false };
}

export async function markStatementPaidAndEmail(admin: SupabaseClient, statementId: string, paymentReference?: string) {
  const { data: statement, error } = await admin.from("subscription_statements").select("id,subscription_id,business_id,statement_type,statement_month,amount,status").eq("id", statementId).maybeSingle();
  if (error || !statement) throw new Error(error?.message || "Statement not found.");
  if (statement.status === "emailed") return { emailed: false, reason: "already_emailed" };
  const [{ data: subscription, error: subscriptionError }, { data: business, error: businessError }] = await Promise.all([
    admin.from("subscriptions").select("plan_name").eq("id", statement.subscription_id).maybeSingle(),
    admin.from("businesses").select("business_name,email").eq("id", statement.business_id).maybeSingle(),
  ]);
  if (subscriptionError || businessError || !subscription || !business) throw new Error(subscriptionError?.message || businessError?.message || "Billing details could not be loaded.");
  const update = await admin.from("subscription_statements").update({ status: "paid", paid_at: new Date().toISOString(), payment_reference: paymentReference?.trim().slice(0, 120) || null }).eq("id", statement.id);
  if (update.error) throw new Error(update.error.message);
  if (statement.statement_type === "setup") {
    const { error: setupError } = await admin.from("subscriptions").update({ setup_paid: true }).eq("id", statement.subscription_id);
    if (setupError) throw new Error(setupError.message);
  }
  if (!business.email) {
    await admin.from("subscription_statements").update({ status: "email_failed", email_error: "The business has no billing email address." }).eq("id", statement.id);
    return { emailed: false, reason: "no_email" };
  }
  const delivery = await sendStatementEmail({ subscriptionId: statement.subscription_id, businessId: statement.business_id, businessName: business.business_name, email: business.email, planName: subscription.plan_name, amount: Number(statement.amount), statementType: statement.statement_type as "setup" | "monthly", statementMonth: statement.statement_month });
  await admin.from("subscription_statements").update(delivery.ok
    ? { status: "emailed", emailed_at: new Date().toISOString(), email_error: null }
    : { status: "email_failed", email_error: delivery.error.slice(0, 500) }
  ).eq("id", statement.id);
  return { emailed: delivery.ok, reason: delivery.ok ? undefined : delivery.error };
}

export async function resendStatementEmail(admin: SupabaseClient, statementId: string) {
  const { data: statement, error } = await admin.from("subscription_statements").select("id,subscription_id,business_id,statement_type,statement_month,amount,paid_at").eq("id", statementId).maybeSingle();
  if (error || !statement) throw new Error(error?.message || "Statement not found.");
  if (!statement.paid_at) throw new Error("Record the payment before resending this statement.");
  const [{ data: subscription, error: subscriptionError }, { data: business, error: businessError }] = await Promise.all([
    admin.from("subscriptions").select("plan_name").eq("id", statement.subscription_id).maybeSingle(),
    admin.from("businesses").select("business_name,email").eq("id", statement.business_id).maybeSingle(),
  ]);
  if (subscriptionError || businessError || !subscription || !business) throw new Error(subscriptionError?.message || businessError?.message || "Billing details could not be loaded.");
  if (!business.email) throw new Error("The business has no billing email address.");
  const delivery = await sendStatementEmail({ subscriptionId: statement.subscription_id, businessId: statement.business_id, businessName: business.business_name, email: business.email, planName: subscription.plan_name, amount: Number(statement.amount), statementType: statement.statement_type as "setup" | "monthly", statementMonth: statement.statement_month });
  const { error: updateError } = await admin.from("subscription_statements").update(delivery.ok
    ? { status: "emailed", emailed_at: new Date().toISOString(), email_error: null }
    : { status: "email_failed", email_error: delivery.error.slice(0, 500) }
  ).eq("id", statement.id);
  if (updateError) throw new Error(updateError.message);
  return { emailed: delivery.ok, reason: delivery.ok ? undefined : delivery.error };
}

async function sendStatementEmail(statement: Statement) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  if (!apiKey || !fromEmail) return { ok: false, error: "Brevo billing email is not configured." };

  const label = statement.statementType === "setup" ? "Once-off setup payment" : "Monthly subscription payment";
  const amount = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(statement.amount);
  const month = new Date(`${statement.statementMonth}T00:00:00Z`).toLocaleDateString("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" });
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify({
      sender: { name: "WageFlow Billing", email: fromEmail },
      to: [{ email: statement.email, name: statement.businessName }],
      subject: `WageFlow payment statement — ${label}`,
      htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>WageFlow payment statement</h2><p>Hello ${escapeHtml(statement.businessName)},</p><p>We confirm receipt of your ${escapeHtml(label.toLowerCase())} for <strong>${escapeHtml(month)}</strong>.</p><p><strong>Amount paid: ${amount}</strong><br>Plan: ${escapeHtml(statement.planName || "")}</p><p>Thank you for choosing WageFlow.</p></div>`,
    }),
  });
  return response.ok ? { ok: true, error: "" } : { ok: false, error: `Brevo rejected the statement email (${response.status}).` };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}
