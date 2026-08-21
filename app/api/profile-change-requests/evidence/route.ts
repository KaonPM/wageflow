import { NextResponse } from "next/server";
import { requireRole } from "../../_lib/authorization";

export async function GET(request: Request) {
  const access = await requireRole(request, ["employer"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id || !access.profile.business_id) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  const { data: changeRequest } = await access.admin.from("employee_change_requests").select("evidence_path").eq("id", id).eq("business_id", access.profile.business_id).maybeSingle();
  if (!changeRequest?.evidence_path) return NextResponse.json({ error: "No supporting document is attached." }, { status: 404 });
  const { data, error } = await access.admin.storage.from("employee-change-evidence").createSignedUrl(changeRequest.evidence_path, 300, { download: true });
  if (error || !data?.signedUrl) return NextResponse.json({ error: "The supporting document could not be opened." }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}
