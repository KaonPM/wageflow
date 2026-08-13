import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin, requireRole } from "../../_lib/authorization";

export async function POST(req: Request) {
  try {
    const access = await requireRole(req, ["employer"]);
    if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
    const supabaseAdmin = getSupabaseAdmin();
    const { email, name, employeeId } = await req.json();

    if (!email || !name || !employeeId || !access.profile.business_id) {
      return NextResponse.json(
        { error: "Employee, name and email are required." },
        { status: 400 }
      );
    }

    const { data: employee } = await supabaseAdmin.from("employees").select("id, business_id, profile_id").eq("id", employeeId).eq("business_id", access.profile.business_id).single();
    if (!employee) return NextResponse.json({ error: "Employee not found for this business." }, { status: 404 });
    if (employee.profile_id) return NextResponse.json({ error: "This employee already has a login account." }, { status: 409 });

    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });
    const existingUser=usersData.users.find((user)=>user.email?.toLowerCase()===String(email).toLowerCase());
    let userId=existingUser?.id;
    if(!userId){const{data:userData,error:userError}=await supabaseAdmin.auth.admin.createUser({email,email_confirm:true});if(userError||!userData.user)return NextResponse.json({error:userError?.message||"Could not create employee account."},{status:500});userId=userData.user.id;}

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email,
      role: "employee",
      business_id: access.profile.business_id,
      must_change_password: true,
    });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const { error: employeeLinkError } = await supabaseAdmin.from("employees").update({ profile_id: userId }).eq("id", employeeId).eq("business_id", access.profile.business_id);
    if (employeeLinkError) return NextResponse.json({ error: employeeLinkError.message }, { status: 500 });

    const redirectTo=`${new URL(req.url).origin}/reset-password`;
    const{data:linkData,error:linkError}=await supabaseAdmin.auth.admin.generateLink({type:"recovery",email,options:{redirectTo}});
    if(linkError||!linkData.properties?.hashed_token)return NextResponse.json({error:linkError?.message||"Could not create a secure setup link."},{status:500});
    const setupUrl = new URL("/reset-password", new URL(req.url).origin);
    setupUrl.searchParams.set("token_hash", linkData.properties.hashed_token);
    setupUrl.searchParams.set("type", "recovery");
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

            <p>Your login email is <strong>${email}</strong>.</p>
            <p><a href="${setupUrl.toString()}" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Set your secure password</a></p>
            <p>This one-time security link expires. Ask your employer to resend it if necessary.</p>

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
      console.error("Employee login email failed", emailResponse.status, await emailResponse.text());
      const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;let notificationSent=false;if(url&&anon){const{error}=await createClient(url,anon).auth.resetPasswordForEmail(email,{redirectTo});notificationSent=!error;if(error)console.error("Supabase employee setup email failed",error.message);}
      return NextResponse.json({ success: true, userId, notificationSent });
    }

    return NextResponse.json({ success: true, userId, notificationSent: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
