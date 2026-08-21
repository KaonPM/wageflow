import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../_lib/authorization";
import { issueStatement } from "../../_lib/billing";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const today = new Date();
  const statementMonth = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const { data: subscriptions, error } = await admin.from("subscriptions").select("id,business_id,plan_name,monthly_fee").eq("subscription_status", "active").in("plan_name", ["Starter", "Growth"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const businessIds = [...new Set((subscriptions || []).map((subscription) => subscription.business_id).filter(Boolean))] as string[];
  const { data: businesses, error: businessesError } = businessIds.length ? await admin.from("businesses").select("id,business_name,email").in("id", businessIds) : { data: [], error: null };
  if (businessesError) return NextResponse.json({ error: businessesError.message }, { status: 500 });
  const businessById = new Map((businesses || []).map((business) => [business.id, business]));

  let issued = 0;
  for (const subscription of subscriptions || []) {
    const business = businessById.get(subscription.business_id);
    if (!business || Number(subscription.monthly_fee || 0) <= 0) continue;
    const result = await issueStatement(admin, { subscriptionId: subscription.id, businessId: subscription.business_id, businessName: business.business_name, email: business.email, planName: subscription.plan_name, amount: Number(subscription.monthly_fee), statementType: "monthly", statementMonth });
    if (result.issued) issued += 1;
  }
  return NextResponse.json({ success: true, issued, statementMonth });
}
