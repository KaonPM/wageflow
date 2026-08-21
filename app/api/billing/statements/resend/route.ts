import { NextResponse } from "next/server";
import { requireRole } from "../../../_lib/authorization";
import { resendStatementEmail } from "../../../_lib/billing";

export async function POST(request: Request) {
  const access = await requireRole(request, ["master", "master_admin"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => null) as { statementId?: string } | null;
  if (!body?.statementId) return NextResponse.json({ error: "A statement is required." }, { status: 400 });
  try {
    return NextResponse.json({ success: true, ...(await resendStatementEmail(access.admin, body.statementId)) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Statement could not be resent." }, { status: 500 });
  }
}
