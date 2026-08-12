import { NextResponse } from "next/server";
import { requireRole } from "../../_lib/authorization";

function storagePath(value: string) {
  if (!/^https?:\/\//i.test(value)) return value.replace(/^\/+/, "");
  const marker = "/employee-documents/";
  const index = value.indexOf(marker);
  return index >= 0 ? decodeURIComponent(value.slice(index + marker.length)) : "";
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireRole(request, ["employer", "employee"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  const { data: document } = await access.admin.from("employee_documents").select("id, business_id, employee_id, file_url, document_name").eq("id", id).maybeSingle();
  if (!document?.file_url) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  const role = String(access.profile.role).toLowerCase();
  if (role === "employer" && document.business_id !== access.profile.business_id) return NextResponse.json({ error: "Access denied." }, { status: 403 });
  if (role === "employee") {
    const { data: account } = await access.admin.from("employee_accounts").select("employee_id, portal_enabled").eq("auth_user_id", access.user.id).maybeSingle();
    if (!account?.portal_enabled || account.employee_id !== document.employee_id) return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const path = storagePath(document.file_url);
  if (!path) return NextResponse.json({ error: "Stored document path is invalid." }, { status: 500 });
  const download = new URL(request.url).searchParams.get("download") === "1";
  const safeDownloadName = String(document.document_name || "employee-document")
    .replace(/[\r\n"\\/]/g, "_")
    .slice(0, 120);
  const { data, error } = await access.admin.storage
    .from("employee-documents")
    .createSignedUrl(path, 60, download ? { download: safeDownloadName } : undefined);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "Document could not be opened." }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl, name: document.document_name }, { headers: { "Cache-Control": "no-store" } });
}
