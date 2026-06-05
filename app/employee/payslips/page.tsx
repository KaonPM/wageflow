"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type Payslip = {
  id: string;
  payroll_month: string | null;
  pay_period_month: string | number | null;
  pay_period_year: string | number | null;
  basic_pay: number | null;
  gross_pay: number | null;
  uif_employee: number | null;
  total_uif: number | null;
  paye: number | null;
  other_deductions: number | null;
  net_pay: number | null;
  payment_method: string | null;
  status: string | null;
  created_at: string | null;
  viewed_at: string | null;
  downloaded_at: string | null;
  pdf_url: string | null;
  received_confirmed: boolean | null;
  received_confirmed_at: string | null;
};

export default function EmployeePayslipsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [message, setMessage] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);

  useEffect(() => {
    loadPayslips();
  }, []);

  async function loadPayslips() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return;
    }

    const { data: account } = await supabase
      .from("employee_accounts")
      .select("employee_id, portal_enabled")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!account || account.portal_enabled !== true) {
      setMessage("Employee portal access is not active.");
      setLoading(false);
      return;
    }

    const { data: employee } = await supabase
      .from("employees")
      .select(
        `
        id,
        full_name,
        business_id
      `
      )
      .eq("id", account.employee_id)
      .maybeSingle();

    if (!employee) {
      setMessage("Employee profile could not be loaded.");
      setLoading(false);
      return;
    }

    setEmployeeName(employee.full_name || "Employee");
    setCurrentEmployeeId(employee.id);
    setCurrentBusinessId(employee.business_id);

    const { data: business } = await supabase
      .from("businesses")
      .select("business_name, trading_name")
      .eq("id", employee.business_id)
      .maybeSingle();

    setBusinessName(
      business?.trading_name ||
        business?.business_name ||
        "Employer Portal"
    );

    const { data: payslipData, error: payslipError } = await supabase
      .from("payslips")
      .select(
        `
        id,
        payroll_month,
        pay_period_month,
        pay_period_year,
        basic_pay,
        gross_pay,
        uif_employee,
        total_uif,
        paye,
        other_deductions,
        net_pay,
        payment_method,
        status,
        created_at,
        viewed_at,
        downloaded_at,
        pdf_url,
        received_confirmed,
        received_confirmed_at
      `
      )
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false });

    if (payslipError) {
      setMessage("Could not load payslips.");
      setLoading(false);
      return;
    }

    setPayslips(payslipData || []);
    setLoading(false);
  }

  const monthOptions = useMemo(() => {
    const months = payslips
      .map((item) => getPayrollPeriod(item))
      .filter(Boolean);

    return [...new Set(months)];
  }, [payslips]);

  const filteredPayslips = useMemo(() => {
    if (selectedMonth === "all") return payslips;

    return payslips.filter(
      (item) => getPayrollPeriod(item) === selectedMonth
    );
  }, [selectedMonth, payslips]);

  function getPayrollPeriod(payslip: Payslip) {
    if (payslip.payroll_month) return payslip.payroll_month;

    if (payslip.pay_period_month && payslip.pay_period_year) {
      return `${payslip.pay_period_month}/${payslip.pay_period_year}`;
    }

    return "Unknown";
  }

  async function handleConfirmSalaryReceived(payslip: Payslip) {
    if (!currentEmployeeId || !currentBusinessId) {
      setMessage("Employee or business details could not be confirmed.");
      return;
    }

    setConfirmingId(payslip.id);
    setMessage("");

    const confirmedAt = new Date().toISOString();
    const period = getPayrollPeriod(payslip);

    const { error: updateError } = await supabase
      .from("payslips")
      .update({
        received_confirmed: true,
        received_confirmed_at: confirmedAt,
        status: "received_confirmed",
      })
      .eq("id", payslip.id)
      .eq("employee_id", currentEmployeeId);

    if (updateError) {
      setMessage("Could not confirm salary receipt. Please try again.");
      setConfirmingId(null);
      return;
    }

    await supabase.from("payslip_notifications").insert([
      {
        payslip_id: payslip.id,
        employee_id: currentEmployeeId,
        business_id: currentBusinessId,
        notification_type: "salary_received",
        recipient: "employer",
        message: `${employeeName} confirmed receipt of salary for ${period}.`,
        status: "pending",
      },
    ]);

    setPayslips((items) =>
      items.map((item) =>
        item.id === payslip.id
          ? {
              ...item,
              received_confirmed: true,
              received_confirmed_at: confirmedAt,
              status: "received_confirmed",
            }
          : item
      )
    );

    setMessage("Salary receipt confirmed successfully.");
    setConfirmingId(null);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <main style={page}>
        <div style={shell}>
          <div style={messageCard}>Loading payslips...</div>
        </div>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={shell}>
        <section style={heroCard}>
          <div style={heroTopRow}>
            <div>
              <h1 style={businessNameStyle}>{businessName}</h1>
              <h2 style={dashboardTitle}>My Payslips</h2>
            </div>

            <div style={topActions}>
              <a href="/employee" style={primaryButton}>
                ← Back to Dashboard
              </a>

              <button onClick={handleLogout} style={secondaryButton}>
                Logout
              </button>
            </div>
          </div>

          <p style={subtitle}>
            View, download, and confirm receipt of employer-issued payslips
            linked to your employee profile.
          </p>

          <div style={summaryRow}>
            <div style={summaryBadge}>Employee: {employeeName}</div>

            <div style={summaryBadge}>
              Payslips: {filteredPayslips.length}
            </div>
          </div>
        </section>

        <section style={filterCard}>
          <div style={filterRow}>
            <div>
              <p style={filterLabel}>Filter by Month</p>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={selectInput}
              >
                <option value="all">All Months</option>

                {monthOptions.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {message ? <div style={messageCard}>{message}</div> : null}

        {filteredPayslips.length === 0 ? (
          <div style={messageCard}>
            No payslips found for the selected period.
          </div>
        ) : (
          <section style={tableCard}>
            <div style={tableWrapper}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Period</th>
                    <th style={th}>Gross Pay</th>
                    <th style={th}>PAYE</th>
                    <th style={th}>UIF</th>
                    <th style={th}>Deductions</th>
                    <th style={th}>Net Pay</th>
                    <th style={th}>Payment</th>
                    <th style={th}>Status</th>
                    <th style={th}>Salary Received</th>
                    <th style={th}>Issued</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPayslips.map((payslip) => (
                    <tr key={payslip.id}>
                      <td style={td}>{getPayrollPeriod(payslip)}</td>

                      <td style={td}>
                        R{Number(payslip.gross_pay || 0).toFixed(2)}
                      </td>

                      <td style={td}>
                        R{Number(payslip.paye || 0).toFixed(2)}
                      </td>

                      <td style={td}>
                        R{Number(payslip.uif_employee || 0).toFixed(2)}
                      </td>

                      <td style={td}>
                        R
                        {Number(
                          payslip.other_deductions || 0
                        ).toFixed(2)}
                      </td>

                      <td style={netPayCell}>
                        R{Number(payslip.net_pay || 0).toFixed(2)}
                      </td>

                      <td style={td}>
                        {payslip.payment_method || "Not set"}
                      </td>

                      <td style={td}>
                        <span style={statusBadge}>
                          {formatStatus(payslip.status || "issued")}
                        </span>
                      </td>

                      <td style={td}>
                        {payslip.received_confirmed ? (
                          <span style={confirmedBadge}>
                            Confirmed
                            <br />
                            <small>
                              {formatDate(payslip.received_confirmed_at)}
                            </small>
                          </span>
                        ) : (
                          <span style={pendingBadge}>Not confirmed</span>
                        )}
                      </td>

                      <td style={td}>
                        {formatDate(payslip.created_at)}
                      </td>

                      <td style={td}>
                        <div style={actionRow}>
                          <a
                            href={`/employee/payslips/${payslip.id}`}
                            style={viewButton}
                          >
                            View
                          </a>

                          {!payslip.received_confirmed ? (
                            <button
                              onClick={() =>
                                handleConfirmSalaryReceived(payslip)
                              }
                              disabled={confirmingId === payslip.id}
                              style={
                                confirmingId === payslip.id
                                  ? disabledButton
                                  : confirmButton
                              }
                            >
                              {confirmingId === payslip.id
                                ? "Confirming..."
                                : "Confirm Receipt"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";

  return new Date(value).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const page: CSSProperties = {
  minHeight: "100vh",
  background: "#f4f7fb",
  padding: "32px",
  fontFamily: "Arial, sans-serif",
};

const shell: CSSProperties = {
  width: "100%",
  maxWidth: "1250px",
  margin: "0 auto",
};

const heroCard: CSSProperties = {
  padding: "32px",
  borderRadius: "28px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  marginBottom: "20px",
  boxShadow: "0 18px 45px rgba(15, 23, 42, 0.07)",
};

const heroTopRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
};

const businessNameStyle: CSSProperties = {
  margin: 0,
  fontSize: "38px",
  lineHeight: 1.1,
  fontWeight: 800,
  color: "#0f766e",
};

const dashboardTitle: CSSProperties = {
  margin: "10px 0 0",
  fontSize: "24px",
  fontWeight: 800,
  color: "#111827",
};

const subtitle: CSSProperties = {
  marginTop: "18px",
  maxWidth: "760px",
  fontSize: "16px",
  lineHeight: 1.65,
  color: "#5f6f82",
};

const summaryRow: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "20px",
};

const summaryBadge: CSSProperties = {
  padding: "10px 16px",
  borderRadius: "999px",
  background: "#f3f4f6",
  border: "1px solid #e5e7eb",
  fontSize: "13px",
  fontWeight: 700,
};

const topActions: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const primaryButton: CSSProperties = {
  padding: "10px 16px",
  borderRadius: "14px",
  background: "#0f766e",
  border: "1px solid #0f766e",
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: "14px",
};

const secondaryButton: CSSProperties = {
  padding: "10px 16px",
  borderRadius: "14px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  color: "#111827",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "14px",
};

const filterCard: CSSProperties = {
  padding: "20px",
  borderRadius: "22px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  marginBottom: "18px",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
};

const filterRow: CSSProperties = {
  display: "flex",
  gap: "16px",
  flexWrap: "wrap",
};

const filterLabel: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "13px",
  fontWeight: 700,
  color: "#64748b",
};

const selectInput: CSSProperties = {
  minWidth: "220px",
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid #d1d5db",
  background: "#ffffff",
  fontSize: "14px",
  outline: "none",
};

const tableCard: CSSProperties = {
  borderRadius: "24px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  overflow: "hidden",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
};

const tableWrapper: CSSProperties = {
  overflowX: "auto",
};

const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const th: CSSProperties = {
  padding: "16px",
  background: "#f8fafc",
  borderBottom: "1px solid #e5e7eb",
  textAlign: "left",
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 800,
};

const td: CSSProperties = {
  padding: "16px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: "14px",
  color: "#111827",
};

const netPayCell: CSSProperties = {
  ...td,
  fontWeight: 800,
  color: "#0f766e",
};

const statusBadge: CSSProperties = {
  padding: "8px 12px",
  borderRadius: "999px",
  background: "#ecfdf5",
  border: "1px solid #bbf7d0",
  color: "#166534",
  fontSize: "12px",
  fontWeight: 700,
};

const confirmedBadge: CSSProperties = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: "12px",
  background: "#ecfdf5",
  border: "1px solid #bbf7d0",
  color: "#166534",
  fontSize: "12px",
  fontWeight: 700,
  lineHeight: 1.4,
};

const pendingBadge: CSSProperties = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: "12px",
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  color: "#9a3412",
  fontSize: "12px",
  fontWeight: 700,
};

const actionRow: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const viewButton: CSSProperties = {
  padding: "8px 12px",
  borderRadius: "10px",
  background: "#0f766e",
  color: "#ffffff",
  textDecoration: "none",
  fontSize: "13px",
  fontWeight: 700,
};

const confirmButton: CSSProperties = {
  padding: "8px 12px",
  borderRadius: "10px",
  background: "#111827",
  border: "1px solid #111827",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
};

const disabledButton: CSSProperties = {
  padding: "8px 12px",
  borderRadius: "10px",
  background: "#f3f4f6",
  border: "1px solid #e5e7eb",
  color: "#94a3b8",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "not-allowed",
};

const messageCard: CSSProperties = {
  padding: "24px",
  borderRadius: "24px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)",
  marginBottom: "18px",
};