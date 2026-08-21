import { NextResponse } from "next/server";
import { requireRole } from "../_lib/authorization";
import { createPortalTask } from "../_lib/portalTasks";
import { sendOneSignalPush } from "../_lib/oneSignal";

const BUCKET = "employee-change-evidence";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const REQUEST_TYPES = new Set(["contact", "emergency_contact", "banking"]);

export async function GET(request: Request) {
  const access = await requireRole(request, ["employee", "employer"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  if (access.profile.role.toLowerCase() === "employee") {
    const { data: account } = await access.admin.from("employee_accounts").select("employee_id").eq("auth_user_id", access.user.id).eq("portal_enabled", true).maybeSingle();
    if (!account?.employee_id) return NextResponse.json({ error: "Your employee portal access is not active." }, { status: 403 });
    const { data, error } = await access.admin.from("employee_change_requests").select("*").eq("employee_id", account.employee_id).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ requests: data || [] });
  }

  if (!access.profile.business_id) return NextResponse.json({ error: "Business profile not found." }, { status: 400 });
  const { data, error } = await access.admin.from("employee_change_requests").select("*, employees(first_name,last_name,employee_number)").eq("business_id", access.profile.business_id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data || [] });
}

export async function POST(request: Request) {
  const access = await requireRole(request, ["employee"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const { data: account } = await access.admin.from("employee_accounts").select("employee_id").eq("auth_user_id", access.user.id).eq("portal_enabled", true).maybeSingle();
  if (!account?.employee_id) return NextResponse.json({ error: "Your employee portal access is not active." }, { status: 403 });
  const { data: employee } = await access.admin.from("employees").select("id,business_id,first_name,last_name").eq("id", account.employee_id).maybeSingle();
  if (!employee?.business_id) return NextResponse.json({ error: "Employee business record was not found." }, { status: 404 });

  const form = await request.formData().catch(() => null);
  const requestType = String(form?.get("requestType") || "");
  const employeeNote = String(form?.get("employeeNote") || "").trim().slice(0, 2000);
  const rawChanges = String(form?.get("changes") || "{}");
  const file = form?.get("evidence");
  if (!REQUEST_TYPES.has(requestType)) return NextResponse.json({ error: "Choose a valid change type." }, { status: 400 });

  let requestedChanges: Record<string, string>;
  try { requestedChanges = JSON.parse(rawChanges); } catch { return NextResponse.json({ error: "The requested changes are invalid." }, { status: 400 }); }
  if (!requestedChanges || typeof requestedChanges !== "object" || Array.isArray(requestedChanges) || !Object.values(requestedChanges).some((value) => String(value).trim())) return NextResponse.json({ error: "Enter at least one requested change." }, { status: 400 });
  if (requestType === "banking" && !(file instanceof File)) return NextResponse.json({ error: "Attach a bank letter or confirmation for a banking change." }, { status: 400 });
  if (file instanceof File && (file.size <= 0 || file.size > MAX_FILE_SIZE || !ALLOWED_TYPES.has(file.type))) return NextResponse.json({ error: "Evidence must be a PDF, JPG or PNG smaller than 10 MB." }, { status: 400 });

  let evidencePath: string | null = null;
  if (file instanceof File) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
    evidencePath = `${employee.business_id}/${employee.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await access.admin.storage.from(BUCKET).upload(evidencePath, await file.arrayBuffer(), { contentType: file.type, upsert: false });
    if (uploadError) return NextResponse.json({ error: "The supporting document could not be stored." }, { status: 500 });
  }

  const { data: changeRequest, error } = await access.admin.from("employee_change_requests").insert({ business_id: employee.business_id, employee_id: employee.id, request_type: requestType, requested_changes: requestedChanges, evidence_path: evidencePath, employee_note: employeeNote || null }).select("id").single();
  if (error) {
    if (evidencePath) await access.admin.storage.from(BUCKET).remove([evidencePath]);
    return NextResponse.json({ error: "The change request could not be saved." }, { status: 500 });
  }

  const { data: business } = await access.admin.from("businesses").select("employer_id").eq("id", employee.business_id).maybeSingle();
  if (business?.employer_id) {
    const name = `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || "An employee";
    const label = requestType === "emergency_contact" ? "emergency contact" : requestType;
    await createPortalTask(access.admin, { businessId: employee.business_id, recipientUserId: business.employer_id, recipientRole: "employer", title: "Profile change approval needed", message: `${name} submitted a ${label} change request.`, href: "/employer/change-requests", taskType: "profile_change_needed" });
    await sendOneSignalPush({ externalIds: [business.employer_id], title: "Profile change approval needed", message: `${name} submitted a ${label} change request.`, url: `${new URL(request.url).origin}/employer/change-requests` });
  }
  return NextResponse.json({ success: true, requestId: changeRequest.id }, { status: 201 });
}
