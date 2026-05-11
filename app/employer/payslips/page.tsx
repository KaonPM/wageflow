"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type Payslip = {
  id: string;
  employee_id: string;
  business_id: string;
  basic_pay: number | null;
  bonus: number | null;
  overtime_pay: number | null;
  gross_pay: number | null;
  uif_employee: number | null;
  employer_uif: number | null;
  total_uif: number | null;
  paye: number | null;
  other_deductions: number | null;
  net_pay: number | null;
  sars_payable: number | null;
  payment_method: string | null;
  payroll_month: string | null;
  status: string | null;
  created_at: string | null;
  viewed_at: string | null;
  downloaded_at: string | null;
  employees?: {
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    employee_number: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

export default function EmployerPayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const recordsPerPage = 5;

  useEffect(() => {
    fetchPayslips();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, monthFilter]);

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

  async function fetchPayslips() {
    setLoading(true);
    setMessage("");

    const businessId = await getBusinessId();

    if (!businessId) {
      setMessage("Business profile not found for this employer.");
      setPayslips([]);
      setLoading(false);
      return;
    }

    const { data: payslipData, error: payslipError } = await supabase
      .from("payslips")
      .select(
        `
        *,
        employees (
          full_name,
          first_name,
          last_name,
          employee_number,
          email,
          phone
        )
      `
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (payslipError) {
      setMessage(payslipError.message);
      setPayslips([]);
      setLoading(false);
      return;
    }

    setPayslips(payslipData || []);
    setLoading(false);
  }

  function employeeName(payslip: Payslip) {
    return (
      payslip.employees?.full_name ||
      `${payslip.employees?.first_name || ""} ${
        payslip.employees?.last_name || ""
      }`.trim() ||
      "Unnamed Employee"
    );
  }

  const filteredPayslips = useMemo(() => {
    return payslips.filter((payslip) => {
      const text = `${employeeName(payslip)} ${
        payslip.employees?.employee_number || ""
      } ${payslip.status || ""}`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());
      const matchesMonth =
        !monthFilter || payslip.payroll_month === monthFilter;

      return matchesSearch && matchesMonth;
    });
  }, [payslips, search, monthFilter]);

  const totalPages = Math.ceil(filteredPayslips.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;

  const paginatedPayslips = filteredPayslips.slice(
    startIndex,
    startIndex + recordsPerPage
  );

  const summary = useMemo(() => {
    return {
      total: payslips.length,
      gross: payslips.reduce(
        (sum, item) => sum + Number(item.gross_pay || 0),
        0
      ),
      net: payslips.reduce((sum, item) => sum + Number(item.net_pay || 0), 0),
      sars: payslips.reduce(
        (sum, item) => sum + Number(item.sars_payable || 0),
        0
      ),
    };
  }, [payslips]);

  return (
    <main style={page}>
      <section style={header}>
        <div>
          <h1 style={title}>Payslips</h1>

          <p style={subtitle}>
            View generated payslips, payroll history, and downloadable employee
            payroll records.
          </p>
        </div>

        <Link href="/employer/payroll" style={backButton}>
          ← Back to Payroll
        </Link>
      </section>

      <section style={summaryGrid}>
        <SummaryCard label="Payslips Generated" value={String(summary.total)} />

        <SummaryCard
          label="Gross Payroll"
          value={`R ${summary.gross.toFixed(2)}`}
        />

        <SummaryCard label="Net Payroll" value={`R ${summary.net.toFixed(2)}`} />

        <SummaryCard
          label="PAYE/UIF Payable"
          value={`R ${summary.sars.toFixed(2)}`}
        />
      </section>

      {message && <div style={notice}>{message}</div>}

      <section style={card}>
        <div style={toolbar}>
          <h2 style={sectionTitle}>Payslip Records</h2>

          <div style={filters}>
            <input
              style={filterInput}
              placeholder="Search employee"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <input
              style={filterInput}
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            />

            <button style={secondaryButton} onClick={fetchPayslips}>
              Refresh
            </button>

            <Link href="/employer/payroll" style={primaryLink}>
              Run Payroll
            </Link>
          </div>
        </div>

        {loading ? (
          <div style={emptyState}>Loading payslips...</div>
        ) : filteredPayslips.length === 0 ? (
          <div style={emptyState}>No payslips found yet.</div>
        ) : (
          <>
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
                    <th style={th}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedPayslips.map((payslip) => (
                    <tr key={payslip.id}>
                      <td style={td}>
                        <strong>{employeeName(payslip)}</strong>
                        <br />
                        <span style={muted}>
                          {payslip.employees?.employee_number ||
                            "No employee number"}
                        </span>
                      </td>

                      <td style={td}>{payslip.payroll_month || "-"}</td>

                      <td style={td}>
                        R {Number(payslip.gross_pay || 0).toFixed(2)}
                      </td>

                      <td style={td}>
                        R {Number(payslip.paye || 0).toFixed(2)}
                      </td>

                      <td style={td}>
                        R {Number(payslip.total_uif || 0).toFixed(2)}
                      </td>

                      <td style={td}>
                        <strong>
                          R {Number(payslip.net_pay || 0).toFixed(2)}
                        </strong>
                      </td>

                      <td style={td}>{payslip.payment_method || "-"}</td>

                      <td style={td}>
                        <span style={statusBadge}>
                          {payslip.status || "generated"}
                        </span>
                      </td>

                      <td style={td}>
                        <div style={actionGroup}>
                          <Link
                            href={`/employer/payslips/${payslip.id}`}
                            style={pdfButton}
                          >
                            View
                          </Link>

                          <Link
                            href={`/employer/payslips/${payslip.id}`}
                            style={pdfButton}
                          >
                            PDF
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={paginationContainer}>
              <button
                style={{
                  ...paginationButton,
                  opacity: currentPage === 1 ? 0.45 : 1,
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                }}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
              >
                Previous
              </button>

              <span style={pageText}>
                Page {currentPage} of {totalPages || 1}
              </span>

              <button
                style={{
                  ...paginationButton,
                  opacity:
                    currentPage === totalPages || totalPages === 0 ? 0.45 : 1,
                  cursor:
                    currentPage === totalPages || totalPages === 0
                      ? "not-allowed"
                      : "pointer",
                }}
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                Next
              </button>
            </div>
          </>
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

const backButton = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "10px 18px",
  borderRadius: "12px",
  textDecoration: "none",
  fontWeight: 700,
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
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
  fontSize: "24px",
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

const filterInput = {
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  minWidth: "160px",
};

const secondaryButton = {
  background: "#ffffff",
  color: "#0f766e",
  border: "1px solid #0f766e",
  borderRadius: "10px",
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const primaryLink = {
  background: "#0f766e",
  color: "#ffffff",
  borderRadius: "10px",
  padding: "10px 14px",
  fontWeight: 800,
  textDecoration: "none",
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

const muted = {
  color: "#64748b",
  fontSize: "13px",
};

const statusBadge = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#ecfeff",
  color: "#155e75",
  fontSize: "12px",
  fontWeight: 700,
};

const actionGroup = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap" as const,
};

const pdfButton = {
  background: "#e6fffb",
  color: "#0f766e",
  border: "1px solid #99f6e4",
  padding: "8px 14px",
  borderRadius: "10px",
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const paginationContainer = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: "12px",
  marginTop: "18px",
};

const paginationButton = {
  background: "#0f766e",
  color: "#ffffff",
  border: "none",
  borderRadius: "8px",
  padding: "8px 14px",
  cursor: "pointer",
  fontWeight: 700,
};

const pageText = {
  color: "#475569",
  fontWeight: 700,
};