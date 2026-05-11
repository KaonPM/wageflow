import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

function generateTempPassword() {
  return `Wf@${crypto.randomBytes(4).toString("hex")}7E`;
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
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    const userId = userData.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      role: "employee",
      must_change_password: true,
    });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

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
        to: [{ email, name }],
        subject: "Your WageFlow employee login details",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; color: #111827;">
            <p>Hi ${name},</p>

            <p>Your WageFlow employee account has been activated.</p>

            <p><strong>Login email:</strong> ${email}</p>
            <p><strong>Temporary password:</strong> ${temporaryPassword}</p>

            <p>Please log in and change your password immediately after signing in.</p>

            <p>
              Kind regards,<br />
              <strong>WageFlow</strong><br />
              A product of Lesedi Smart Solutions
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}