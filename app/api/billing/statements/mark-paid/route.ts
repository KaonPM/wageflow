import { NextResponse } from "next/server";
import { getSupabaseAdmin, requireRole } from "../../../_lib/authorization";
import { markStatementPaidAndEmail } from "../../../_lib/billing";

export async function POST(request: Request) {
  const access = await requireRole(request, ["master", "master_admin"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => null) as { statementId?: string; paymentReference?: string } | null;
  if (!body?.statementId) return NextResponse.json({ error: "A statement is required." }, { status: 400 });
  try {
    const result = await markStatementPaidAndEmail(getSupabaseAdmin(), body.statementId, body.paymentReference);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Payment could not be recorded." }, { status: 500 });
  }
}
