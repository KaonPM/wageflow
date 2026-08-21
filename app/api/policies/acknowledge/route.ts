import { NextResponse } from "next/server";
import { requireRole } from "../../_lib/authorization";

export async function POST(request: Request) {
  const access = await requireRole(request, ["employee"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => ({}));
  const assignmentId = String(body.assignmentId || "");
  if (!assignmentId) return NextResponse.json({ error: "Policy assignment is required." }, { status: 400 });
  const { data: account } = await access.admin.from("employee_accounts").select("employee_id,portal_enabled").eq("auth_user_id", access.user.id).maybeSingle();
  if (!account?.employee_id || !account.portal_enabled) return NextResponse.json({ error: "Employee portal account not found." }, { status: 403 });
  const { data: assignment } = await access.admin.from("policy_assignments").select("id,employee_id").eq("id", assignmentId).eq("employee_id", account.employee_id).maybeSingle();
  if (!assignment) return NextResponse.json({ error: "This policy is not assigned to you." }, { status: 404 });
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const { error } = await access.admin.from("policy_acknowledgements").upsert({ policy_assignment_id: assignment.id, employee_id: account.employee_id, acknowledged_at: new Date().toISOString(), ip_address: forwarded }, { onConflict: "policy_assignment_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
