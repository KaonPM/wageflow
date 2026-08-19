"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";
import { validateUifDeclaration } from "@/app/lib/compliance/uif/validator";
import type { ComplianceEmployee, ComplianceIssue } from "@/app/lib/compliance/types";

type Business = {
  id: string;
  business_name?: string | null;
  trading_name?: string | null;
  registered_name?: string | null;
  name?: string | null;
  paye_reference?: string | null;
  uif_reference?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  postal_address?: string | null;
  worksite_address?: string | null;
  authorised_person?: string | null;
  registration_number?: string | null;
};

type PayrollRun = {
  id: string;
  payroll_month: string;
  employee_count: number | null;
  total_gross_pay: number | null;
  total_paye: number | null;
  total_uif_employee: number | null;
  total_uif_employer: number | null;
  total_uif: number | null;
  sars_payable: number | null;
  status: string | null;
};

export default function ComplianceSummaryPage() {
  const [businessName, setBusinessName] = useState("Business");
  const [businessId, setBusinessId] = useState("");
  const [payrollMonth, setPayrollMonth] = useState("");
  const [payrollRun, setPayrollRun] = useState<PayrollRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [business, setBusiness] = useState<Business | null>(null);
  const [uifIssues, setUifIssues] = useState<ComplianceIssue[]>([]);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}`;

    setPayrollMonth(currentMonth);
    initialisePage(currentMonth);
  }, []);

  async function getEmployerBusiness(): Promise<Business | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (!profile?.business_id) return null;

    const { data: business } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", profile.business_id)
      .single();

    return business || null;
  }

  async function initialisePage(month: string) {
    setLoading(true);
    setMessage("");

    const business = await getEmployerBusiness();

    if (!business?.id) {
      setMessage("Business profile not found.");
      setLoading(false);
      return;
    }

    setBusinessId(business.id);
    setBusiness(business);
    setBusinessName(
      business.trading_name ||
        business.business_name ||
        business.registered_name ||
        business.name ||
        "Business"
    );

    await fetchComplianceSummary(business.id, month);

    setLoading(false);
  }

  async function fetchComplianceSummary(activeBusinessId: string, month: string) {
    const { data, error } = await supabase
      .from("payroll_runs")
      .select("*")
      .eq("business_id", activeBusinessId)
      .eq("payroll_month", month)
      .maybeSingle();

    if (error) {
      setMessage(error.message);
      setPayrollRun(null);
      return;
    }

    setPayrollRun(data || null);
  }

  async function validateUif(generateUi19 = false) {
    if (!businessId || !business || !payrollRun) return;
    setValidating(true);
    setMessage("");
    const [employeesResult, payslipsResult] = await Promise.all([
      supabase.from("employees").select("*").eq("business_id", businessId).order("employee_number", { ascending: true }),
      supabase.from("payslips").select("*").eq("payroll_run_id", payrollRun.id),
    ]);
    const error = employeesResult.error || payslipsResult.error;
    if (error) {
      setMessage(error.message);
    } else {
      const payslipsByEmployee = new Map((payslipsResult.data || []).map((payslip) => [payslip.employee_id, payslip]));
      const employees = (employeesResult.data || []).filter((employee) => payslipsByEmployee.has(employee.id)).map((employee) => {
        const payslip = payslipsByEmployee.get(employee.id);
        return { ...employee, monthly_hours_worked: payslip?.hours_worked == null ? null : Number(payslip.hours_worked), monthly_gross_remuneration: payslip?.gross_pay == null ? null : Number(payslip.gross_pay) };
      }) as ComplianceEmployee[];
      const issues = validateUifDeclaration(business, employees);
      setUifIssues(issues);
      if (generateUi19 && issues.length === 0) openUi19(employees);
    }
    setValidating(false);
  }

  async function recordHoursWorked(issue: ComplianceIssue) {
    if (!payrollRun?.id || !issue.employeeId) return;
    const entered = window.prompt(`Hours worked for ${issue.employeeNumber || "this employee"} during ${payrollRun.payroll_month}:`);
    if (entered === null) return;
    const hours = Number(entered);
    if (!Number.isFinite(hours) || hours < 0) {
      setMessage("Enter a valid number of hours (zero or more).");
      return;
    }
    setValidating(true);
    const { data: payslip, error: lookupError } = await supabase
      .from("payslips")
      .select("id")
      .eq("payroll_run_id", payrollRun.id)
      .eq("employee_id", issue.employeeId)
      .maybeSingle();
    if (lookupError || !payslip) {
      setMessage(lookupError?.message || "Payslip not found for this employee and payroll month.");
      setValidating(false);
      return;
    }
    const { error } = await supabase.from("payslips").update({ hours_worked: hours }).eq("id", payslip.id);
    if (error) setMessage(error.message);
    else await validateUif();
    setValidating(false);
  }

  function openUi19(employees: ComplianceEmployee[]) {
    if (!business || !payrollRun) return;
    const report = window.open("about:blank", "_blank");
    if (!report) {
      setMessage("Allow pop-ups to generate the UI-19.");
      return;
    }
    const escape = (value: string) => value.replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" }[character] || character));
    const date = (value?: string | null) => value ? escape(value) : "";
    const rows = employees.map((employee) => {
      const initials = (employee.first_name || "").split(/\s+/).filter(Boolean).map((name) => `${name[0]}.`).join(" ");
      const contributor = (employee.uif_contributor ?? employee.uif_registered) ? "Yes" : "No";
      return `<tr><td>${escape(employee.last_name || "")}</td><td>${escape(initials)}</td><td>${escape(employee.id_number || employee.passport_number || "")}</td><td>${Number(employee.monthly_gross_remuneration || 0).toFixed(2)}</td><td>${Number(employee.monthly_hours_worked || 0).toFixed(2)}</td><td>${date(employee.start_date)}</td><td>${date(employee.end_date)}</td><td>${escape(employee.termination_reason || "")}</td><td>${contributor}</td><td>${escape(employee.uif_non_contributor_reason || "")}</td></tr>`;
    }).join("");
    report.document.write(`<!doctype html><html><head><title>UI-19 Employer Declaration</title><style>body{font-family:Arial,sans-serif;color:#111;margin:26px;font-size:11px}h1{font-size:18px;margin:0}h2{font-size:13px;margin:20px 0 8px;border-bottom:1px solid #222;padding-bottom:4px}.meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.meta p{margin:0}table{width:100%;border-collapse:collapse;margin-top:8px;font-size:9px}th,td{border:1px solid #555;padding:5px;text-align:left;vertical-align:top}th{background:#eee}.note{margin-top:18px;padding:10px;background:#fff7ed;line-height:1.45}.sign{margin-top:42px;display:flex;justify-content:space-between;gap:30px}.line{border-top:1px solid #111;padding-top:5px;min-width:220px}@media print{button{display:none}body{margin:12mm}}</style></head><body><button onclick="window.print()">Print / Save PDF</button><h1>UI-19 - Employer's Declaration of Employees</h1><p>Prepared from WageFlow payroll records for employer review. The employer must verify all information before signing or submitting.</p><h2>1. Employer details</h2><div class="meta"><p><strong>UIF reference:</strong> ${escape(business.uif_reference || "")}</p><p><strong>PAYE reference:</strong> ${escape(business.paye_reference || "")}</p><p><strong>Trading / registered name:</strong> ${escape(business.trading_name || business.registered_name || business.business_name || "")}</p><p><strong>Company registration:</strong> ${escape(business.registration_number || "")}</p><p><strong>Physical address:</strong> ${escape(business.address || "")}</p><p><strong>Postal address:</strong> ${escape(business.postal_address || business.address || "")}</p><p><strong>Worksite address:</strong> ${escape(business.worksite_address || business.address || "")}</p><p><strong>Authorised person:</strong> ${escape(business.authorised_person || "")}</p><p><strong>Phone / email:</strong> ${escape([business.phone, business.email].filter(Boolean).join(" / "))}</p><p><strong>Payroll month:</strong> ${escape(payrollRun.payroll_month)}</p></div><h2>2. Employee details</h2><table><thead><tr><th>Surname</th><th>Initials</th><th>ID / Passport</th><th>Gross remuneration</th><th>Hours worked</th><th>Start date</th><th>End date</th><th>Termination reason</th><th>Contributor</th><th>Non-contributor reason</th></tr></thead><tbody>${rows}</tbody></table><div class="note"><strong>Employer declaration:</strong> I confirm that the information has been reviewed and is correct to the best of my knowledge. WageFlow prepares this document from payroll records and does not submit it on the employer's behalf.</div><div class="sign"><div class="line">Employer / authorised representative signature</div><div class="line">Date</div></div></body></html>`);
    report.document.close();
    report.opener = null;
  }

  function openEmp201PreparationReport() {
    if (!payrollRun || !business) return;
    const report = window.open("about:blank", "_blank");
    if (!report) {
      setMessage("Allow pop-ups to open the EMP201 Preparation Report.");
      return;
    }
    const escape = (value: string) => value.replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" }[character] || character));
    const row = (label: string, value: string) => `<tr><td>${escape(label)}</td><td>${escape(value)}</td></tr>`;
    report.document.write(`<!doctype html><html><head><title>EMP201 Preparation Report</title><style>body{font-family:Arial,sans-serif;color:#0f172a;margin:42px;max-width:780px}h1{color:#0f766e}table{width:100%;border-collapse:collapse;margin:22px 0}td{padding:11px;border-bottom:1px solid #e2e8f0}td:last-child{text-align:right;font-weight:700}.note{background:#fff7ed;padding:15px;border-radius:10px;line-height:1.55}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Print / Save PDF</button><h1>EMP201 Preparation Report</h1><p>${escape(business.registered_name || business.business_name || businessName)}</p><p>Payroll month: ${escape(payrollRun.payroll_month)} · Generated: ${new Date().toLocaleDateString()}</p><table>${row("PAYE reference", business.paye_reference || "Not recorded")}${row("UIF reference", business.uif_reference || "Not recorded")}${row("Employees processed", String(payrollRun.employee_count || 0))}${row("Gross payroll", money(payrollRun.total_gross_pay))}${row("PAYE", money(payrollRun.total_paye))}${row("UIF employee", money(payrollRun.total_uif_employee))}${row("UIF employer", money(payrollRun.total_uif_employer))}${row("Total UIF", money(payrollRun.total_uif))}${row("Total statutory liability", money(payrollRun.sars_payable))}</table><p class="note"><strong>Important:</strong> This report is prepared from WageFlow payroll records to assist the employer with completing the applicable SARS employer declaration. WageFlow does not submit this return on behalf of the employer.</p></body></html>`);
    report.document.close();
    report.opener = null;
  }

  function downloadMonthlyComplianceCsv() {
    if (!payrollRun) return;
    const lines = [
      ["Payroll month", payrollRun.payroll_month],
      ["Employees processed", String(payrollRun.employee_count || 0)],
      ["Gross payroll", String(Number(payrollRun.total_gross_pay || 0).toFixed(2))],
      ["PAYE", String(Number(payrollRun.total_paye || 0).toFixed(2))],
      ["UIF employee", String(Number(payrollRun.total_uif_employee || 0).toFixed(2))],
      ["UIF employer", String(Number(payrollRun.total_uif_employer || 0).toFixed(2))],
      ["Total UIF", String(Number(payrollRun.total_uif || 0).toFixed(2))],
      ["Total compliance payable", String(Number(payrollRun.sars_payable || 0).toFixed(2))],
    ];
    const csv = lines.map((line) => line.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `wageflow-compliance-${payrollRun.payroll_month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function money(value: number | null | undefined) {
    return `R ${Number(value || 0).toFixed(2)}`;
  }

  return (
    <main style={page}>
      <section style={header}>
        <div>
          <h1 style={title}>Compliance Summary</h1>
          <p style={businessLine}>{businessName}</p>
          <p style={subtitle}>
            Review estimated PAYE and UIF totals for the selected payroll month.
          </p>
        </div>

        <Link href="/employer/payroll" style={backButton}>
           ← Back to Payroll
        </Link>
      </section>

      <section style={card}>
        <div style={toolbar}>
          <div>
            <h2 style={sectionTitle}>Payroll Month</h2>
            <p style={smallText}>
              Select the month you want to review for EMP201 preparation.
            </p>
          </div>

          <input
            style={monthInput}
            type="month"
            value={payrollMonth}
            onChange={(e) => {
              setPayrollMonth(e.target.value);
              if (businessId) {
                fetchComplianceSummary(businessId, e.target.value);
              }
            }}
          />
        </div>
      </section>

      {message && <div style={notice}>{message}</div>}

      {loading ? (
        <section style={card}>
          <p style={smallText}>Loading compliance summary...</p>
        </section>
      ) : !payrollRun ? (
        <section style={emptyCard}>
          <h2 style={emptyTitle}>No payroll run found</h2>
          <p style={emptyText}>
            Generate payslips for this payroll month first. Once payroll has
            been processed, estimated PAYE and UIF totals will appear here.
          </p>
        </section>
      ) : (
        <>
          <section style={summaryGrid}>
            <SummaryCard
              label="Employees Processed"
              value={String(payrollRun.employee_count || 0)}
            />

            <SummaryCard
              label="Total Gross Pay"
              value={money(payrollRun.total_gross_pay)}
            />

            <SummaryCard
              label="Total Compliance Payable"
              value={money(payrollRun.sars_payable)}
              highlight
            />
          </section>

          <section style={card}>
            <div style={toolbar}>
              <div>
                <h2 style={sectionTitle}>EMP201 Summary</h2>
                <p style={smallText}>
                  Use this estimated summary to prepare your EMP201 return on SARS
                  eFiling. WageFlow does not submit tax returns on your behalf.
                </p>
              </div>

            </div>

            <div style={breakdown}>
              <ComplianceRow label="Estimated PAYE" value={money(payrollRun.total_paye)} />
              <ComplianceRow
                label="Estimated UIF Employee"
                value={money(payrollRun.total_uif_employee)}
              />
              <ComplianceRow
                label="Estimated UIF Employer"
                value={money(payrollRun.total_uif_employer)}
              />
              <ComplianceRow
                label="Estimated Total UIF Payable"
                value={money(payrollRun.total_uif)}
              />
              <ComplianceRow
                label="Total Payable"
                value={money(payrollRun.sars_payable)}
                strong
              />
            </div>

          </section>

          <section style={card}>
            <div style={toolbar}>
              <div>
                <h2 style={sectionTitle}>Compliance Documents &amp; Exports</h2>
                <p style={smallText}>Download the payroll information and documents you need for this month.</p>
              </div>
            </div>
            <div style={documentGrid}>
              <article style={documentCard}>
                <h3 style={documentTitle}>EMP201 Preparation Report</h3>
                <p style={smallText}>A payroll working document for employer review. Print it or save it as a PDF from the print dialog.</p>
                <div style={documentActions}><button style={documentPrimaryButton} onClick={openEmp201PreparationReport}>View / Print / Save PDF</button></div>
              </article>
              <article style={documentCard}>
                <h3 style={documentTitle}>UIF UI-19 &amp; declaration</h3>
                <p style={smallText}>{uifIssues.length ? `${uifIssues.filter((issue) => issue.severity === "blocking").length} detail(s) need to be completed first.` : "Generate a UIF declaration from this payroll month's information."}</p>
                <div style={documentActions}><button style={documentSecondaryButton} onClick={() => validateUif()} disabled={validating}>{validating ? "Validating..." : uifIssues.length ? `Review ${uifIssues.length} Issue(s)` : "Validate UIF Data"}</button><button style={documentPrimaryButton} onClick={() => validateUif(true)} disabled={validating}>Generate UI-19</button></div>
              </article>
              <article style={documentCard}>
                <h3 style={documentTitle}>Monthly Compliance CSV</h3>
                <p style={smallText}>Download the month’s PAYE, UIF, gross-pay, and total-payable figures for your own records or adviser.</p>
                <div style={documentActions}><button style={documentSecondaryButton} onClick={downloadMonthlyComplianceCsv}>Download CSV</button></div>
              </article>
            </div>
            {uifIssues.length > 0 && <div style={issuesBox}><strong>{uifIssues.filter((issue) => issue.severity === "blocking").length} employees or employer details require information before a UIF declaration can be generated.</strong>{uifIssues.map((issue) => <p key={`${issue.code}-${issue.employeeId || "business"}`} style={issueText}>{issue.code} – {issue.message}{issue.field === "hours_worked" && <button style={inlineButton} onClick={() => recordHoursWorked(issue)}>Record hours</button>}</p>)}<Link href="/employer/employees" style={issueLink}>Open employee records to correct employee details</Link></div>}
          </section>

          <section style={disclaimerBox}>
            <strong>Important:</strong> WageFlow helps you estimate and organise
            PAYE and UIF totals. The employer remains responsible for verifying
            the figures and submitting the EMP201 return directly on SARS
            eFiling.
          </section>
        </>
      )}
    </main>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div style={highlight ? highlightCard : summaryCard}>
      <span style={summaryLabel}>{label}</span>
      <strong style={summaryValue}>{value}</strong>
    </div>
  );
}

function ComplianceRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div style={row}>
      <span>{label}</span>
      <strong style={strong ? rowStrong : undefined}>{value}</strong>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  padding: "38px",
  fontFamily: "Arial, sans-serif",
  background: "#f4f8fb",
  color: "#0f172a",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "22px",
  flexWrap: "wrap" as const,
};

const title = {
  fontSize: "34px",
  color: "#0f766e",
  margin: "0 0 6px",
  fontWeight: 900,
};

const businessLine = {
  margin: 0,
  color: "#0f172a",
  fontSize: "15px",
  fontWeight: 800,
};

const subtitle = {
  maxWidth: "760px",
  color: "#64748b",
  fontSize: "15px",
  lineHeight: 1.6,
  margin: "8px 0 0",
};

const backButton = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "10px 18px",
  borderRadius: "12px",
  textDecoration: "none",
  fontWeight: 700,
};

const card = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  padding: "24px",
  borderRadius: "20px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
  marginBottom: "20px",
};

const toolbar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap" as const,
};

const sectionTitle = {
  fontSize: "22px",
  margin: 0,
  color: "#0f172a",
};

const smallText = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.5,
};

const monthInput = {
  padding: "11px",
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  color: "#0f172a",
  background: "#ffffff",
  minWidth: "180px",
};

const notice = {
  background: "#ecfeff",
  border: "1px solid #a5f3fc",
  color: "#155e75",
  borderRadius: "14px",
  padding: "14px 16px",
  marginBottom: "16px",
  fontWeight: 700,
};

const emptyCard = {
  ...card,
  textAlign: "center" as const,
};

const emptyTitle = {
  margin: "0 0 8px",
  color: "#0f172a",
  fontSize: "22px",
};

const emptyText = {
  margin: 0,
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.6,
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
  marginBottom: "20px",
};

const summaryCard = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "18px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
};

const highlightCard = {
  ...summaryCard,
  background: "#ecfeff",
  border: "1px solid #a5f3fc",
};

const summaryLabel = {
  display: "block",
  color: "#64748b",
  fontSize: "13px",
  marginBottom: "8px",
};

const summaryValue = {
  display: "block",
  color: "#0f172a",
  fontSize: "22px",
};

const breakdown = {
  marginTop: "18px",
  borderTop: "1px solid #e2e8f0",
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  padding: "12px 0",
  borderBottom: "1px solid #f1f5f9",
  color: "#334155",
};

const rowStrong = {
  color: "#0f766e",
  fontSize: "16px",
};

const buttonRow = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap" as const,
  marginTop: "18px",
};

const button = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "12px 18px",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 800,
};

const outlineButton = {
  background: "#ffffff",
  color: "#0f766e",
  border: "1px solid #0f766e",
  padding: "12px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 800,
};

const disclaimerBox = {
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  color: "#9a3412",
  borderRadius: "16px",
  padding: "16px",
  fontSize: "13px",
  lineHeight: 1.6,
};

const documentGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "14px", marginTop: "18px" };
const documentCard = { minHeight: "230px", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "18px", display: "grid", gridTemplateRows: "auto 1fr auto", gap: "14px" };
const documentTitle = { margin: 0, color: "#0f172a", fontSize: "17px", lineHeight: 1.3 };
const documentActions = { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" as const };
const documentButtonBase = { borderRadius: "9px", padding: "10px 14px", fontSize: "14px", lineHeight: 1.2, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" as const };
const documentPrimaryButton = { ...documentButtonBase, border: "1px solid #0f766e", background: "#0f766e", color: "#ffffff" };
const documentSecondaryButton = { ...documentButtonBase, border: "1px solid #0f766e", background: "#ffffff", color: "#0f766e" };
const issuesBox = { marginTop: "18px", background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", borderRadius: "12px", padding: "16px" };
const issueText = { margin: "8px 0 0", fontSize: "13px" };
const issueLink = { display: "inline-block", marginTop: "12px", color: "#0f766e", fontWeight: 800, fontSize: "13px" };
const inlineButton = { marginLeft: "10px", border: "1px solid #0f766e", borderRadius: "7px", background: "#fff", color: "#0f766e", padding: "4px 8px", fontWeight: 800, cursor: "pointer", fontSize: "12px" };
