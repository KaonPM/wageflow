import { NextResponse } from "next/server";
import { requireRole } from "../_lib/authorization";
import { hasGrowthSubscription } from "../_lib/subscription";
import { sendOneSignalPush } from "../_lib/oneSignal";
import { createPortalTask } from "../_lib/portalTasks";

type RequestPayload = {
  requestType?: "Leave request" | "Overtime request";
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  overtimeDate?: string;
  overtimeHours?: number;
  note?: string;
};

export async function POST(request: Request) {
  const access = await requireRole(request, ["employee"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const { data: account } = await access.admin.from("employee_accounts").select("employee_id").eq("auth_user_id", access.user.id).eq("portal_enabled", true).maybeSingle();
  if (!account?.employee_id) return NextResponse.json({ error: "Your employee portal access is not active." }, { status: 403 });

  const { data: employee } = await access.admin.from("employees").select("id, business_id, first_name, last_name").eq("id", account.employee_id).maybeSingle();
  if (!employee?.business_id) return NextResponse.json({ error: "Employee business record was not found." }, { status: 404 });
  if (!await hasGrowthSubscription(access.admin, employee.business_id)) return NextResponse.json({ error: "Leave and overtime requests are available on the Growth plan." }, { status: 403 });

  const body = await request.json().catch(() => null) as RequestPayload | null;
  const requestType = body?.requestType;
  const note = String(body?.note || "").trim().slice(0, 2000) || null;
  const isLeave = requestType === "Leave request";
  const isOvertime = requestType === "Overtime request";
  if (!isLeave && !isOvertime) return NextResponse.json({ error: "Choose a valid request type." }, { status: 400 });

  const row = isLeave
    ? { business_id: employee.business_id, employee_id: employee.id, request_type: requestType, leave_type: String(body?.leaveType || "").trim().slice(0, 100), start_date: body?.startDate || null, end_date: body?.endDate || null, reason: note, employee_note: note, employer_note: null, status: "Pending", approved_by: null, approved_at: null, updated_at: new Date().toISOString() }
    : { business_id: employee.business_id, employee_id: employee.id, request_type: requestType, overtime_date: body?.overtimeDate || null, overtime_hours: Number(body?.overtimeHours || 0), employee_note: note, status: "Pending" };

  if (isLeave && (!row.leave_type || !row.start_date || !row.end_date || new Date(row.end_date) < new Date(row.start_date))) return NextResponse.json({ error: "Enter valid leave details." }, { status: 400 });
  if (isOvertime && (!row.overtime_date || !Number.isFinite(row.overtime_hours) || row.overtime_hours <= 0)) return NextResponse.json({ error: "Enter valid overtime details." }, { status: 400 });

  const { error } = await access.admin.from("approval_requests").insert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });

  const { data: employer } = await access.admin.from("businesses").select("employer_id, business_name, trading_name").eq("id", employee.business_id).maybeSingle();
  if (employer?.employer_id) {
    const employeeName = `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || "An employee";
    await createPortalTask(access.admin, { businessId: employee.business_id, recipientUserId: employer.employer_id, recipientRole: "employer", title: "Approval needed", message: `${employeeName} submitted a ${isLeave ? "leave" : "overtime"} request.`, href: "/employer/hr/approvals", taskType: "approval_needed" });
    await sendOneSignalPush({ externalIds: [employer.employer_id], title: "Approval needed", message: `${employeeName} submitted a ${isLeave ? "leave" : "overtime"} request.`, url: `${new URL(request.url).origin}/employer/hr/approvals` });
  }

  return NextResponse.json({ success: true });
}
