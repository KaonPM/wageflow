import { NextResponse } from "next/server";
import { requireRole } from "../../_lib/authorization";

export async function GET(request: Request) {
  const access = await requireRole(request, ["employer", "employer_admin"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const { data: memberships, error } = await access.admin
    .from("employer_business_memberships")
    .select("business_id,membership_role")
    .eq("employer_id", access.user.id)
    .eq("is_active", true);
  if (error) return NextResponse.json({ error: "Employer businesses could not be loaded." }, { status: 500 });

  const ids = (memberships || []).map((membership) => membership.business_id);
  if (ids.length === 0) return NextResponse.json({ businesses: [], activeBusinessId: access.profile.business_id });

  const { data: businesses, error: businessError } = await access.admin
    .from("businesses")
    .select("id,business_name,trading_name,logo_url,status")
    .in("id", ids)
    .neq("status", "deleted")
    .order("business_name");
  if (businessError) return NextResponse.json({ error: "Employer businesses could not be loaded." }, { status: 500 });

  const roles = new Map((memberships || []).map((membership) => [membership.business_id, membership.membership_role]));
  return NextResponse.json({
    activeBusinessId: access.profile.business_id,
    businesses: (businesses || []).map((business) => ({ ...business, membershipRole: roles.get(business.id) || "owner" })),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const access = await requireRole(request, ["employer", "employer_admin"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = (await request.json().catch(() => null)) as { businessId?: string } | null;
  const businessId = String(body?.businessId || "");
  if (!businessId) return NextResponse.json({ error: "Select a valid business." }, { status: 400 });

  const { data: membership } = await access.admin
    .from("employer_business_memberships")
    .select("business_id")
    .eq("employer_id", access.user.id)
    .eq("business_id", businessId)
    .eq("is_active", true)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "You do not have access to this business." }, { status: 403 });

  const { data: business } = await access.admin.from("businesses").select("id,status").eq("id", businessId).maybeSingle();
  if (!business || ["deleted", "suspended", "archived"].includes(String(business.status).toLowerCase())) {
    return NextResponse.json({ error: "This business is not currently active." }, { status: 403 });
  }

  const { error } = await access.admin.from("profiles").update({ business_id: businessId }).eq("id", access.user.id);
  return error ? NextResponse.json({ error: "The active business could not be changed." }, { status: 500 }) : NextResponse.json({ success: true, businessId });
}
