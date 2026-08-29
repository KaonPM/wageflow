import { NextResponse } from "next/server";
import { requireRole } from "../../_lib/authorization";

export async function PATCH(request: Request) {
  const access = await requireRole(request, ["employer", "employer_admin"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = (await request.json().catch(() => null)) as { employeeId?: string; enabled?: boolean } | null;
  const employeeId = String(body?.employeeId || "");
  if (!employeeId || typeof body?.enabled !== "boolean" || !access.profile.business_id) {
    return NextResponse.json({ error: "A valid employee and access choice are required." }, { status: 400 });
  }

  const { data: employee } = await access.admin
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("business_id", access.profile.business_id)
    .maybeSingle();
  if (!employee) return NextResponse.json({ error: "Employee not found for this business." }, { status: 404 });

  if (body.enabled) return NextResponse.json({ error: "Use the employee setup email to enable portal access." }, { status: 400 });

  const { error } = await access.admin
    .from("employee_accounts")
    .update({ portal_enabled: false })
    .eq("employee_id", employeeId);
  if (error) return NextResponse.json({ error: "Employee portal access could not be disabled." }, { status: 500 });

  return NextResponse.json({ success: true });
}
