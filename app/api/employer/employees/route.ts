import { NextResponse } from "next/server";
import { requireRole } from "../../_lib/authorization";

export async function GET(request: Request) {
  const access = await requireRole(request, ["employer", "employer_admin"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const permissions = Array.isArray(access.profile.admin_permissions)
    ? access.profile.admin_permissions.map(String)
    : [];
  if (String(access.profile.role).toLowerCase() === "employer_admin" && !permissions.some((item) => ["employees", "hr"].includes(item))) {
    return NextResponse.json({ error: "Your employer administrator account has not been granted employee-record access." }, { status: 403 });
  }
  if (!access.profile.business_id) return NextResponse.json({ error: "Business profile not found." }, { status: 400 });
  const { data, error } = await access.admin
    .from("employees")
    .select("*")
    .eq("business_id", access.profile.business_id)
    .order("first_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ employees: data || [] });
}
