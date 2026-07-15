"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

type PayrollRun = {
  id: string;
  business_id: string;
  payroll_month: string;
  employee_count: number | null;
  total_paye: number | null;
  total_uif_employee: number | null;
  total_uif_employer: number | null;
  sars_payable: number | null;
  status: string | null;
  created_at: string | null;
};

type Payslip = {
  id: string;
  employee_id: string;
  payroll_month: string | null;
  net_pay: number | null;
  payment_method: string | null;
  paye: number | null;
  uif_employee: number | null;
  employer_uif: number | null;
  sars_payable: number | null;
  status: string | null;
  employees?:
    | {
        full_name: string | null;
        first_name: string | null;
        last_name: string | null;
        employee_number: string | null;
        bank_name: string | null;
        account_number: string | null;
      }[]
    | null;
};

type PaymentRow = {
  payslipId: string;
  employeeName: string;
  employeeNumber: string;
  bankName: string;
  accountNumber: string;
  paymentMethod: string;
  amount: number;
  status: string;
  missingBankDetails: boolean;
};

export default function PayrollPaymentsPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayslips, setLoadingPayslips] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchPayrollRuns();
  }, []);

  useEffect(() => {
    if (selectedRunId) {
      fetchPayslips(selectedRunId);
    } else {
      setPayslips([]);
    }
  }, [selectedRunId]);

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

    const payrollRuns = data || [];

    setRuns(payrollRuns);
    setSelectedRunId((current) => current || payrollRuns[0]?.id || "");
    setLoading(false);
  }

  async function fetchPayslips(runId: string) {
    setLoadingPayslips(true);
    setMessage("");

    const { data, error } = await supabase
      .from("payslips")
      .select(
        `
        id,
        employee_id,
        payroll_month,
        net_pay,
        payment_method,
        paye,
        uif_employee,
        employer_uif,
        sars_payable,
        status,
        employees (
          full_name,
          first_name,
          last_name,
          employee_number,
          bank_name,
          account_number
        )
      `
      )
      .eq("payroll_run_id", runId)
      .order("created_at", { ascending: true });

    if (error) {
      setMessage(error.message);
      setPayslips([]);
      setLoadingPayslips(false);
      return;
    }

    setPayslips((data || []) as Payslip[]);
    setLoadingPayslips(false);
  }

  const selectedRun = runs.find((run) => run.id === selectedRunId) || null;

  const paymentRows = useMemo(() => {
    return payslips.map((payslip) => {
      const employee = payslip.employees?.[0];
      const employeeName =
        employee?.full_name ||
        `${employee?.first_name || ""} ${employee?.last_name || ""}`.trim() ||
        "Employee";
      const bankName = employee?.bank_name || "";
      const accountNumber = employee?.account_number || "";
      const paymentMethod = payslip.payment_method || "Bank Transfer";

      return {
        payslipId: payslip.id,
        employeeName,
        employeeNumber: employee?.employee_number || "-",
        bankName,
        accountNumber,
        paymentMethod,
        amount: Number(payslip.net_pay || 0),
        status: payslip.status || "generated",
        missingBankDetails: !bankName || !accountNumber,
      };
    });
  }, [payslips]);

  const bankRows = paymentRows.filter((row) => !isCashPayment(row.paymentMethod));
  const cashRows = paymentRows.filter((row) => isCashPayment(row.paymentMethod));
  const blockedBankRows = bankRows.filter((row) => row.missingBankDetails);
  const canApprove = Boolean(selectedRun && paymentRows.length > 0 && blockedBankRows.length === 0);
  const batchStatus = selectedRun?.status || "generated";

  const totals = {
    bank: bankRows.reduce((sum, row) => sum + row.amount, 0),
    cash: cashRows.reduce((sum, row) => sum + row.amount, 0),
    sars: Number(selectedRun?.sars_payable || 0),
    employees: paymentRows.length,
  };

  async function refreshSelectedRun() {
    await fetchPayrollRuns();
    if (selectedRunId) await fetchPayslips(selectedRunId);
  }

  async function updatePayrollRunStatus(status: string) {
    if (!selectedRun) return "No payroll run selected.";

    const { error } = await supabase
      .from("payroll_runs")
      .update({ status })
      .eq("id", selectedRun.id)
      .eq("business_id", selectedRun.business_id);

    return error?.message || null;
  }

  async function updatePayslipStatuses(ids: string[], status: string) {
    if (ids.length === 0) return null;

    const { error } = await supabase
      .from("payslips")
      .update({ status })
      .in("id", ids);

    return error?.message || null;
  }

  async function approvePaymentBatch() {
    if (!canApprove) {
      setMessage(
        blockedBankRows.length > 0
          ? "Resolve missing bank details before approving this payment batch."
          : "No payment rows are available to approve."
      );
      return;
    }

    setSaving(true);
    setMessage("Approving payment batch...");

    const runError = await updatePayrollRunStatus("payment_approved");
    if (runError) {
      setMessage(runError);
      setSaving(false);
      return;
    }

    const bankError = await updatePayslipStatuses(
      bankRows.map((row) => row.payslipId),
      "payment_ready"
    );

    if (bankError) {
      setMessage(bankError);
      setSaving(false);
      return;
    }

    const cashError = await updatePayslipStatuses(
      cashRows.map((row) => row.payslipId),
      "cash_ready"
    );

    if (cashError) {
      setMessage(cashError);
      setSaving(false);
      return;
    }

    await refreshSelectedRun();
    setMessage("Payment batch approved. Manual CSV is the active provider until Ozow or Stitch is connected.");
    setSaving(false);
  }

  async function markBatchExported() {
    if (!selectedRun) return;

    setSaving(true);
    setMessage("Marking payment batch as exported...");

    const runError = await updatePayrollRunStatus("payment_exported");
    if (runError) {
      setMessage(runError);
      setSaving(false);
      return;
    }

    const statusError = await updatePayslipStatuses(
      bankRows.map((row) => row.payslipId),
      "payment_exported"
    );

    if (statusError) {
      setMessage(statusError);
      setSaving(false);
      return;
    }

    await refreshSelectedRun();
    setMessage("Bank payment batch marked as exported.");
    setSaving(false);
  }

  async function markPaidManually() {
    if (!selectedRun || paymentRows.length === 0) return;

    const confirmed = window.confirm(
      "Mark this payroll run as paid manually? Only do this after bank and cash payments have been completed."
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage("Marking payroll run as paid manually...");

    const runError = await updatePayrollRunStatus("paid_manually");
    if (runError) {
      setMessage(runError);
      setSaving(false);
      return;
    }

    const statusError = await updatePayslipStatuses(
      paymentRows.map((row) => row.payslipId),
      "paid"
    );

    if (statusError) {
      setMessage(statusError);
      setSaving(false);
      return;
    }

    await refreshSelectedRun();
    setMessage("Payroll run marked as paid manually.");
    setSaving(false);
  }

  async function markSarsUifPaid() {
    if (!selectedRun) return;

    const confirmed = window.confirm(
      "Mark SARS/UIF as paid for this payroll run? Only do this after payment has been completed on eFiling or your bank."
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage("Recording SARS/UIF payment status...");

    const runError = await updatePayrollRunStatus("sars_uif_paid");
    if (runError) {
      setMessage(runError);
      setSaving(false);
      return;
    }

    await refreshSelectedRun();
    setMessage("SARS/UIF marked as paid for this payroll run.");
    setSaving(false);
  }

  function exportBankCsv() {
    if (bankRows.length === 0) {
      setMessage("No bank payment rows are available for this payroll run.");
      return;
    }

    const rows = [
      ["Employee", "Employee Number", "Bank", "Account Number", "Amount", "Reference"],
      ...bankRows.map((row) => [
        row.employeeName,
        row.employeeNumber,
        row.bankName || "Missing bank name",
        row.accountNumber || "Missing account number",
        row.amount.toFixed(2),
        `PAY-${selectedRun?.payroll_month || "MONTH"}-${row.employeeNumber}`,
      ]),
    ];

    downloadCsv(
      rows,
      `wageflow-bank-payments-${selectedRun?.payroll_month || "payroll"}.csv`
    );
  }

  function exportCashCsv() {
    if (cashRows.length === 0) {
      setMessage("No cash payment rows are available for this payroll run.");
      return;
    }

    const rows = [
      ["Employee", "Employee Number", "Amount", "Reference"],
      ...cashRows.map((row) => [
        row.employeeName,
        row.employeeNumber,
        row.amount.toFixed(2),
        `CASH-${selectedRun?.payroll_month || "MONTH"}-${row.employeeNumber}`,
      ]),
    ];

    downloadCsv(
      rows,
      `wageflow-cash-payments-${selectedRun?.payroll_month || "payroll"}.csv`
    );
  }

  return (
    <main style={page}>
      <section style={header}>
        <div>
          <p style={eyebrow}>Employer Payroll</p>
          <h1 style={title}>Payment Review</h1>
          <p style={subtitle}>
            Review employee bank payments, cash payments, and estimated PAYE/UIF
            before any payment is released outside WageFlow.
          </p>
        </div>

        <div style={headerActions}>
          <Link href="/employer/payroll" style={backButton}>
            Back to Payroll
          </Link>
          <Link href="/employer/payroll/history" style={secondaryButton}>
            Payroll History
          </Link>
        </div>
      </section>

      {message && <div style={notice}>{message}</div>}

      <section style={card}>
        <div style={toolbar}>
          <div>
            <h2 style={sectionTitle}>Select Payroll Run</h2>
            <p style={muted}>
              Active provider: <strong>Manual CSV</strong>. Ozow or Stitch can be
              plugged into this workflow later without changing the employer flow.
            </p>
          </div>

          <div style={filters}>
            <select
              style={input}
              value={selectedRunId}
              onChange={(event) => setSelectedRunId(event.target.value)}
              disabled={loading || runs.length === 0}
            >
              {runs.length === 0 ? (
                <option value="">No payroll runs</option>
              ) : (
                runs.map((run) => (
                  <option key={run.id} value={run.id}>
                    {run.payroll_month} - {run.employee_count || 0} employees
                  </option>
                ))
              )}
            </select>

            <button type="button" style={outlineButton} onClick={fetchPayrollRuns}>
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section style={workflowCard}>
        <div>
          <span style={summaryLabel}>Batch Status</span>
          <strong style={workflowTitle}>{formatStatus(batchStatus)}</strong>
          <p style={muted}>
            Approve the batch first, export bank/cash CSV files, then mark the
            payroll as paid after money has moved outside WageFlow.
          </p>
        </div>

        <div style={workflowActions}>
          <button
            type="button"
            style={primaryButton}
            onClick={approvePaymentBatch}
            disabled={saving || !canApprove}
          >
            Approve Batch
          </button>

          <button
            type="button"
            style={outlineButton}
            onClick={markBatchExported}
            disabled={saving || bankRows.length === 0}
          >
            Mark Exported
          </button>

          <button
            type="button"
            style={paidButton}
            onClick={markPaidManually}
            disabled={saving || paymentRows.length === 0}
          >
            Mark Paid Manually
          </button>
        </div>
      </section>

      <section style={summaryGrid}>
        <SummaryCard label="Employees" value={String(totals.employees)} />
        <SummaryCard label="Bank Payments" value={`R ${money(totals.bank)}`} />
        <SummaryCard label="Cash Payments" value={`R ${money(totals.cash)}`} />
        <SummaryCard label="Estimated SARS/UIF" value={`R ${money(totals.sars)}`} />
      </section>

      {blockedBankRows.length > 0 && (
        <section style={warningBox}>
          <strong>{blockedBankRows.length} bank payment(s) need attention.</strong>
          <span>
            Add missing bank names or account numbers before approving, exporting,
            or sending these payments to a future payment provider.
          </span>
        </section>
      )}

      <section style={grid}>
        <PaymentTable
          title="Bank Payment Preparation"
          description="Employees not marked as Cash. These rows are ready for bank-file export or a future payment provider integration."
          rows={bankRows}
          emptyText="No bank payments found for this payroll run."
          onExport={exportBankCsv}
          showBankDetails
        />

        <PaymentTable
          title="Cash Payment List"
          description="Employees marked as Cash. These should be handled manually and confirmed outside the bank-payment flow."
          rows={cashRows}
          emptyText="No cash payments found for this payroll run."
          onExport={exportCashCsv}
        />
      </section>

      <section style={card}>
        <div style={sarsHeader}>
          <div>
            <h2 style={sectionTitle}>Estimated SARS/UIF Payment</h2>
            <p style={muted}>
              Prepare this amount for EMP201/SARS or UIF handling. Mark it paid
              only after it has been completed on eFiling or through the bank.
            </p>
          </div>

          <div style={sarsActions}>
            <strong style={sarsAmount}>R {money(totals.sars)}</strong>
            <button
              type="button"
              style={outlineButton}
              onClick={markSarsUifPaid}
              disabled={saving || !selectedRun}
            >
              Mark SARS/UIF Paid
            </button>
          </div>
        </div>

        <div style={sarsGrid}>
          <Info label="Payroll Month" value={selectedRun?.payroll_month || "-"} />
          <Info label="Estimated PAYE" value={`R ${money(selectedRun?.total_paye)}`} />
          <Info
            label="Employee UIF"
            value={`R ${money(selectedRun?.total_uif_employee)}`}
          />
          <Info
            label="Employer UIF"
            value={`R ${money(selectedRun?.total_uif_employer)}`}
          />
        </div>
      </section>

      {loadingPayslips && <div style={emptyState}>Loading payment rows...</div>}
    </main>
  );
}

function PaymentTable({
  title,
  description,
  rows,
  emptyText,
  onExport,
  showBankDetails,
}: {
  title: string;
  description: string;
  rows: PaymentRow[];
  emptyText: string;
  onExport: () => void;
  showBankDetails?: boolean;
}) {
  return (
    <section style={card}>
      <div style={tableHeader}>
        <div>
          <h2 style={sectionTitle}>{title}</h2>
          <p style={muted}>{description}</p>
        </div>

        <button type="button" style={outlineButton} onClick={onExport}>
          Export CSV
        </button>
      </div>

      {rows.length === 0 ? (
        <div style={emptyState}>{emptyText}</div>
      ) : (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Employee</th>
                {showBankDetails && <th style={th}>Bank</th>}
                {showBankDetails && <th style={th}>Account</th>}
                <th style={th}>Method</th>
                <th style={th}>Net Pay</th>
                <th style={th}>Status</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const needsDetails = row.missingBankDetails && showBankDetails;

                return (
                  <tr key={row.payslipId}>
                    <td style={td}>
                      <strong>{row.employeeName}</strong>
                      <br />
                      <span style={muted}>{row.employeeNumber}</span>
                    </td>

                    {showBankDetails && <td style={td}>{row.bankName || "Missing"}</td>}
                    {showBankDetails && (
                      <td style={td}>{maskAccount(row.accountNumber) || "Missing"}</td>
                    )}

                    <td style={td}>{row.paymentMethod}</td>
                    <td style={td}>R {money(row.amount)}</td>
                    <td style={td}>
                      <span style={needsDetails ? alertBadge : statusBadge}>
                        {needsDetails ? "Needs details" : formatStatus(row.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoBox}>
      <span style={summaryLabel}>{label}</span>
      <strong style={infoValue}>{value}</strong>
    </div>
  );
}

function isCashPayment(paymentMethod: string) {
  return paymentMethod.trim().toLowerCase() === "cash";
}

function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function money(value: number | null | undefined) {
  return Number(value || 0).toFixed(2);
}

function maskAccount(accountNumber: string) {
  const clean = String(accountNumber || "").trim();

  if (!clean) return "";
  if (clean.length <= 4) return clean;

  return `******${clean.slice(-4)}`;
}

function escapeCsv(value: string) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function downloadCsv(rows: string[][], fileName: string) {
  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  window.URL.revokeObjectURL(url);
}

const page: CSSProperties = {
  minHeight: "100vh",
  padding: "38px",
  fontFamily: "Arial, sans-serif",
  background: "#f4f8fb",
  color: "#0f172a",
};

const header: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "24px",
  flexWrap: "wrap",
};

const eyebrow: CSSProperties = {
  color: "#0f766e",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontSize: "12px",
  margin: "0 0 8px",
};

const title: CSSProperties = {
  fontSize: "34px",
  color: "#0f766e",
  margin: "0 0 10px",
  fontWeight: 900,
};

const subtitle: CSSProperties = {
  maxWidth: "780px",
  color: "#64748b",
  fontSize: "15px",
  lineHeight: 1.6,
  margin: 0,
};

const headerActions: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const backButton: CSSProperties = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "10px 18px",
  borderRadius: "12px",
  textDecoration: "none",
  fontWeight: 800,
};

const secondaryButton: CSSProperties = {
  background: "#ecfeff",
  color: "#0f766e",
  border: "1px solid #99f6e4",
  padding: "10px 18px",
  borderRadius: "12px",
  textDecoration: "none",
  fontWeight: 800,
};

const notice: CSSProperties = {
  background: "#ecfeff",
  border: "1px solid #a5f3fc",
  color: "#155e75",
  borderRadius: "14px",
  padding: "14px 16px",
  marginBottom: "16px",
  fontWeight: 700,
};

const warningBox: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  color: "#9a3412",
  borderRadius: "14px",
  padding: "14px 16px",
  marginBottom: "18px",
};

const card: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  padding: "22px",
  marginBottom: "20px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.05)",
};

const toolbar: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
};

