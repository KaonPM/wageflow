"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type Business = {
  id: string;
  business_name?: string | null;
  trading_name?: string | null;
  registered_name?: string | null;
  name?: string | null;
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

  async function updateStatus(status: string) {
    if (!payrollRun?.id) return;

    setMessage("Updating compliance status...");

    const { error } = await supabase
      .from("payroll_runs")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payrollRun.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPayrollRun({
      ...payrollRun,
      status,
    });

    setMessage("Compliance status updated.");
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

            <SummaryCard label="Estimated PAYE" value={money(payrollRun.total_paye)} />

            <SummaryCard
              label="Estimated UIF Employee"
              value={money(payrollRun.total_uif_employee)}
            />

            <SummaryCard
              label="Estimated UIF Employer"
              value={money(payrollRun.total_uif_employer)}
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

              <span style={statusBadge}>
                {payrollRun.status || "generated"}
              </span>
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

            <div style={buttonRow}>
              <button
                style={outlineButton}
                onClick={() => updateStatus("reviewed")}
              >
                Mark as Reviewed
              </button>

              <button
                style={button}
                onClick={() => updateStatus("submitted_manually")}
              >
                Mark as Submitted Manually
              </button>
            </div>
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

const statusBadge = {
  background: "#f8fafc",
  color: "#0f766e",
  border: "1px solid #dbeafe",
  borderRadius: "999px",
  padding: "7px 12px",
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "capitalize" as const,
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