import { NextResponse } from "next/server";
import { requireRole } from "../_lib/authorization";
import { isGrowthPlan } from "../_lib/subscription";

export async function GET(request: Request) {
  const access = await requireRole(request, ["employer", "employee"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  let businessId = access.profile.business_id;

  if (!businessId && String(access.profile.role).toLowerCase() === "employee") {
    const { data: account } = await access.admin
      .from("employee_accounts")
      .select("employee_id")
      .eq("auth_user_id", access.user.id)
      .eq("portal_enabled", true)
      .maybeSingle();

    if (account?.employee_id) {
      const { data: employee } = await access.admin
        .from("employees")
        .select("business_id")
        .eq("id", account.employee_id)
        .maybeSingle();
      businessId = employee?.business_id || null;
    }
  }

  if (!businessId) return NextResponse.json({ plan: null });

  const { data: subscription, error } = await access.admin
    .from("subscriptions")
    .select("plan_name, subscription_status")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Subscription could not be loaded." }, { status: 500 });

  return NextResponse.json({
    plan: subscription?.plan_name || null,
    active: String(subscription?.subscription_status || "active").toLowerCase() === "active",
    employeeLimit: isGrowthPlan(subscription?.plan_name) ? 20 : 10,
  });
}
