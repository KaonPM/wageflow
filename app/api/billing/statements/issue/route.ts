import { NextResponse } from "next/server";
import { requireRole } from "../../../_lib/authorization";
import { issueStatement } from "../../../_lib/billing";

export async function POST(request: Request) {
  const access = await requireRole(request, ["master", "master_admin"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json().catch(() => null) as { subscriptionId?: string } | null;
  const subscriptionId = String(body?.subscriptionId || "").trim();
  if (!subscriptionId) return NextResponse.json({ error: "Subscription is required." }, { status: 400 });

  const { data: subscription, error: subscriptionError } = await access.admin
    .from("subscriptions")
    .select("id,business_id,plan_name,setup_fee,setup_paid")
    .eq("id", subscriptionId)
    .maybeSingle();
  if (subscriptionError || !subscription?.business_id) return NextResponse.json({ error: subscriptionError?.message || "Subscription was not found." }, { status: 404 });
  if (subscription.setup_paid || Number(subscription.setup_fee || 0) <= 0 || !["Starter", "Growth"].includes(String(subscription.plan_name))) return NextResponse.json({ error: "This subscription has no setup charge to bill." }, { status: 400 });

  const { data: existing } = await access.admin.from("subscription_statements").select("id").eq("subscription_id", subscription.id).eq("statement_type", "setup").maybeSingle();
  if (existing) return NextResponse.json({ error: "A setup statement has already been issued." }, { status: 409 });

  const { data: business, error: businessError } = await access.admin.from("businesses").select("business_name,email").eq("id", subscription.business_id).maybeSingle();
  if (businessError || !business) return NextResponse.json({ error: businessError?.message || "Business was not found." }, { status: 404 });

  const result = await issueStatement(access.admin, { subscriptionId: subscription.id, businessId: subscription.business_id, businessName: business.business_name, email: business.email, planName: subscription.plan_name, amount: Number(subscription.setup_fee), statementType: "setup", statementMonth: new Date().toISOString().slice(0, 7) + "-01" });
  if (!result.issued) return NextResponse.json({ error: "The setup statement could not be issued." }, { status: 400 });
  return NextResponse.json({ success: true });
}
