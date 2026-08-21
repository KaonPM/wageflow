import { NextResponse } from "next/server";
import { requireRole } from "../_lib/authorization";
import { createPortalTask } from "../_lib/portalTasks";

export async function POST(request: Request) {
  const access = await requireRole(request, ["employer"]); if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const employeeId = String((await request.json().catch(() => ({}))).employeeId || ""); if (!employeeId || !access.profile.business_id) return NextResponse.json({ error: "Employee and business are required." }, { status: 400 });
  const { data: employee } = await access.admin.from("employees").select("first_name,last_name").eq("id", employeeId).eq("business_id", access.profile.business_id).maybeSingle(); if (!employee) return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  const name = `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || "New employee";
  await createPortalTask(access.admin, { businessId: access.profile.business_id, recipientUserId: access.user.id, recipientRole: "employer", title: "Complete employee onboarding", message: `Finish ${name}'s contract, bank details and portal setup.`, href: "/employer/employees", taskType: "employee_onboarding" });
  return NextResponse.json({ success: true });
}
