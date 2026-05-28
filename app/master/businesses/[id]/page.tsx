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

async function getExistingUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    throw new Error(error.message);
  }

  return data.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase()
  );
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
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
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
      subject: "Your WageFlow Employer Account",
      htmlContent: `
        <div style="font-family:Arial,sans-serif;padding:20px;color:#1F2937;">
          <h2>Welcome to WageFlow</h2>

          <p>Hello ${name},</p>

          <p>Your employer account has been created successfully.</p>

          <p>Please use the login details below to access your account:</p>

          <div style="background:#F3F4F6;padding:16px;border-radius:10px;margin:20px 0;">
            <p><strong>Email:</strong> ${to}</p>
            <p><strong>Temporary Password:</strong> ${password}</p>
          </div>

          <p>You will be asked to change your password after logging in.</p>

          <p>Login here:</p>

          <p>
            <a
              href="https://wageflow.lesedismartsolutions.co.za/login"
              style="
                display:inline-block;
                background:#0F766E;
                color:white;
                padding:12px 20px;
                border-radius:8px;
                text-decoration:none;
                font-weight:600;
              "
            >
              Login to WageFlow
            </a>
          </p>

          <br />

          <p>
            Regards,<br />
            WageFlow Team
          </p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to send setup email.");
  }

  return response;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const businessId = body.businessId || body.business_id || body.id;
    const email = body.email;
    const businessName =
      body.businessName || body.business_name || body.name || "Employer";

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Business email is required." },
        { status: 400 }
      );
    }

    const tempPassword = generateTempPassword();

    let userId: string | null = null;

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });

    if (authError) {
      const alreadyExists =
        authError.message.toLowerCase().includes("already been registered") ||
        authError.message.toLowerCase().includes("already registered") ||
        authError.message.toLowerCase().includes("already exists");

      if (!alreadyExists) {
        return NextResponse.json(
          { error: authError.message },
          { status: 500 }
        );
      }

      const existingUser = await getExistingUserByEmail(email);

      if (!existingUser?.id) {
        return NextResponse.json(
          { error: "Existing user could not be found." },
          { status: 500 }
        );
      }

      const { error: updateUserError } =
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password: tempPassword,
          email_confirm: true,
        });

      if (updateUserError) {
        return NextResponse.json(
          { error: updateUserError.message },
          { status: 500 }
        );
      }

      userId = existingUser.id;
    } else {
      userId = authData.user?.id || null;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Failed to create employer login." },
        { status: 500 }
      );
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        email,
        role: "employer",
        business_id: businessId,
        must_change_password: true,
      });

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    const { error: businessUpdateError } = await supabaseAdmin
      .from("businesses")
      .update({
        owner_user_id: userId,
      })
      .eq("id", businessId);

    if (businessUpdateError) {
      return NextResponse.json(
        { error: businessUpdateError.message },
        { status: 500 }
      );
    }

    await sendLoginEmail({
      to: email,
      name: businessName,
      password: tempPassword,
    });

    return NextResponse.json({
      success: true,
      message: "Employer setup email sent successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Something went wrong while creating employer login.",
      },
      { status: 500 }
    );
  }
}