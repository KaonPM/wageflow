import { NextResponse } from "next/server";
import { requireRole } from "../_lib/authorization";

const types = new Set(["payroll_summary", "employee_master_list", "employee_exit_report", "uif_report", "paye_report"]);

export async function GET(request: Request) {
  const access = await requireRole(request, ["employer"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.profile.business_id) return NextResponse.json({ error: "Business profile not found." }, { status: 400 });
  const { data, error } = await access.admin.from("report_schedules").select("id,report_type,recipient_email,frequency,delivery_day,active,last_sent_at,created_at").eq("business_id", access.profile.business_id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedules: data || [] });
}

export async function POST(request: Request) {
  const access = await requireRole(request, ["employer"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => ({})); const reportType = String(body.reportType || ""); const email = String(body.email || "").trim().toLowerCase(); const day = Number(body.day || 1);
  if (!access.profile.business_id || !types.has(reportType) || !/^\S+@\S+\.\S+$/.test(email) || !Number.isInteger(day) || day < 1 || day > 28) return NextResponse.json({ error: "Choose a report, a valid email address and a delivery day between 1 and 28." }, { status: 400 });
  const { data, error } = await access.admin.from("report_schedules").insert({ business_id: access.profile.business_id, report_type: reportType, recipient_email: email, delivery_day: day }).select("id,report_type,recipient_email,delivery_day,active,last_sent_at,created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedule: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const access = await requireRole(request, ["employer"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !access.profile.business_id) return NextResponse.json({ error: "Schedule not found." }, { status: 400 });
  const { error } = await access.admin.from("report_schedules").delete().eq("id", id).eq("business_id", access.profile.business_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
