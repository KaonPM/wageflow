import { NextResponse } from "next/server";
import mammoth from "mammoth";
import pdf from "pdf-parse/lib/pdf-parse.js";
import { requireRole } from "../../_lib/authorization";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const SUPPORTED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function POST(request: Request) {
  const access = await requireRole(request, ["employer"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const employeeId = String(form?.get("employeeId") || "");
  if (!(file instanceof File) || !employeeId) {
    return NextResponse.json({ error: "Choose an employee and a PDF or DOCX contract." }, { status: 400 });
  }
  if (!SUPPORTED_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Contract extraction supports PDF and DOCX files up to 10 MB." }, { status: 400 });
  }

  const { data: employee } = await access.admin
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("business_id", access.profile.business_id)
    .maybeSingle();
  if (!employee) return NextResponse.json({ error: "Employee not found for this business." }, { status: 404 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = file.type === "application/pdf"
      ? (await pdf(buffer)).text
      : (await mammoth.extractRawText({ buffer })).value;
    const cleanText = text.replace(/\u0000/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    if (cleanText.length < 40) {
      return NextResponse.json({
        error: "No readable contract text was found. This may be a scanned document and needs OCR before automatic extraction.",
      }, { status: 422 });
    }
    return NextResponse.json({ suggestions: extractContractFields(cleanText), textLength: cleanText.length });
  } catch {
    return NextResponse.json({ error: "The contract could not be read. Check that it is a valid, unlocked PDF or DOCX file." }, { status: 422 });
  }
}

function extractContractFields(text: string) {
  return {
    first_name: firstMatch(text, [/(?:employee|first|given)\s*name\s*[:\-]\s*([^\n,]{2,60})/i]),
    last_name: firstMatch(text, [/(?:surname|last\s*name)\s*[:\-]\s*([^\n,]{2,60})/i]),
    id_number: firstMatch(text, [/(?:id|identity)\s*(?:number|no\.?|#)\s*[:\-]\s*(\d{13})/i, /\b(\d{13})\b/]),
    position: firstMatch(text, [/(?:position|job\s*title|designation|role)\s*[:\-]\s*([^\n]{2,80})/i]),
    employment_type: normaliseEmploymentType(firstMatch(text, [/(?:employment\s*type|contract\s*type)\s*[:\-]\s*([^\n]{2,50})/i, /\b(permanent|fixed[ -]term|temporary|part[ -]time|full[ -]time)\b/i])),
    start_date: normaliseDate(firstMatch(text, [/(?:commencement|start|employment)\s*date\s*[:\-]\s*([^\n]{4,40})/i, /(?:commence|starts?)\s+on\s+([^\n,.]{4,40})/i])),
    basic_salary: normaliseMoney(firstMatch(text, [/(?:basic\s*)?(?:salary|remuneration|wage)\s*[:\-]\s*(?:R|ZAR)?\s*([\d ,]+(?:\.\d{1,2})?)/i])),
    salary_payment_date: firstMatch(text, [/(?:salary\s*)?(?:payment|pay)\s*date\s*[:\-]\s*([^\n]{1,40})/i, /paid\s+(?:on|by)\s+(?:the\s+)?([^\n,.]{1,35})/i]),
  };
}

function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const value = text.match(pattern)?.[1]?.trim().replace(/\s{2,}/g, " ");
    if (value) return value.slice(0, 100);
  }
  return "";
}

function normaliseMoney(value: string) {
  if (!value) return "";
  const parsed = Number(value.replace(/[ ,]/g, ""));
  return Number.isFinite(parsed) ? String(parsed) : "";
}

function normaliseEmploymentType(value: string) {
  if (!value) return "";
  return value.trim().replace(/\b\w/g, (letter) => letter.toUpperCase()).slice(0, 50);
}

function normaliseDate(value: string) {
  if (!value) return "";
  const iso = value.match(/\b(20\d{2})[-/]([01]?\d)[-/]([0-3]?\d)\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const southAfrican = value.match(/\b([0-3]?\d)[-/]([01]?\d)[-/](20\d{2})\b/);
  if (southAfrican) return `${southAfrican[3]}-${southAfrican[2].padStart(2, "0")}-${southAfrican[1].padStart(2, "0")}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}
