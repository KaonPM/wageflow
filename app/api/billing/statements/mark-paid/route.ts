import { NextResponse } from "next/server";
import { requireRole } from "../../../_lib/authorization";

export async function POST(request: Request) {
  const access = await requireRole(request, ["master", "master_admin"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  return NextResponse.json({ error: "Manual payment recording is unavailable. Use Paystack checkout." }, { status: 410 });
}
