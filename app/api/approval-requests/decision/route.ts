import { NextResponse } from "next/server";
import { requireRole } from "../../_lib/authorization";
import { hasGrowthSubscription } from "../../_lib/subscription";
import { sendOneSignalPush } from "../../_lib/oneSignal";
import { createPortalTask } from "../../_lib/portalTasks";

type DecisionPayload = {
  requestId?: string;
  status?: "Approved" | "Declined";
  employerNote?: string;
};

export async function POST(request: Request) {
  const access = await requireRole(request, ["employer", "employer_admin"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const isEmployerAdmin = String(access.profile.role).toLowerCase() === "employer_admin";
  const permissions = Array.isArray(access.profile.admin_permissions) ? access.profile.admin_permissions.map(String) : [];
  if (isEmployerAdmin && !permissions.includes("hr")) return NextResponse.json({ error: "Your employer administrator account has not been granted HR approval access." }, { status: 403 });
  if (!access.profile.business_id) return NextResponse.json({ error: "Business profile not found." }, { status: 400 });
  if (!await hasGrowthSubscription(access.admin, access.profile.business_id)) return NextResponse.json({ error: "Approval decisions are available on the Growth plan." }, { status: 403 });

  const body = (await request.json().catch(() => null)) as DecisionPayload | null;
  const requestId = String(body?.requestId || "");
  const status = body?.status;
  const employerNote = String(body?.employerNote || "").trim().slice(0, 2000);

  if (!requestId || !status || !["Approved", "Declined"].includes(status)) {
    return NextResponse.json({ error: "Choose a valid pending request decision." }, { status: 400 });
  }

  const { data: approval } = await access.admin.from("approval_requests").select("employee_id, request_type").eq("id", requestId).eq("business_id", access.profile.business_id).maybeSingle();
  if (!approval) return NextResponse.json({ error: "Approval request not found." }, { status: 404 });
  if (status === "Declined" && !employerNote) {
    return NextResponse.json({ error: "Enter a reason before declining the request." }, { status: 400 });
  }

  const { data, error } = await access.admin.rpc("decide_approval_request", {
    target_request_id: requestId,
    target_business_id: access.profile.business_id,
    decision_status: status,
    decision_note: employerNote || null,
    decision_by: access.user.email || "Employer admin",
  });

  if (error) {
    const message = error.message.includes("Insufficient annual leave")
      ? error.message
      : error.message.includes("pending")
        ? "Only pending requests can be approved or declined."
        : "The decision could not be saved.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  const { data: account } = await access.admin.from("employee_accounts").select("auth_user_id").eq("employee_id", approval.employee_id).eq("portal_enabled", true).maybeSingle();
  if (account?.auth_user_id) await createPortalTask(access.admin, { businessId: access.profile.business_id, recipientUserId: account.auth_user_id, recipientRole: "employee", title: "Request updated", message: `Your ${String(approval.request_type || "approval").toLowerCase()} was ${status.toLowerCase()}.`, href: "/employee/notifications", taskType: "approval_decision" });
  await sendOneSignalPush({ externalIds: account?.auth_user_id ? [account.auth_user_id] : [], title: "Request updated", message: `Your ${String(approval.request_type || "approval").toLowerCase()} was ${status.toLowerCase()}.`, url: `${new URL(request.url).origin}/employee/notifications` });

  return NextResponse.json({ success: true, result: data });
}
