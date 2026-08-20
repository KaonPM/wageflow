import { NextResponse } from "next/server";
import { requireRole } from "../../_lib/authorization";
import { employeePushRecipients, sendOneSignalPush } from "../../_lib/oneSignal";
import { hasGrowthSubscription } from "../../_lib/subscription";

export async function POST(request: Request) {
  const access = await requireRole(request, ["employer"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.profile.business_id) return NextResponse.json({ error: "Business profile not found." }, { status: 400 });
  if (!await hasGrowthSubscription(access.admin, access.profile.business_id)) return NextResponse.json({ error: "Payroll reminders are available on the Growth plan." }, { status: 403 });

  const body = await request.json().catch(() => null) as { payrollMonth?: string } | null;
  const payrollMonth = String(body?.payrollMonth || "").trim();
  if (!/^\d{4}-\d{2}$/.test(payrollMonth)) return NextResponse.json({ error: "Choose a payroll month first." }, { status: 400 });

  const recipients = await employeePushRecipients(access.admin, access.profile.business_id);
  const result = await sendOneSignalPush({ externalIds: recipients, title: "Payroll reminder", message: `Please submit any outstanding leave or overtime information for ${payrollMonth}.`, url: `${new URL(request.url).origin}/employee` });
  return NextResponse.json({ success: true, recipients: recipients.length, pushConfigured: result.configured, pushed: result.sent });
}
