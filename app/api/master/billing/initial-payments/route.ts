import { NextResponse } from "next/server";
import { requireRole } from "../../../_lib/authorization";

export async function GET(request: Request) {
  const access = await requireRole(request, ["master", "master_admin"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const payments: Array<{ id: string; business_id: string | null; subscription_id: string | null; setup_amount: number; first_month_amount: number; total_amount: number; covered_month: string; verified_at: string | null; created_at: string }> = [];
  const pageSize = 500;
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await access.admin.from("application_initial_payments")
      .select("id,business_id,subscription_id,setup_amount,first_month_amount,total_amount,covered_month,verified_at,created_at")
      .eq("status", "verified")
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(start, start + pageSize - 1);
    if (error) return NextResponse.json({ error: "Signup payments could not be loaded." }, { status: 500 });
    payments.push(...(data || []) as typeof payments);
    if (!data || data.length < pageSize) break;
  }
  return NextResponse.json({ payments }, { headers: { "Cache-Control": "no-store" } });
}
