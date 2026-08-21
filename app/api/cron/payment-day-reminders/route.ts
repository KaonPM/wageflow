import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../_lib/authorization";
import { employeePushRecipients, sendOneSignalPush } from "../../_lib/oneSignal";
import { createPortalTask } from "../../_lib/portalTasks";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const admin = getSupabaseAdmin(); const today = new Date(); const day = today.getUTCDate(); const lastDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)).getUTCDate(); const prepDay = day + 3 > lastDay ? day + 3 - lastDay : day + 3; const { data: businesses, error } = await admin.from("businesses").select("id,employer_id,default_payment_day").not("default_payment_day", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let reminded = 0;
  for (const business of businesses || []) {
    if (Number(business.default_payment_day) === prepDay && business.employer_id) {
      await createPortalTask(admin, { businessId: business.id, recipientUserId: business.employer_id, recipientRole: "employer", title: "Prepare payroll", message: `Salary payment day is in three days. Review and finalise payroll.`, href: "/employer/payroll", taskType: "payroll_preparation" });
      await sendOneSignalPush({ externalIds: [business.employer_id], title: "Prepare payroll", message: "Salary payment day is in three days. Review and finalise payroll.", url: `${new URL(request.url).origin}/employer/payroll` });
    }
    if (Number(business.default_payment_day) !== day && !(day === lastDay && Number(business.default_payment_day) > lastDay)) continue;
    const recipients = await employeePushRecipients(admin, business.id);
    const { data: employees } = await admin.from("employees").select("id").eq("business_id", business.id);
    const employeeIds = (employees || []).map((employee) => employee.id);
    const { data: accounts } = employeeIds.length ? await admin.from("employee_accounts").select("auth_user_id").in("employee_id", employeeIds).eq("portal_enabled", true) : { data: [] as { auth_user_id: string | null }[] };
    const month = today.toLocaleString("en-ZA", { month: "long", year: "numeric", timeZone: "Africa/Johannesburg" });
    for (const account of accounts || []) if (account.auth_user_id) await createPortalTask(admin, { businessId: business.id, recipientUserId: account.auth_user_id, recipientRole: "employee", title: "Payment day reminder", message: `Your salary payment is scheduled for today (${month}).`, href: "/employee/payslips", taskType: "payment_day_reminder" });
    await sendOneSignalPush({ externalIds: recipients, title: "Payment day reminder", message: "Your salary payment is scheduled for today.", url: `${new URL(request.url).origin}/employee/payslips` }); reminded += recipients.length;
  }
  return NextResponse.json({ success: true, reminded });
}
