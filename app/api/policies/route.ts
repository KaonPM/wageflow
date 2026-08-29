import { NextResponse } from "next/server";
import { requireRole } from "../_lib/authorization";
import { createPortalTask } from "../_lib/portalTasks";

const BUCKET = "employee-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const FILE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);

export async function GET(request: Request) {
  const access = await requireRole(request, ["employer", "employee"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  if (String(access.profile.role).toLowerCase() === "employer") {
    if (!access.profile.business_id) return NextResponse.json({ error: "Business profile not found." }, { status: 400 });
    const [{ data: policies, error }, { data: employees }, { data: business }] = await Promise.all([
      access.admin.from("company_policies").select("id,title,version,policy_text,file_path,published_at,created_at,policy_assignments(id,employee_id,policy_acknowledgements(id,acknowledged_at,employee_id))").eq("business_id", access.profile.business_id).order("published_at", { ascending: false }),
      access.admin.from("employees").select("id,full_name,first_name,last_name,employment_status,status").eq("business_id", access.profile.business_id).order("first_name"),
      access.admin.from("businesses").select("default_employee_portal_enabled").eq("id", access.profile.business_id).maybeSingle(),
    ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ policies: policies || [], employees: employees || [], paperFirst: business?.default_employee_portal_enabled === false });
  }

  const { data: account, error: accountError } = await access.admin.from("employee_accounts").select("employee_id,portal_enabled").eq("auth_user_id", access.user.id).maybeSingle();
  if (accountError || !account?.employee_id || account.portal_enabled !== true) return NextResponse.json({ error: "Employee portal account not found." }, { status: 403 });
  const { data, error } = await access.admin.from("policy_assignments").select("id,assigned_at,company_policies(id,title,version,policy_text,file_path,published_at),policy_acknowledgements(id,acknowledged_at)").eq("employee_id", account.employee_id).order("assigned_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ policies: data || [] });
}

export async function POST(request: Request) {
  const access = await requireRole(request, ["employer"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const businessId = access.profile.business_id;
  if (!businessId) return NextResponse.json({ error: "Business profile not found." }, { status: 400 });
  const form = await request.formData().catch(() => null);
  const title = String(form?.get("title") || "").trim().slice(0, 160);
  const version = String(form?.get("version") || "1.0").trim().slice(0, 40);
  const policyText = String(form?.get("policyText") || "").trim().slice(0, 12000);
  const selected = JSON.parse(String(form?.get("employeeIds") || "[]")) as string[];
  const file = form?.get("file");
  if (title.length < 2 || selected.length === 0) return NextResponse.json({ error: "A policy title and at least one employee are required." }, { status: 400 });
  if (!policyText && !(file instanceof File)) return NextResponse.json({ error: "Add policy text or upload a policy document." }, { status: 400 });
  if (file instanceof File && (file.size <= 0 || file.size > MAX_FILE_SIZE || !FILE_TYPES.has(file.type))) return NextResponse.json({ error: "Policy files must be PDF, JPG, PNG or DOCX files under 10 MB." }, { status: 400 });
  const { data: matchingEmployees } = await access.admin.from("employees").select("id,full_name,first_name,last_name").eq("business_id", businessId).in("id", selected);
  if ((matchingEmployees || []).length !== [...new Set(selected)].length) return NextResponse.json({ error: "One or more selected employees do not belong to this business." }, { status: 400 });
  let filePath: string | null = null;
  if (file instanceof File) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
    filePath = `${businessId}/policies/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await access.admin.storage.from(BUCKET).upload(filePath, await file.arrayBuffer(), { contentType: file.type, upsert: false });
    if (uploadError) return NextResponse.json({ error: "The policy file could not be uploaded." }, { status: 500 });
  }
  const { data: policy, error: policyError } = await access.admin.from("company_policies").insert({ business_id: businessId, title, version, policy_text: policyText || null, file_path: filePath }).select("id").single();
  if (policyError || !policy) {
    if (filePath) await access.admin.storage.from(BUCKET).remove([filePath]);
    return NextResponse.json({ error: policyError?.message || "The policy could not be saved." }, { status: 500 });
  }
  const { error: assignmentsError } = await access.admin.from("policy_assignments").insert((matchingEmployees || []).map((employee) => ({ policy_id: policy.id, employee_id: employee.id })));
  if (assignmentsError) return NextResponse.json({ error: assignmentsError.message }, { status: 500 });
  await Promise.all((matchingEmployees || []).map(async (employee) => {
    const { data: employeeAccount } = await access.admin.from("employee_accounts").select("auth_user_id,portal_enabled").eq("employee_id", employee.id).maybeSingle();
    if (employeeAccount?.auth_user_id && employeeAccount.portal_enabled) await createPortalTask(access.admin, { businessId, recipientUserId: employeeAccount.auth_user_id, recipientRole: "employee", title: "Policy acknowledgement required", message: `${title} (version ${version}) has been shared with you. Please review and acknowledge it.`, href: "/employee/policies", taskType: "policy_acknowledgement" });
  }));
  return NextResponse.json({ success: true, policyId: policy.id }, { status: 201 });
}
