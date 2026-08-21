import { NextResponse } from "next/server";
import { getSupabaseAdmin, requireRole } from "../../_lib/authorization";

const permissions = ["employees", "payroll", "payslips", "hr", "reports", "settings"] as const;
type Permission = typeof permissions[number];

function safeName(value: unknown) { return String(value || "").trim().slice(0, 100); }
function safeEmail(value: unknown) { const email = String(value || "").trim().toLowerCase(); return /^\S+@\S+\.\S+$/.test(email) ? email : ""; }
function selectedPermissions(value: unknown): Permission[] { return Array.isArray(value) ? value.filter((item): item is Permission => permissions.includes(String(item) as Permission)) : []; }

async function sendInvite(request: Request, email: string, name: string, businessName: string) {
  if (!process.env.BREVO_API_KEY || !process.env.BREVO_FROM_EMAIL) throw new Error("Admin email delivery is not configured.");
  const admin = getSupabaseAdmin();
  const redirectTo = `${new URL(request.url).origin}/reset-password`;
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });
  if (error || !data.properties?.hashed_token) throw new Error(error?.message || "Could not create a secure setup link.");
  const setupUrl = new URL("/reset-password", new URL(request.url).origin);
  setupUrl.searchParams.set("token_hash", data.properties.hashed_token);
  setupUrl.searchParams.set("type", "recovery");
  const response = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "Content-Type": "application/json", "api-key": process.env.BREVO_API_KEY }, body: JSON.stringify({ sender: { name: "WageFlow", email: process.env.BREVO_FROM_EMAIL }, to: [{ email, name }], subject: `You have been invited to ${businessName} on WageFlow`, htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.6"><p>Hi ${name || "there"},</p><p>You have been invited as an administrator for <strong>${businessName}</strong> on WageFlow.</p><p><a href="${setupUrl.toString()}">Set your secure password</a></p><p>This one-time link expires. Contact the business owner if you need a new invitation.</p><p>Kind regards,<br><strong>WageFlow</strong></p></div>` }) });
  if (!response.ok) throw new Error("The invitation email could not be accepted by the email provider.");
}

async function ownerAccess(request: Request) { return requireRole(request, ["employer"]); }

export async function GET(request: Request) {
  const access = await ownerAccess(request);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.profile.business_id) return NextResponse.json({ error: "No active business is linked to this account." }, { status: 400 });
  const { data, error } = await access.admin.from("profiles").select("id,email,full_name,access_status,admin_permissions,created_at").eq("business_id", access.profile.business_id).eq("role", "employer_admin").order("created_at", { ascending: false });
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ admins: data || [], permissions });
}

export async function POST(request: Request) {
  try {
    const access = await ownerAccess(request);
    if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
    const businessId = access.profile.business_id;
    if (!businessId) return NextResponse.json({ error: "No active business is linked to this account." }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const email = safeEmail(body.email); const name = safeName(body.name); const grants = selectedPermissions(body.permissions);
    if (!email || !name || grants.length === 0) return NextResponse.json({ error: "Name, email and at least one feature are required." }, { status: 400 });
    if (!process.env.BREVO_API_KEY || !process.env.BREVO_FROM_EMAIL) return NextResponse.json({ error: "Admin email delivery is not configured." }, { status: 503 });
    const { data: users, error: usersError } = await access.admin.auth.admin.listUsers();
    if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });
    let userId = users.users.find((user) => user.email?.toLowerCase() === email)?.id;
    if (!userId) { const { data, error } = await access.admin.auth.admin.createUser({ email, email_confirm: true }); if (error || !data.user) return NextResponse.json({ error: error?.message || "Could not create the admin account." }, { status: 500 }); userId = data.user.id; }
    const { data: existing, error: existingError } = await access.admin.from("profiles").select("role,business_id").eq("id", userId).maybeSingle();
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
    if (existing && (String(existing.role).toLowerCase() !== "employer_admin" || existing.business_id !== businessId)) return NextResponse.json({ error: "This email is already linked to another WageFlow account." }, { status: 409 });
    const { error: profileError } = await access.admin.from("profiles").upsert({ id: userId, email, full_name: name, role: "employer_admin", business_id: businessId, access_status: "active", must_change_password: true, admin_permissions: grants });
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
    const { error: membershipError } = await access.admin.from("employer_business_memberships").upsert({ employer_id: userId, business_id: businessId, membership_role: "admin", is_active: true }, { onConflict: "employer_id,business_id" });
    if (membershipError) return NextResponse.json({ error: "The business admin membership could not be created." }, { status: 500 });
    const { data: business } = await access.admin.from("businesses").select("business_name,trading_name").eq("id", businessId).maybeSingle();
    await sendInvite(request, email, name, business?.trading_name || business?.business_name || "your business");
    return NextResponse.json({ success: true, message: "Admin invited and feature access assigned." });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "The admin could not be invited." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  const access = await ownerAccess(request);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => ({})); const id = String(body.id || ""); const grants = selectedPermissions(body.permissions);
  if (!id || grants.length === 0 || !access.profile.business_id) return NextResponse.json({ error: "Select an admin and at least one feature." }, { status: 400 });
  const { error } = await access.admin.from("profiles").update({ admin_permissions: grants }).eq("id", id).eq("business_id", access.profile.business_id).eq("role", "employer_admin");
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const access = await ownerAccess(request);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !access.profile.business_id) return NextResponse.json({ error: "Select a valid admin." }, { status: 400 });
  const { error } = await access.admin.from("profiles").update({ access_status: "inactive", admin_permissions: [] }).eq("id", id).eq("business_id", access.profile.business_id).eq("role", "employer_admin");
  if (!error) await access.admin.from("employer_business_memberships").update({ is_active: false }).eq("employer_id", id).eq("business_id", access.profile.business_id);
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ success: true });
}
