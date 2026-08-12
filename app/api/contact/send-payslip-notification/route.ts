import { NextResponse } from "next/server";
import { getSupabaseAdmin, requireRole } from "../../_lib/authorization";

async function updateNotificationStatus({
  id,
  status,
  businessId,
  payslipId,
}: {
  id?: string;
  status: "sent" | "failed";
  businessId: string;
  payslipId: string;
}) {
  if (!id) return;

  await getSupabaseAdmin()
    .from("payslip_notifications")
    .update({ status })
    .eq("id", id)
    .eq("business_id", businessId)
    .eq("payslip_id", payslipId);
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
}

export async function POST(req: Request) {
  const access = await requireRole(req, ["employer"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const {
    notificationId,
    email,
    payslipId,
  } = body;

  if (!email || !payslipId || !access.profile.business_id) {
    return NextResponse.json(
      { error: "Email and payslip ID are required." },
      { status: 400 }
    );
  }

  try {
    const { data: payslip } = await access.admin
      .from("payslips")
      .select("id, employee_id, business_id, payroll_month")
      .eq("id", payslipId)
      .eq("business_id", access.profile.business_id)
      .maybeSingle();
    if (!payslip) return NextResponse.json({ error: "Payslip not found." }, { status: 404 });

    const { data: employee } = await access.admin
      .from("employees")
      .select("email, first_name, last_name")
      .eq("id", payslip.employee_id)
      .eq("business_id", access.profile.business_id)
      .maybeSingle();
    if (!employee?.email || employee.email.toLowerCase() !== String(email).trim().toLowerCase()) {
      return NextResponse.json({ error: "The recipient does not match this payslip." }, { status: 403 });
    }

    const { data: business } = await access.admin.from("businesses").select("business_name, trading_name").eq("id", access.profile.business_id).maybeSingle();
    const employeeName = `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || "Employee";
    const payrollMonth = payslip.payroll_month || "your latest pay period";
    const businessName = business?.trading_name || business?.business_name || "WageFlow";

    if (!process.env.BREVO_API_KEY || !process.env.BREVO_FROM_EMAIL) return NextResponse.json({ error: "Email delivery is not configured." }, { status: 503 });

    const origin = new URL(req.url).origin;
    const payslipUrl = `${origin}/employee/payslips/${payslipId}`;

    const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY as string,
      },
      body: JSON.stringify({
        sender: {
          name: "WageFlow",
          email: process.env.BREVO_FROM_EMAIL,
        },
        to: [{ email, name: employeeName }],
        subject: `Your WageFlow payslip for ${payrollMonth} is available`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; color: #111827;">
            <p>Hi ${escapeHtml(employeeName)},</p>

            <p>Your WageFlow payslip for <strong>${escapeHtml(payrollMonth)}</strong> is now available.</p>
            <p><strong>Payslip ID:</strong> ${escapeHtml(payslipId)}</p>

            <p>
              Open this payslip using the secure payslip ID link below. You may be asked to log in first:<br />
              <a href="${payslipUrl}" style="color: #0f766e; font-weight: 700;">View payslip</a>
            </p>

            <p>If the link does not open directly, please log in to WageFlow and go to your payslips page.</p>

            <p>
              Kind regards,<br />
              <strong>${escapeHtml(businessName || "WageFlow")}</strong><br />
              Powered by WageFlow
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Brevo payslip notification failed", emailResponse.status, errorText.slice(0, 500));
      await updateNotificationStatus({
        id: notificationId,
        status: "failed",
        businessId: access.profile.business_id,
        payslipId,
      });

      return NextResponse.json({ error: "The payslip email could not be delivered. Please try again." }, { status: 502 });
    }

    await updateNotificationStatus({ id: notificationId, status: "sent", businessId: access.profile.business_id, payslipId });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send payslip email.";
    await updateNotificationStatus({
      id: notificationId,
      status: "failed",
      businessId: access.profile.business_id,
      payslipId,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
