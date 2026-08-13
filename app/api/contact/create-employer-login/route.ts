import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin, requireRole } from "../../_lib/authorization";

async function sendLoginEmail({
  to,
  name,
  setupUrl,
}: {
  to: string;
  name: string;
  setupUrl: string;
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

          <p>Your login email is <strong>${to}</strong>.</p>
          <p><a href="${setupUrl}" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Set your secure password</a></p>
          <p>This one-time security link expires. Resending a setup link does not change your current password.</p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

          <p><strong>To proceed with your WageFlow setup, please send us the following:</strong></p>

          <ul>
            <li>Company registration details or business name confirmation</li>
            <li>PAYE and UIF if applicable</li>
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
    const access = await requireRole(req, ["master", "master_admin"]);
    if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();

    const rawBusinessId = body.businessId || body.business_id || body.id;
    const email = body.email;
    const businessName = body.businessName || body.business_name || "Employer";

    if (!email) {
      return NextResponse.json(
        { error: "Business email is required." },
        { status: 400 }
      );
    }

    let businessId = rawBusinessId ? String(rawBusinessId) : null;

    if (!businessId) {
      const { data: businessRecord, error: businessLookupError } =
        await supabaseAdmin
          .from("businesses")
          .select("id")
          .eq("email", email)
          .maybeSingle();

      if (businessLookupError) {
        console.error("BUSINESS LOOKUP ERROR:", businessLookupError);

        return NextResponse.json(
          { error: businessLookupError.message },
          { status: 500 }
        );
      }

      if (!businessRecord?.id) {
        return NextResponse.json(
          { error: "Business ID is required." },
          { status: 400 }
        );
      }

      businessId = businessRecord.id;
    }

    let userId: string | null = null;

    const { data: usersData, error: usersError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      return NextResponse.json(
        { error: usersError.message },
        { status: 500 }
      );
    }

    const existingUser = usersData.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser?.id) {
      userId = existingUser.id;
    } else {
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
        });

      if (authError || !authData.user) {
        console.error("SUPABASE AUTH ERROR:", authError);

        return NextResponse.json(
          {
            error: authError?.message || "Failed to create employer login.",
          },
          { status: 500 }
        );
      }

      userId = authData.user.id;
    }

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("business_id")
      .eq("id", userId)
      .maybeSingle();

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        email,
        role: "employer",
        business_id: existingProfile?.business_id || businessId,
        must_change_password: true,
      });

    if (profileError) {
      console.error("SUPABASE PROFILE UPSERT ERROR:", profileError);

      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    const { error: businessUpdateError } = await supabaseAdmin
      .from("businesses")
      .update({ employer_id: userId })
      .eq("id", businessId);

    if (businessUpdateError) {
      console.error("SUPABASE BUSINESS LINK ERROR:", businessUpdateError);

      return NextResponse.json(
        { error: businessUpdateError.message },
        { status: 500 }
      );
    }


    const { error: membershipError } = await supabaseAdmin
      .from("employer_business_memberships")
      .upsert({ employer_id: userId, business_id: businessId, membership_role: "owner", is_active: true }, { onConflict: "employer_id,business_id" });

    if (membershipError) {
      console.error("SUPABASE BUSINESS MEMBERSHIP ERROR:", membershipError);
      return NextResponse.json({ error: "The employer business membership could not be created." }, { status: 500 });
    }

    const redirectTo = `${new URL(req.url).origin}/reset-password`;
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });
    if (linkError || !linkData.properties?.action_link) return NextResponse.json({ error: linkError?.message || "Could not create a secure setup link." }, { status: 500 });

    const emailResponse = await sendLoginEmail({
      to: email,
      name: businessName,
      setupUrl: linkData.properties.action_link,
    });

    let notificationSent=emailResponse.ok;
    if(!notificationSent){const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(url&&anon){const{error}=await createClient(url,anon).auth.resetPasswordForEmail(email,{redirectTo});notificationSent=!error;if(error)console.error("Supabase employer setup email failed",error.message);}}
    return NextResponse.json({ success: true, notificationSent });
  } catch (error: unknown) {
    console.error("CREATE EMPLOYER LOGIN ERROR:", error);

    return NextResponse.json(
      {
        error:
          (error instanceof Error ? error.message : null) ||
          "Something went wrong while creating employer login.",
      },
      { status: 500 }
    );
  }
}
