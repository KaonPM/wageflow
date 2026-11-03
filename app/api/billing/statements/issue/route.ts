import { NextResponse } from "next/server";
import { requireRole } from "../../../_lib/authorization";
import { issueStatement } from "../../../_lib/billing";

export async function POST(request: Request) {
  const access = await requireRole(request, ["master", "master_admin"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json().catch(() => null) as { subscriptionId?: string; statementType?: string } | null;
  const subscriptionId = String(body?.subscriptionId || "").trim();
  if (!subscriptionId) return NextResponse.json({ error: "Subscription is required." }, { status: 400 });
  const statementType = body?.statementType || "setup";
  if (statementType !== "setup" && statementType !== "monthly") return NextResponse.json({ error: "Invalid statement type." }, { status: 400 });

  const { data: subscription, error: subscriptionError } = await access.admin
    .from("subscriptions")
    .select("id,business_id,plan_name,setup_fee,setup_paid,monthly_fee,subscription_status")
    .eq("id", subscriptionId)
    .maybeSingle();
  if (subscriptionError || !subscription?.business_id) return NextResponse.json({ error: subscriptionError?.message || "Subscription was not found." }, { status: 404 });
  const billablePlan = ["Starter", "Growth"].includes(String(subscription.plan_name));
  const statementMonth = new Date().toISOString().slice(0, 7) + "-01";
  if (statementType === "setup") {
    if (subscription.setup_paid || Number(subscription.setup_fee || 0) <= 0 || !billablePlan) return NextResponse.json({ error: "This subscription has no setup charge to bill." }, { status: 400 });
  } else if (!billablePlan || subscription.subscription_status !== "active" || Number(subscription.monthly_fee || 0) <= 0) {
    return NextResponse.json({ error: "This subscription has no active monthly charge to bill." }, { status: 400 });
  }

  const signupPaymentQuery = access.admin.from("application_initial_payments").select("id")
    .eq("subscription_id", subscription.id).eq("status", "verified");
  const { data: signupPayment, error: signupPaymentError } = statementType === "setup"
    ? await signupPaymentQuery.gt("setup_amount", 0).limit(1).maybeSingle()
    : await signupPaymentQuery.eq("covered_month", statementMonth).limit(1).maybeSingle();
  if (signupPaymentError) return NextResponse.json({ error: "Signup payment could not be checked." }, { status: 500 });
  if (signupPayment) return NextResponse.json({ error: statementType === "setup" ? "The setup fee was already paid at signup." : "This month was already covered by the signup payment." }, { status: 409 });

  const existingQuery = access.admin.from("subscription_statements").select("id").eq("subscription_id", subscription.id).eq("statement_type", statementType);
  const { data: existing, error: existingError } = statementType === "setup"
    ? await existingQuery.maybeSingle()
    : await existingQuery.eq("statement_month", statementMonth).maybeSingle();
  if (existingError) return NextResponse.json({ error: "Existing statements could not be checked." }, { status: 500 });
  if (existing) return NextResponse.json({ error: statementType === "setup" ? "A setup statement has already been issued." : "This month's statement has already been issued." }, { status: 409 });

  const { data: business, error: businessError } = await access.admin.from("businesses").select("business_name,email").eq("id", subscription.business_id).maybeSingle();
  if (businessError || !business) return NextResponse.json({ error: businessError?.message || "Business was not found." }, { status: 404 });

  const result = await issueStatement(access.admin, { subscriptionId: subscription.id, businessId: subscription.business_id, businessName: business.business_name, email: business.email, planName: subscription.plan_name, amount: Number(statementType === "setup" ? subscription.setup_fee : subscription.monthly_fee), statementType, statementMonth });
  if (!result.issued) return NextResponse.json({ error: result.reason === "already_issued" ? "This statement has already been issued." : "The statement could not be issued." }, { status: result.reason === "already_issued" ? 409 : 400 });
  return NextResponse.json({ success: true });
}