const filters: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const input: CSSProperties = {
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  minWidth: "250px",
  background: "#ffffff",
  color: "#0f172a",
};

const outlineButton: CSSProperties = {
  background: "#ffffff",
  color: "#0f766e",
  border: "1px solid #0f766e",
  borderRadius: "10px",
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const primaryButton: CSSProperties = {
  background: "#0f766e",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const paidButton: CSSProperties = {
  ...primaryButton,
  background: "#166534",
};

const workflowCard: CSSProperties = {
  ...card,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "18px",
  flexWrap: "wrap",
};

const workflowTitle: CSSProperties = {
  display: "block",
  color: "#0f766e",
  fontSize: "24px",
  marginBottom: "6px",
};

const workflowActions: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const summaryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const summaryCard: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "18px",
};

const summaryLabel: CSSProperties = {
  display: "block",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase",
  marginBottom: "7px",
};

const summaryValue: CSSProperties = {
  color: "#0f766e",
  fontSize: "22px",
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: "20px",
  alignItems: "start",
};

const tableHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  flexWrap: "wrap",
  marginBottom: "18px",
};

const sectionTitle: CSSProperties = {
  margin: "0 0 8px",
  color: "#0f172a",
  fontSize: "22px",
};

const muted: CSSProperties = {
  margin: 0,
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.5,
};

const tableWrap: CSSProperties = {
  overflowX: "auto",
};

const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "720px",
};

const th: CSSProperties = {
  textAlign: "left",
  padding: "12px",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: "12px",
  textTransform: "uppercase",
};

const td: CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid #e2e8f0",
  verticalAlign: "middle",
  fontSize: "13px",
};

const statusBadge: CSSProperties = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#ecfdf5",
  color: "#166534",
  fontSize: "12px",
  fontWeight: 800,
};

const alertBadge: CSSProperties = {
  ...statusBadge,
  background: "#fff7ed",
  color: "#9a3412",
};

const emptyState: CSSProperties = {
  background: "#ecfeff",
  border: "1px solid #a5f3fc",
  color: "#155e75",
  borderRadius: "16px",
  padding: "18px",
};

const sarsHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  flexWrap: "wrap",
  marginBottom: "18px",
};

const sarsActions: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const sarsAmount: CSSProperties = {
  color: "#0f766e",
  fontSize: "28px",
};

const sarsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
};

const infoBox: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "14px",
  background: "#f8fafc",
};

const infoValue: CSSProperties = {
  color: "#0f172a",
  fontSize: "16px",
};