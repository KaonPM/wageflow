import { NextResponse } from "next/server";
import { requireRole } from "../../_lib/authorization";
import { hasGrowthSubscription } from "../../_lib/subscription";

type Payload = { employeeId?: string; requestType?: "Leave request" | "Overtime request"; leaveType?: string; startDate?: string; endDate?: string; overtimeDate?: string; overtimeHours?: number; note?: string };

export async function POST(request: Request) {
  const access = await requireRole(request, ["employer"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.profile.business_id) return NextResponse.json({ error: "Business profile not found." }, { status: 400 });

  const { data: business } = await access.admin.from("businesses").select("default_employee_portal_enabled").eq("id", access.profile.business_id).maybeSingle();
  if (business?.default_employee_portal_enabled !== false) return NextResponse.json({ error: "Paper request capture is available when the employee portal is disabled." }, { status: 403 });
  if (!await hasGrowthSubscription(access.admin, access.profile.business_id)) return NextResponse.json({ error: "Leave and overtime records are available on the Growth plan." }, { status: 403 });

  const body = await request.json().catch(() => null) as Payload | null;
  const employeeId = String(body?.employeeId || "");
  const requestType = body?.requestType;
  const isLeave = requestType === "Leave request";
  const isOvertime = requestType === "Overtime request";
  if (!employeeId || (!isLeave && !isOvertime)) return NextResponse.json({ error: "Choose an employee and request type." }, { status: 400 });
  const { data: employee } = await access.admin.from("employees").select("id").eq("id", employeeId).eq("business_id", access.profile.business_id).maybeSingle();
  if (!employee) return NextResponse.json({ error: "Employee was not found for this business." }, { status: 404 });

  const note = String(body?.note || "").trim().slice(0, 2000) || null;
  const row = isLeave
    ? { business_id: access.profile.business_id, employee_id: employeeId, request_type: requestType, leave_type: String(body?.leaveType || "").trim().slice(0, 100), start_date: body?.startDate || null, end_date: body?.endDate || null, reason: note, employee_note: "Paper request captured by employer.", status: "Pending" }
    : { business_id: access.profile.business_id, employee_id: employeeId, request_type: requestType, overtime_date: body?.overtimeDate || null, overtime_hours: Number(body?.overtimeHours || 0), employee_note: "Paper request captured by employer.", reason: note, status: "Pending" };
  if (isLeave && (!row.leave_type || !row.start_date || !row.end_date || new Date(row.end_date) < new Date(row.start_date))) return NextResponse.json({ error: "Enter valid leave details." }, { status: 400 });
  if (isOvertime && (!row.overtime_date || !Number.isFinite(row.overtime_hours) || row.overtime_hours <= 0)) return NextResponse.json({ error: "Enter valid overtime details." }, { status: 400 });
  const { error } = await access.admin.from("approval_requests").insert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
