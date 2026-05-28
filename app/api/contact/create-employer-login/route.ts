import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

function generateTempPassword() {
  return `Wf@${crypto.randomBytes(4).toString("hex")}9A`;
}

async function sendLoginEmail({
  to,
  name,
  password,
}: {
  to: string;
  name: string;
  password: string;
}) {
  return fetch("https://api.brevo.com/v3/smtp/email", {
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
      to: [{ email: to, name }],
      subject: "Your WageFlow employer account has been approved",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; color: #111827;">
          <p>Hi ${name},</p>

          <p>Your WageFlow employer account has been approved and created successfully.</p>

          <p>You can now log in using the details below:</p>

          <p><strong>Login email:</strong> ${to}</p>
          <p><strong>Temporary password:</strong> ${password}</p>

          <p>Please log in and change your password immediately after signing in.</p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

          <p><strong>To proceed with your WageFlow setup, please send us the following:</strong></p>

          <ul>
            <li>Company registration details or business name confirmation</li>
            <li>PAYE, UIF and SDL reference numbers, if applicable</li>
            <li>Employee list with full names, ID/passport numbers and job titles</li>
            <li>Employee salary or wage details</li>
            <li>Payment frequency, for example weekly, fortnightly or monthly</li>
            <li>Normal working hours and overtime rules</li>
            <li>Leave policy or opening leave balances, if available</li>
            <li>Banking details for salary payments, if payroll payment support is required</li>
            <li>Company logo and preferred brand colour, if you want payslips branded</li>
          </ul>

          <p>Once we receive the above information, we will continue setting up your payroll profile.</p>

          <p>
            Kind regards,<br />
            <strong>WageFlow</strong><br />
            A product of Lesedi Smart Solutions
          </p>
        </div>
      `,
    }),
  });
}

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: "Name and email are required." },
        { status: 400 }
      );
    }

    const temporaryPassword = generateTempPassword();

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
      });

    if (userError) {
      console.error("SUPABASE CREATE USER ERROR:", userError);

      return NextResponse.json(
        { error: userError.message },
        { status: 500 }
      );
    }

    const userId = userData.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      role: "employer",
      must_change_password: true,
    });

    if (profileError) {
      console.error("SUPABASE PROFILE UPSERT ERROR:", profileError);

      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    const emailResponse = await sendLoginEmail({
      to: email,
      name,
      password: temporaryPassword,
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();

      console.error("BREVO EMAIL ERROR:", error);

      return NextResponse.json(
        { error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CREATE EMPLOYER LOGIN ROUTE ERROR:", error);

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}