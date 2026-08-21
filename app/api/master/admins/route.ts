import { NextResponse } from "next/server";
import { getSupabaseAdmin, requireRole } from "../../_lib/authorization";

async function sendInvite(request: Request, email: string, name: string) {
  if (!process.env.BREVO_API_KEY || !process.env.BREVO_FROM_EMAIL) throw new Error("Master admin email delivery is not configured.");
  const admin = getSupabaseAdmin(); const redirectTo = `${new URL(request.url).origin}/reset-password`;
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });
  if (error || !data.properties?.hashed_token) throw new Error(error?.message || "Could not create a secure setup link.");
  const setupUrl = new URL("/reset-password", new URL(request.url).origin); setupUrl.searchParams.set("token_hash", data.properties.hashed_token); setupUrl.searchParams.set("type", "recovery");
  const response = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "Content-Type": "application/json", "api-key": process.env.BREVO_API_KEY }, body: JSON.stringify({ sender: { name: "WageFlow", email: process.env.BREVO_FROM_EMAIL }, to: [{ email, name }], subject: "Your WageFlow Master Admin invitation", htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.6"><p>Hi ${name || "there"},</p><p>You have been invited to the WageFlow Master Portal.</p><p><a href="${setupUrl.toString()}">Set your secure password</a></p><p>This one-time link expires. Contact a Master Admin if you need a new invitation.</p><p>Kind regards,<br><strong>WageFlow</strong></p></div>` }) });
  if (!response.ok) throw new Error("The invitation email could not be accepted by the email provider.");
}

export async function GET(request: Request) {
  const access = await requireRole(request, ["master", "master_admin"]); if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { data, error } = await access.admin.from("profiles").select("id,email,full_name,role,access_status,created_at").in("role", ["master", "master_admin"]).order("created_at", { ascending: true });
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ admins: data || [] });
}

export async function POST(request: Request) {
  try {
    const access = await requireRole(request, ["master", "master_admin"]); if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
    const body = await request.json().catch(() => ({})); const email = String(body.email || "").trim().toLowerCase(); const name = String(body.name || "").trim().slice(0, 100);
    if (!/^\S+@\S+\.\S+$/.test(email) || !name) return NextResponse.json({ error: "Name and a valid email are required." }, { status: 400 });
    if (!process.env.BREVO_API_KEY || !process.env.BREVO_FROM_EMAIL) return NextResponse.json({ error: "Master admin email delivery is not configured." }, { status: 503 });
    const { data: users, error: usersError } = await access.admin.auth.admin.listUsers(); if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });
    let userId = users.users.find((user) => user.email?.toLowerCase() === email)?.id;
    if (!userId) { const { data, error } = await access.admin.auth.admin.createUser({ email, email_confirm: true }); if (error || !data.user) return NextResponse.json({ error: error?.message || "Could not create the Master Admin account." }, { status: 500 }); userId = data.user.id; }
    const { data: profile } = await access.admin.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (profile && !["master", "master_admin"].includes(String(profile.role).toLowerCase())) return NextResponse.json({ error: "This email is already linked to another WageFlow account." }, { status: 409 });
    const { error: profileError } = await access.admin.from("profiles").upsert({ id: userId, email, full_name: name, role: "master_admin", access_status: "active", business_id: null, must_change_password: true });
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
    await sendInvite(request, email, name);
    return NextResponse.json({ success: true, message: "Master Admin invited." });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "The Master Admin could not be invited." }, { status: 500 }); }
}
