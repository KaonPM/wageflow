import { NextResponse } from "next/server";
import { requireRole } from "../../../_lib/authorization";

type Payload = { businessName?: string; tradingName?: string; email?: string; phone?: string; employeeCount?: number; plan?: string; defaultEmployeePortalEnabled?: boolean };

export async function POST(request: Request) {
  const access = await requireRole(request, ["employer"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = (await request.json().catch(() => null)) as Payload | null;
  const businessName = String(body?.businessName || "").trim();
  const tradingName = String(body?.tradingName || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const phone = String(body?.phone || "").trim();
  const employeeCount = Math.max(1, Math.min(100000, Number(body?.employeeCount || 1)));
  const plan = ["Starter", "Growth"].includes(String(body?.plan)) ? String(body?.plan) : "Starter";
  if (!businessName || businessName.length > 160 || (email && !/^\S+@\S+\.\S+$/.test(email))) {
    return NextResponse.json({ error: "Enter a business name and a valid business email address, if provided." }, { status: 400 });
  }

  const { data: business, error: businessError } = await access.admin.from("businesses").insert({
    business_name: businessName,
    trading_name: tradingName || null,
    email: email || null,
    phone: phone || null,
    employer_id: access.user.id,
    status: "active",
    selected_package: plan,
    number_of_employees: employeeCount,
    default_employee_portal_enabled: body?.defaultEmployeePortalEnabled === true,
    primary_color: "#0f766e",
    secondary_color: "#d4af37",
    paye_enabled: true,
    uif_enabled: true,
    show_leave_balances: true,
    default_payment_method: "Bank Transfer",
  }).select("id").single();
  if (businessError || !business) return NextResponse.json({ error: businessError?.message || "Business could not be created." }, { status: 500 });

  const { error: membershipError } = await access.admin.from("employer_business_memberships").upsert({ employer_id: access.user.id, business_id: business.id, membership_role: "owner", is_active: true }, { onConflict: "employer_id,business_id" });
  if (membershipError) return NextResponse.json({ error: "Business was created but owner access could not be assigned." }, { status: 500 });

  const { error: subscriptionError } = await access.admin.from("subscriptions").upsert({
    business_id: business.id,
    plan_name: plan,
    monthly_fee: plan === "Growth" ? 299 : 199,
    setup_fee: 249,
    setup_paid: false,
    subscription_status: "pending",
  }, { onConflict: "business_id" });
  if (subscriptionError) return NextResponse.json({ error: "Business was created but its subscription could not be prepared." }, { status: 500 });

  const { error: activeError } = await access.admin.from("profiles").update({ business_id: business.id }).eq("id", access.user.id);
  if (activeError) return NextResponse.json({ error: "Business was created but could not be made active." }, { status: 500 });
  return NextResponse.json({ success: true, businessId: business.id });
}
