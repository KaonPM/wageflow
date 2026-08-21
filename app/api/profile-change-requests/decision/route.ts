import { NextResponse } from "next/server";
import { requireRole } from "../../_lib/authorization";
import { createPortalTask } from "../../_lib/portalTasks";
import { sendOneSignalPush } from "../../_lib/oneSignal";

const FIELDS: Record<string, string[]> = {
  contact: ["email", "phone", "physical_address"],
  emergency_contact: ["next_of_kin_name", "next_of_kin_phone", "next_of_kin_relationship"],
  banking: ["payment_method", "bank_name", "account_number", "account_type"],
};

export async function POST(request: Request) {
  const access = await requireRole(request, ["employer"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.profile.business_id) return NextResponse.json({ error: "Business profile not found." }, { status: 400 });
  const body = await request.json().catch(() => null) as { requestId?: string; status?: "Approved" | "Declined"; employerNote?: string } | null;
  const requestId = String(body?.requestId || "");
  const status = body?.status;
  const employerNote = String(body?.employerNote || "").trim().slice(0, 2000);
  if (!requestId || !status || !["Approved", "Declined"].includes(status)) return NextResponse.json({ error: "Choose a valid decision." }, { status: 400 });
  if (status === "Declined" && !employerNote) return NextResponse.json({ error: "Enter a reason before declining the request." }, { status: 400 });

  const { data: changeRequest } = await access.admin.from("employee_change_requests").select("*").eq("id", requestId).eq("business_id", access.profile.business_id).eq("status", "Pending").maybeSingle();
  if (!changeRequest) return NextResponse.json({ error: "Pending change request not found." }, { status: 404 });
  if (status === "Approved") {
    const allowedFields = FIELDS[changeRequest.request_type] || [];
    const changes = Object.fromEntries(allowedFields.map((field) => [field, String(changeRequest.requested_changes?.[field] || "").trim()]).filter(([, value]) => value));
    if (!Object.keys(changes).length) return NextResponse.json({ error: "There are no valid changes to approve." }, { status: 400 });
    const { error } = await access.admin.from("employees").update(changes).eq("id", changeRequest.employee_id).eq("business_id", access.profile.business_id);
    if (error) return NextResponse.json({ error: "Employee details could not be updated." }, { status: 500 });
  }
  const { error } = await access.admin.from("employee_change_requests").update({ status, employer_note: employerNote || null, reviewed_by: access.user.email || "Employer", reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", requestId);
  if (error) return NextResponse.json({ error: "The decision could not be saved." }, { status: 500 });
  const { data: account } = await access.admin.from("employee_accounts").select("auth_user_id").eq("employee_id", changeRequest.employee_id).eq("portal_enabled", true).maybeSingle();
  if (account?.auth_user_id) {
    const label = changeRequest.request_type === "emergency_contact" ? "emergency-contact" : changeRequest.request_type;
    await createPortalTask(access.admin, { businessId: access.profile.business_id, recipientUserId: account.auth_user_id, recipientRole: "employee", title: "Profile change request updated", message: `Your ${label} change request was ${status.toLowerCase()}.`, href: "/employee/profile", taskType: "profile_change_decision" });
    await sendOneSignalPush({ externalIds: [account.auth_user_id], title: "Profile change request updated", message: `Your ${label} change request was ${status.toLowerCase()}.`, url: `${new URL(request.url).origin}/employee/profile` });
  }
  return NextResponse.json({ success: true });
}
