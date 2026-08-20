import { NextResponse } from "next/server";
import { requireRole } from "../../_lib/authorization";
import { sendOneSignalPush } from "../../_lib/oneSignal";

export async function POST(request: Request) {
  const access = await requireRole(request, ["employer"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.profile.business_id) return NextResponse.json({ error: "Business profile not found." }, { status: 400 });

  const body = await request.json().catch(() => null) as { payslipId?: string } | null;
  const payslipId = String(body?.payslipId || "");
  if (!payslipId) return NextResponse.json({ error: "Payslip ID is required." }, { status: 400 });

  const { data: payslip } = await access.admin.from("payslips").select("employee_id, payroll_month").eq("id", payslipId).eq("business_id", access.profile.business_id).maybeSingle();
  if (!payslip) return NextResponse.json({ error: "Payslip not found." }, { status: 404 });
  const { data: account } = await access.admin.from("employee_accounts").select("auth_user_id").eq("employee_id", payslip.employee_id).eq("portal_enabled", true).maybeSingle();
  const result = await sendOneSignalPush({ externalIds: account?.auth_user_id ? [account.auth_user_id] : [], title: "Your payslip is ready", message: `Your payslip for ${payslip.payroll_month || "the latest pay period"} is ready to view.`, url: `${new URL(request.url).origin}/employee/payslips/${payslipId}` });
  return NextResponse.json({ success: true, pushConfigured: result.configured, pushed: result.sent });
}
