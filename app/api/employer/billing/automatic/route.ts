import { NextResponse } from "next/server";
import { requireRole } from "../../../_lib/authorization";
import { hasEmployerBillingPermission } from "../../../_lib/employerBillingAccess";
import { verifyPaystackTransaction } from "../../../_lib/paystack";
import { encryptAuthorization } from "../../../_lib/autoBillingCrypto";

export const runtime = "nodejs";

async function accessFor(request: Request) {
  const access = await requireRole(request, ["employer", "employer_admin"]);
  if ("error" in access) return { error: access.error, status: access.status } as const;
  if (!hasEmployerBillingPermission(access.profile)) return { error: "Billing access is required.", status: 403 } as const;
  const businessId = String(access.profile.business_id || "");
  if (!businessId) return { error: "Select an active business.", status: 400 } as const;
  const { data: membership, error } = await access.admin.from("employer_business_memberships")
    .select("business_id").eq("employer_id", access.user.id).eq("business_id", businessId)
    .eq("is_active", true).maybeSingle();
  if (error || !membership) return { error: "You do not have access to this billing account.", status: 403 } as const;
  const { data: subscription, error: subscriptionError } = await access.admin.from("subscriptions")
    .select("id,business_id,plan_name,monthly_fee,subscription_status")
    .eq("business_id", businessId).maybeSingle();
  if (subscriptionError || !subscription) return { error: "Subscription not found.", status: 404 } as const;
  return { ...access, businessId, subscription };
}

export async function GET(request: Request) {
  const access = await accessFor(request);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (process.env.AUTOMATIC_BILLING_ENABLED !== "true") {
    return NextResponse.json({ available: false, enabled: false, cardBrand: null, last4: null, consentedAt: null },
      { headers: { "Cache-Control": "private, no-store" } });
  }
  const { data, error } = await access.admin.from("subscription_auto_payment_methods")
    .select("card_brand,card_last4,consented_at,revoked_at,authorized_plan,authorized_amount,paystack_mode")
    .eq("subscription_id", access.subscription.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Payment method could not be loaded." }, { status: 500 });
  const eligible = Boolean(data && !data.revoked_at && data.authorized_plan === access.subscription.plan_name
    && Number(data.authorized_amount) >= Number(access.subscription.monthly_fee)
    && data.paystack_mode === process.env.PAYSTACK_MODE);
  return NextResponse.json({ available: true, enabled: eligible,
    cardBrand: eligible ? data?.card_brand || null : null,
    last4: eligible ? data?.card_last4 || null : null,
    consentedAt: eligible ? data?.consented_at || null : null,
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const access = await accessFor(request);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => null) as { consent?: boolean } | null;
  if (body?.consent !== true) return NextResponse.json({ error: "Confirm your recurring payment authorization." }, { status: 400 });
  if (process.env.AUTOMATIC_BILLING_ENABLED !== "true") {
    return NextResponse.json({ error: "Automatic payment is not yet available." }, { status: 503 });
  }
  if (access.subscription.subscription_status !== "active" || !["Starter", "Growth"].includes(access.subscription.plan_name)
    || Number(access.subscription.monthly_fee) <= 0) {
    return NextResponse.json({ error: "Automatic payment requires an active paid plan." }, { status: 409 });
  }
  if (process.env.PAYSTACK_MODE !== "test" && process.env.PAYSTACK_MODE !== "live") {
    return NextResponse.json({ error: "Paystack mode is not configured." }, { status: 503 });
  }
  const { data: statements, error: statementError } = await access.admin.from("subscription_statements")
    .select("payment_reference,amount").eq("subscription_id", access.subscription.id)
    .eq("business_id", access.businessId).not("paid_at", "is", null)
    .eq("payment_provider", "paystack").order("paid_at", { ascending: false }).limit(5);
  const { data: signup, error: signupError } = await access.admin.from("application_initial_payments")
    .select("id,total_amount").eq("subscription_id", access.subscription.id)
    .eq("business_id", access.businessId).eq("status", "verified").limit(1).maybeSingle();
  if (statementError || signupError) return NextResponse.json({ error: "Payment history could not be checked." }, { status: 500 });
  const candidates = (statements || []).filter((s) => s.payment_reference)
    .map((s) => ({ reference: String(s.payment_reference), amount: Number(s.amount) }));
  if (signup) {
    const { data: attempt, error } = await access.admin.from("application_payment_attempts")
      .select("provider_reference,expected_amount").eq("initial_payment_id", signup.id)
      .eq("status", "verified").limit(1).maybeSingle();
    if (error) return NextResponse.json({ error: "Signup payment could not be checked." }, { status: 500 });
    if (attempt) candidates.push({ reference: attempt.provider_reference, amount: Number(attempt.expected_amount) });
  }
  for (const candidate of candidates) {
    const transaction = await verifyPaystackTransaction(candidate.reference).catch(() => null);
    const authorization = transaction?.authorization;
    const email = String(transaction?.customer?.email || "").trim().toLowerCase();
    if (transaction?.status !== "success" || transaction.reference !== candidate.reference
      || transaction.currency !== "ZAR" || transaction.amount !== Math.round(candidate.amount * 100)
      || authorization?.reusable !== true || authorization.channel !== "card"
      || !authorization.authorization_code || !/^\S+@\S+\.\S+$/.test(email)
      || !/^[0-9]{4}$/.test(String(authorization.last4 || ""))) continue;
    let ciphertext: string;
    try { ciphertext = encryptAuthorization(authorization.authorization_code); }
    catch { return NextResponse.json({ error: "Automatic billing is not configured. Contact support." }, { status: 503 }); }
    const { data: saved, error } = await access.admin.rpc("set_subscription_auto_payment_method", {
      subscription_id_input: access.subscription.id, business_id_input: access.businessId,
      actor_input: access.user.id, ciphertext_input: ciphertext, email_input: email,
      brand_input: String(authorization.brand || "Card").slice(0, 40), last4_input: authorization.last4,
      mode_input: process.env.PAYSTACK_MODE,
    });
    if (error || saved !== true) return NextResponse.json({ error: "Automatic payment could not be enabled." }, { status: 409 });
    return NextResponse.json({ enabled: true, cardBrand: authorization.brand || "Card", last4: authorization.last4 });
  }
  return NextResponse.json({ error: "No reusable card was found on your verified WageFlow payments. Pay your next statement by card, then return here to enable automatic payment." }, { status: 409 });
}

export async function DELETE(request: Request) {
  const access = await accessFor(request);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { error } = await access.admin.rpc("revoke_subscription_auto_payment_method", {
    subscription_id_input: access.subscription.id, business_id_input: access.businessId,
  });
  if (error) return NextResponse.json({ error: "Automatic payment could not be disabled." }, { status: 500 });
  return NextResponse.json({ enabled: false });
}
