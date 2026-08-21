import { NextResponse } from "next/server";
import { requireRole } from "../../_lib/authorization";

type Payload = { employeeId?: string; endDate?: string; reason?: string; finalPaymentDate?: string; exitType?: string; noticeServed?: string; noticeNote?: string };

export async function POST(request: Request) {
  const access = await requireRole(request, ["employer"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.profile.business_id) return NextResponse.json({ error: "Business profile not found." }, { status: 400 });
  const body = await request.json().catch(() => null) as Payload | null;
  const employeeId = String(body?.employeeId || "");
  const endDate = String(body?.endDate || "");
  const reason = String(body?.reason || "").trim().slice(0, 2000);
  const finalPaymentDate = String(body?.finalPaymentDate || "");
  const exitType = String(body?.exitType || "").trim().slice(0, 100);
  const noticeServed = String(body?.noticeServed || "").trim().slice(0, 40);
  const noticeNote = String(body?.noticeNote || "").trim().slice(0, 1000);
  if (!employeeId || !endDate || !reason || !exitType) return NextResponse.json({ error: "Employee, exit type, final working date and reason are required." }, { status: 400 });
  if (exitType === "Resignation" && !["Yes", "No"].includes(noticeServed)) return NextResponse.json({ error: "Record whether resignation notice was served." }, { status: 400 });
  const { data: employee } = await access.admin.from("employees").select("id,notes").eq("id", employeeId).eq("business_id", access.profile.business_id).maybeSingle();
  if (!employee) return NextResponse.json({ error: "Employee not found for this business." }, { status: 404 });
  const exitNotes = [`Exit type: ${exitType}`, finalPaymentDate ? `Final payment date: ${finalPaymentDate}` : "", exitType === "Resignation" ? `Notice served: ${noticeServed}${noticeNote ? ` — ${noticeNote}` : ""}` : ""].filter(Boolean);
  const notes = [String(employee.notes || "").trim(), ...exitNotes].filter(Boolean).join("\n");
  const { error } = await access.admin.from("employees").update({ employment_status: "terminated", end_date: endDate, termination_reason: `${exitType}: ${reason}`, notes }).eq("id", employeeId).eq("business_id", access.profile.business_id);
  if (error) return NextResponse.json({ error: "Employee termination could not be saved." }, { status: 500 });
  await access.admin.from("employee_accounts").update({ portal_enabled: false }).eq("employee_id", employeeId);
  return NextResponse.json({ success: true });
}
