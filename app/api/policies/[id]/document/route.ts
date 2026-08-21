import { NextResponse } from "next/server";
import { requireRole } from "../../../_lib/authorization";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRole(request, ["employer", "employee"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const { data: policy, error } = await access.admin.from("company_policies").select("id,business_id,file_path").eq("id", id).maybeSingle();
  if (error || !policy?.file_path) return NextResponse.json({ error: "Policy file not found." }, { status: 404 });
  if (String(access.profile.role).toLowerCase() === "employer") {
    if (policy.business_id !== access.profile.business_id) return NextResponse.json({ error: "You do not have access to this policy." }, { status: 403 });
  } else {
    const { data: account } = await access.admin.from("employee_accounts").select("employee_id").eq("auth_user_id", access.user.id).maybeSingle();
    const { data: assignment } = account?.employee_id ? await access.admin.from("policy_assignments").select("id").eq("policy_id", policy.id).eq("employee_id", account.employee_id).maybeSingle() : { data: null };
    if (!assignment) return NextResponse.json({ error: "You do not have access to this policy." }, { status: 403 });
  }
  const { data: signed, error: signError } = await access.admin.storage.from("employee-documents").createSignedUrl(policy.file_path, 60);
  if (signError || !signed?.signedUrl) return NextResponse.json({ error: "The policy file could not be opened." }, { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}
