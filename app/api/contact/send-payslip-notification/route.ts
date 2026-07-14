import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function updateNotificationStatus({
  id,
  status,
  errorMessage,
}: {
  id?: string;
  status: "sent" | "failed";
  errorMessage?: string;
}) {
  if (!id) return;

  await supabaseAdmin
    .from("payslip_notifications")
    .update({ status })
    .eq("id", id);
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    notificationId,
    email,
    employeeName,
    payrollMonth,
    businessName,
    payslipId,
  } = body;

  if (!email || !employeeName || !payrollMonth || !payslipId) {
    return NextResponse.json(
      { error: "Email, employee name, payroll month and payslip ID are required." },
      { status: 400 }
    );
  }

  try {
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
            <p>Hi ${employeeName},</p>

            <p>Your WageFlow payslip for <strong>${payrollMonth}</strong> is now available.</p>
            <p><strong>Payslip ID:</strong> ${payslipId}</p>

            <p>
              Open this payslip using the secure payslip ID link below. You may be asked to log in first:<br />
              <a href="${payslipUrl}" style="color: #0f766e; font-weight: 700;">View payslip</a>
            </p>

            <p>If the link does not open directly, please log in to WageFlow and go to your payslips page.</p>

            <p>
              Kind regards,<br />
              <strong>${businessName || "WageFlow"}</strong><br />
              Powered by WageFlow
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      await updateNotificationStatus({
        id: notificationId,
        status: "failed",
        errorMessage: errorText,
      });

      return NextResponse.json({ error: errorText }, { status: 500 });
    }

    await updateNotificationStatus({ id: notificationId, status: "sent" });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const message = error?.message || "Failed to send payslip email.";
    await updateNotificationStatus({
      id: notificationId,
      status: "failed",
      errorMessage: message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
