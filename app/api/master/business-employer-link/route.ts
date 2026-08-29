import { NextResponse } from "next/server";
import { requireRole } from "../../_lib/authorization";

export async function POST(request: Request) {
  const access = await requireRole(request, ["master", "master_admin"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = (await request.json().catch(() => null)) as { businessId?: string; employerEmail?: string } | null;
  const businessId = String(body?.businessId || "");
  const employerEmail = String(body?.employerEmail || "").trim().toLowerCase();
  if (!businessId || !/^\S+@\S+\.\S+$/.test(employerEmail)) {
    return NextResponse.json({ error: "A business and existing employer email address are required." }, { status: 400 });
  }

  const { data: business } = await access.admin.from("businesses").select("id,status").eq("id", businessId).maybeSingle();
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });
  if (["deleted", "suspended", "archived"].includes(String(business.status || "active").toLowerCase())) {
    return NextResponse.json({ error: "Only an active business can be linked to an employer." }, { status: 400 });
  }

  const { data: employer } = await access.admin
    .from("profiles")
    .select("id,email,role,access_status")
    .ilike("email", employerEmail)
    .eq("role", "employer")
    .maybeSingle();
  if (!employer) return NextResponse.json({ error: "No existing employer account matches that email address." }, { status: 404 });
  if (!['active', 'approved'].includes(String(employer.access_status || 'active').toLowerCase())) {
    return NextResponse.json({ error: "That employer account is not active." }, { status: 400 });
  }

  const { error: membershipError } = await access.admin.from("employer_business_memberships").upsert({
    employer_id: employer.id,
    business_id: businessId,
    membership_role: "owner",
    is_active: true,
  }, { onConflict: "employer_id,business_id" });
  if (membershipError) return NextResponse.json({ error: "Employer membership could not be created." }, { status: 500 });

  const { error: businessError } = await access.admin.from("businesses").update({ employer_id: employer.id }).eq("id", businessId);
  if (businessError) return NextResponse.json({ error: "Employer membership was created, but the business owner could not be updated." }, { status: 500 });

  return NextResponse.json({ success: true, message: "Existing employer linked. No password reset or email was sent." });
}
