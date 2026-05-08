"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";

type PayrollRun = {
  id: string;
  payroll_month: string;
  employee_count: number;
  total_basic_pay: number;
  total_gross_pay: number;
  total_paye: number;
  total_uif: number;
  total_net_pay: number;
  total_other_deductions: number;
  sars_payable: number;
  status: string;
  created_at: string;
};

type Payslip = {
  id: string;
  employee_id: string;
  payroll_month: string;
  gross_pay: number;
  paye: number;
  total_uif: number;
  net_pay: number;
  payment_method: string | null;
  status: string | null;
  created_at: string;
  employees?: {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  employee_number: string | null;
}[] | null;
};

export default function PayrollRunDetailPage() {
  const params = useParams();
  const runId = params?.runId as string;

  const [run, setRun] = useState<PayrollRun | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (runId) {
      fetchPayrollRun();
    }
  }, [runId]);

  async function fetchPayrollRun() {
    setLoading(true);
    setMessage("");

    const { data: runData, error: runError } = await supabase
      .from("payroll_runs")
      .select("*")
      .eq("id", runId)
      .maybeSingle();

    if (runError || !runData) {
      setMessage("Payroll run not found.");
      setLoading(false);
      return;
    }

    setRun(runData);

    const { data: payslipData, error: payslipError } = await supabase
      .from("payslips")
      .select(
        `
        id,
        employee_id,
        payroll_month,
        gross_pay,
        paye,
        total_uif,
        net_pay,
        payment_method,
        status,
        created_at,
        employees (
          full_name,
          first_name,
          last_name,
          employee_number
        )
      `
      )
      .eq("payroll_run_id", runId)
      .order("created_at", { ascending: false });

    if (payslipError) {
      setMessage(payslipError.message);
      setLoading(false);
      return;
    }

    setPayslips(payslipData || []);
    setLoading(false);
  }

  function employeeName(payslip: Payslip) {
  const employee = payslip.employees?.[0];

  return (
    employee?.full_name ||
    `${employee?.first_name || ""} ${
      employee?.last_name || ""
    }`.trim() ||
    "Employee"
  );
}

  const totals = useMemo(() => {
    return {
      gross: payslips.reduce(
        (sum, item) => sum + Number(item.gross_pay || 0),
        0
      ),
      paye: payslips.reduce(
        (sum, item) => sum + Number(item.paye || 0),
        0
      ),
      uif: payslips.reduce(
        (sum, item) => sum + Number(item.total_uif || 0),
        0
      ),
      net: payslips.reduce(
        (sum, item) => sum + Number(item.net_pay || 0),
        0
      ),
    };
  }, [payslips]);

  return (
    <main style={page}>
      <section style={header}>
        <div>
          <p style={eyebrow}>Employer Payroll</p>

          <h1 style={title}>
            Payroll Run {run?.payroll_month || ""}
          </h1>

          <p style={subtitle}>
            View payroll totals, employee payslips, SARS/UIF values, and payroll
            batch details.
          </p>
        </div>

        <div style={headerButtons}>
          <Link href="/employer/payroll" style={secondaryLink}>
            Run Payroll
          </Link>

          <Link href="/employer/payroll/history" style={backButton}>
            ← Payroll History
          </Link>
        </div>
      </section>

      {message && <div style={notice}>{message}</div>}

      {loading ? (
        <div style={emptyState}>Loading payroll run...</div>
      ) : run ? (
        <>
          <section style={summaryGrid}>
            <SummaryCard
              label="Employees Paid"
              value={String(run.employee_count || 0)}
            />

            <SummaryCard
              label="Gross Payroll"
              value={`R ${money(totals.gross)}`}
            />

            <SummaryCard
              label="PAYE"
              value={`R ${money(totals.paye)}`}
            />

            <SummaryCard
              label="UIF"
              value={`R ${money(totals.uif)}`}
            />

            <SummaryCard
              label="Net Payroll"
              value={`R ${money(totals.net)}`}
            />

            <SummaryCard
              label="SARS/UIF Payable"
              value={`R ${money(run.sars_payable)}`}
            />
          </section>

          <section style={card}>
            <div style={runInfo}>
              <div>
                <p style={infoLabel}>Payroll Month</p>
                <p style={infoValue}>{run.payroll_month}</p>
              </div>

              <div>
                <p style={infoLabel}>Status</p>
                <p style={infoValue}>{run.status || "generated"}</p>
              </div>

              <div>
                <p style={infoLabel}>Created</p>
                <p style={infoValue}>
                  {formatDate(run.created_at)}
                </p>
              </div>
            </div>
          </section>

          <section style={card}>
            <div style={tableHeader}>
              <h2 style={sectionTitle}>Payslips Included</h2>
            </div>

            {payslips.length === 0 ? (
              <div style={emptyState}>
                No payslips linked to this payroll run.
              </div>
            ) : (
              <div style={tableWrap}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>Employee</th>
                      <th style={th}>Month</th>
                      <th style={th}>Gross</th>
                      <th style={th}>PAYE</th>
                      <th style={th}>UIF</th>
                      <th style={th}>Net Pay</th>
                      <th style={th}>Payment</th>
                      <th style={th}>Status</th>
                      <th style={th}>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {payslips.map((payslip) => (
                      <tr key={payslip.id}>
                        <td style={td}>
                          <strong>{employeeName(payslip)}</strong>
                          <br />

                          <span style={muted}>
                            {payslip.employees?.[0]?.employee_number ||
                             "No employee number"}
                          </span>
                        </td>

                        <td style={td}>{payslip.payroll_month}</td>

                        <td style={td}>
                          R {money(payslip.gross_pay)}
                        </td>

                        <td style={td}>
                          R {money(payslip.paye)}
                        </td>

                        <td style={td}>
                          R {money(payslip.total_uif)}
                        </td>

                        <td style={td}>
                          <strong>
                            R {money(payslip.net_pay)}
                          </strong>
                        </td>

                        <td style={td}>
                          {payslip.payment_method || "-"}
                        </td>

                        <td style={td}>
                          <span style={statusBadge}>
                            {payslip.status || "generated"}
                          </span>
                        </td>

                        <td style={td}>
                          <Link
                            href={`/employer/payslips/${payslip.id}`}
                            style={openButton}
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={summaryCard}>
      <span style={summaryLabel}>{label}</span>
      <strong style={summaryValue}>{value}</strong>
    </div>
  );
}

function money(value: number | null | undefined) {
  return Number(value || 0).toFixed(2);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
  marginBottom: "28px",
  flexWrap: "wrap" as const,
};

const eyebrow = {
  color: "#0f766e",
  fontWeight: 800,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  fontSize: "12px",
  marginBottom: "8px",
};

const title = {
  fontSize: "34px",
  color: "#0f766e",
  margin: "0 0 10px",
  fontWeight: 900,
};

const subtitle = {
  maxWidth: "760px",
  color: "#64748b",
  fontSize: "15px",
  lineHeight: 1.6,
  margin: 0,
};

const headerButtons = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const backButton = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "10px 18px",
  borderRadius: "12px",
  textDecoration: "none",
  fontWeight: 700,
};

const secondaryLink = {
  background: "#ecfeff",
  color: "#0f766e",
  border: "1px solid #99f6e4",
  padding: "10px 18px",
  borderRadius: "12px",
  textDecoration: "none",
  fontWeight: 800,
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

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "16px",
  marginBottom: "24px",
};

const summaryCard = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "18px",
};

const summaryLabel = {
  display: "block",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase" as const,
  marginBottom: "7px",
};

const summaryValue = {
  color: "#0f766e",
  fontSize: "22px",
};

const card = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  padding: "22px",
  marginBottom: "20px",
};

const runInfo = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "18px",
};

const infoLabel = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase" as const,
  marginBottom: "6px",
};

const infoValue = {
  color: "#0f172a",
  fontSize: "16px",
  fontWeight: 700,
};

const tableHeader = {
  marginBottom: "18px",
};

const sectionTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "22px",
};

const emptyState = {
  background: "#ecfeff",
  border: "1px solid #a5f3fc",
  color: "#155e75",
  borderRadius: "16px",
  padding: "22px",
};

const tableWrap = {
  width: "100%",
  overflowX: "auto" as const,
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
  minWidth: "1080px",
};

const th = {
  textAlign: "left" as const,
  padding: "12px",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: "12px",
  textTransform: "uppercase" as const,
};

const td = {
  padding: "12px",
  borderBottom: "1px solid #e2e8f0",
  verticalAlign: "middle" as const,
};

const muted = {
  color: "#64748b",
  fontSize: "13px",
};

const statusBadge = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#ecfeff",
  color: "#155e75",
  fontSize: "12px",
  fontWeight: 800,
};

const openButton = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "8px 13px",
  borderRadius: "10px",
  textDecoration: "none",
  fontWeight: 800,
};