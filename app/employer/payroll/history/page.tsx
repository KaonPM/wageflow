"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

type PayrollRun = {
  id: string;
  business_id: string;
  payroll_month: string;
  employee_count: number;
  total_basic_pay: number;
  total_gross_pay: number;
  total_paye: number;
  total_uif_employee: number;
  total_uif_employer: number;
  total_uif: number;
  total_other_deductions: number;
  total_net_pay: number;
  sars_payable: number;
  status: string;
  created_at: string;
};

export default function PayrollHistoryPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  useEffect(() => {
    fetchPayrollRuns();
  }, []);

  async function getBusinessId() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.business_id) return profile.business_id;

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("employer_id", userId)
      .maybeSingle();

    return business?.id || null;
  }

  async function fetchPayrollRuns() {
    setLoading(true);
    setMessage("");

    const businessId = await getBusinessId();

    if (!businessId) {
      setMessage("Business profile not found for this employer.");
      setRuns([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("payroll_runs")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setRuns([]);
      setLoading(false);
      return;
    }

    setRuns(data || []);
    setLoading(false);
  }

  const filteredRuns = useMemo(() => {
    if (!monthFilter) return runs;
    return runs.filter((run) => run.payroll_month === monthFilter);
  }, [runs, monthFilter]);

  const totals = useMemo(() => {
    return {
      runs: filteredRuns.length,
      employees: filteredRuns.reduce(
        (sum, run) => sum + Number(run.employee_count || 0),
        0
      ),
      gross: filteredRuns.reduce(
        (sum, run) => sum + Number(run.total_gross_pay || 0),
        0
      ),
      net: filteredRuns.reduce(
        (sum, run) => sum + Number(run.total_net_pay || 0),
        0
      ),
      sars: filteredRuns.reduce(
        (sum, run) => sum + Number(run.sars_payable || 0),
        0
      ),
    };
  }, [filteredRuns]);

  return (
    <main style={page}>
      <section style={header}>
        <div>
          <p style={eyebrow}>Employer Payroll</p>
          <h1 style={title}>Payroll History</h1>
          <p style={subtitle}>
            View payroll runs, monthly totals, PAYE, UIF, SARS payable amounts,
            and generated payroll batches.
          </p>
        </div>

        <div style={headerActions}>
          <Link href="/employer/payroll" style={secondaryLink}>
            Run Payroll
          </Link>

          <Link href="/employer" style={backButton}>
            ← Back to Employer Dashboard
          </Link>
        </div>
      </section>

      <section style={summaryGrid}>
        <SummaryCard label="Payroll Runs" value={String(totals.runs)} />
        <SummaryCard label="Employees Paid" value={String(totals.employees)} />
        <SummaryCard label="Gross Payroll" value={`R ${money(totals.gross)}`} />
        <SummaryCard label="Net Payroll" value={`R ${money(totals.net)}`} />
        <SummaryCard label="SARS/UIF Payable" value={`R ${money(totals.sars)}`} />
      </section>

      {message && <div style={notice}>{message}</div>}

      <section style={card}>
        <div style={toolbar}>
          <h2 style={sectionTitle}>Payroll Runs</h2>

          <div style={filters}>
            <input
              style={input}
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            />

            <button style={outlineButton} onClick={() => setMonthFilter("")}>
              Clear
            </button>

            <button style={outlineButton} onClick={fetchPayrollRuns}>
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div style={emptyState}>Loading payroll history...</div>
        ) : filteredRuns.length === 0 ? (
          <div style={emptyState}>No payroll runs found yet.</div>
        ) : (
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Month</th>
                  <th style={th}>Employees</th>
                  <th style={th}>Gross</th>
                  <th style={th}>PAYE</th>
                  <th style={th}>UIF</th>
                  <th style={th}>Net Pay</th>
                  <th style={th}>SARS/UIF</th>
                  <th style={th}>Status</th>
                  <th style={th}>Created</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRuns.map((run) => (
                  <tr key={run.id}>
                    <td style={td}>
                      <strong>{run.payroll_month}</strong>
                    </td>

                    <td style={td}>{run.employee_count || 0}</td>

                    <td style={td}>R {money(run.total_gross_pay)}</td>

                    <td style={td}>R {money(run.total_paye)}</td>

                    <td style={td}>R {money(run.total_uif)}</td>

                    <td style={td}>
                      <strong>R {money(run.total_net_pay)}</strong>
                    </td>

                    <td style={td}>R {money(run.sars_payable)}</td>

                    <td style={td}>
                      <span style={statusBadge}>
                        {run.status || "generated"}
                      </span>
                    </td>

                    <td style={td}>{formatDate(run.created_at)}</td>

                    <td style={td}>
                      <Link
                        href={`/employer/payroll/history/${run.id}`}
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
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
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

const headerActions = {
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

const notice = {
  background: "#ecfeff",
  border: "1px solid #a5f3fc",
  color: "#155e75",
  borderRadius: "14px",
  padding: "14px 16px",
  marginBottom: "16px",
  fontWeight: 700,
};

const card = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  padding: "22px",
};

const toolbar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap" as const,
  marginBottom: "18px",
};

const sectionTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "22px",
};

const filters = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const input = {
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  minWidth: "160px",
};

const outlineButton = {
  background: "#ffffff",
  color: "#0f766e",
  border: "1px solid #0f766e",
  borderRadius: "10px",
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
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
  minWidth: "1120px",
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