import { NextResponse } from "next/server";
import { requireRole } from "../_lib/authorization";

const BUCKET = "employee-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);

export async function POST(request: Request) {
  const access = await requireRole(request, ["employer"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.profile.business_id) return NextResponse.json({ error: "Business profile not found." }, { status: 400 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const employeeId = String(form?.get("employeeId") || "");
  const documentName = String(form?.get("documentName") || "").trim().slice(0, 160);
  const documentCategory = String(form?.get("documentCategory") || "Other").trim().slice(0, 80);
  const notes = String(form?.get("notes") || "").trim().slice(0, 4000);
  if (!(file instanceof File) || !employeeId || !documentName) return NextResponse.json({ error: "File, employee and document name are required." }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "The file must be smaller than 10 MB." }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Only PDF, JPG, PNG and DOCX files are allowed." }, { status: 400 });

  const { data: employee } = await access.admin.from("employees").select("id").eq("id", employeeId).eq("business_id", access.profile.business_id).maybeSingle();
  if (!employee) return NextResponse.json({ error: "Employee not found for this business." }, { status: 404 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  const path = `${access.profile.business_id}/${employeeId}/${crypto.randomUUID()}-${safeName}`;
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await access.admin.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: "The document could not be stored." }, { status: 500 });

  const { data: document, error: insertError } = await access.admin.from("employee_documents").insert({
    business_id: access.profile.business_id, employee_id: employeeId, document_name: documentName,
    document_category: documentCategory, file_url: path, notes,
  }).select("id").single();
  if (insertError) {
    await access.admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: "The document record could not be saved." }, { status: 500 });
  }
  return NextResponse.json({ success: true, documentId: document.id }, { status: 201 });
}
