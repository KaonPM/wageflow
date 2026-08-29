import { NextResponse } from "next/server";
import { requireRole } from "../../_lib/authorization";

export async function POST(request: Request) {
  const access = await requireRole(request, ["employer"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.profile.business_id) return NextResponse.json({ error: "Business profile not found." }, { status: 400 });

  const body = await request.json().catch(() => null) as { assignmentId?: string } | null;
  const assignmentId = String(body?.assignmentId || "");
  if (!assignmentId) return NextResponse.json({ error: "Policy assignment is required." }, { status: 400 });

  const [{ data: business }, { data: assignment, error: assignmentError }] = await Promise.all([
    access.admin.from("businesses").select("default_employee_portal_enabled").eq("id", access.profile.business_id).maybeSingle(),
    access.admin.from("policy_assignments").select("id,employee_id,company_policies!inner(business_id)").eq("id", assignmentId).maybeSingle(),
  ]);
  if (business?.default_employee_portal_enabled !== false) return NextResponse.json({ error: "Paper acknowledgements are available when the employee portal is disabled." }, { status: 403 });
  if (assignmentError || !assignment || (assignment.company_policies as { business_id?: string } | null)?.business_id !== access.profile.business_id) return NextResponse.json({ error: "Policy assignment was not found for this business." }, { status: 404 });

  const { error } = await access.admin.from("policy_acknowledgements").upsert({ policy_assignment_id: assignment.id, employee_id: assignment.employee_id, acknowledged_at: new Date().toISOString(), acknowledgement_text: "Paper-signed acknowledgement received and recorded by employer.", ip_address: null }, { onConflict: "policy_assignment_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
