import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../_lib/authorization";

const labels: Record<string, string> = { payroll_summary: "Payroll Summary Report", employee_master_list: "Employee Master List", employee_exit_report: "Employee Exit Report", uif_report: "UIF Report", paye_report: "PAYE Report" };

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.BREVO_API_KEY || !process.env.BREVO_FROM_EMAIL) return NextResponse.json({ error: "Brevo email is not configured." }, { status: 503 });
  const admin = getSupabaseAdmin(); const now = new Date(); const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)); const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const { data: schedules, error } = await admin.from("report_schedules").select("id,business_id,report_type,recipient_email,last_sent_at").eq("active", true).eq("delivery_day", now.getUTCDate());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let sent = 0; let failed = 0;
  for (const schedule of schedules || []) {
    if (schedule.last_sent_at && new Date(schedule.last_sent_at) >= monthStart) continue;
    const { data: business } = await admin.from("businesses").select("business_name,trading_name").eq("id", schedule.business_id).maybeSingle();
    if (!business) { failed += 1; continue; }
    const name = business.trading_name || business.business_name || "Your business";
    const summary = await reportSummary(admin, schedule.business_id, schedule.report_type, monthStart.toISOString(), nextMonth.toISOString());
    const response = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "Content-Type": "application/json", "api-key": process.env.BREVO_API_KEY }, body: JSON.stringify({ sender: { name: "WageFlow", email: process.env.BREVO_FROM_EMAIL }, to: [{ email: schedule.recipient_email, name }], subject: `${labels[schedule.report_type]} — ${name}`, htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a"><h2 style="color:#0f766e">${escape(labels[schedule.report_type])}</h2><p>${escape(name)} · ${new Date().toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}</p>${summary}<p><a href="${new URL("/employer/reports", request.url).toString()}">Open WageFlow to view, filter and save the branded report PDF.</a></p></div>` }) });
    if (response.ok) { await admin.from("report_schedules").update({ last_sent_at: now.toISOString() }).eq("id", schedule.id); sent += 1; } else failed += 1;
  }
  return NextResponse.json({ success: true, sent, failed });
}

async function reportSummary(admin: ReturnType<typeof getSupabaseAdmin>, businessId: string, type: string, start: string, end: string) {
  if (type === "employee_master_list") { const { count } = await admin.from("employees").select("id", { count: "exact", head: true }).eq("business_id", businessId).neq("employment_status", "terminated"); return `<p><strong>Active employee records:</strong> ${count || 0}</p>`; }
  if (type === "employee_exit_report") { const { count } = await admin.from("employees").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("employment_status", "terminated").gte("end_date", start.slice(0, 10)).lt("end_date", end.slice(0, 10)); return `<p><strong>Employee exits recorded this month:</strong> ${count || 0}</p>`; }
  const month = start.slice(0, 7); const { data } = await admin.from("payslips").select("gross_pay,paye,total_uif,net_pay").eq("business_id", businessId).eq("payroll_month", month); const total = (field: "gross_pay" | "paye" | "total_uif" | "net_pay") => (data || []).reduce((sum, row) => sum + Number(row[field] || 0), 0).toLocaleString("en-ZA", { style: "currency", currency: "ZAR" });
  if (type === "paye_report") return `<p><strong>PAYE payable:</strong> ${total("paye")}</p>`;
  if (type === "uif_report") return `<p><strong>Total UIF:</strong> ${total("total_uif")}</p>`;
  return `<p><strong>Employees processed:</strong> ${(data || []).length}<br><strong>Gross payroll:</strong> ${total("gross_pay")}<br><strong>Net payroll:</strong> ${total("net_pay")}</p>`;
}
function escape(value: string) { return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character); }
