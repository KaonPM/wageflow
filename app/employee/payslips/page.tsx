"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function EmployeePayslipsPage() {
  const [payslips, setPayslips] = useState<any[]>([]);
  const [message, setMessage] = useState("Loading payslips...");

  useEffect(() => {
    fetchPayslips();
  }, []);

  async function fetchPayslips() {
    const { data, error } = await supabase
      .from("payslips")
      .select(`
        *,
        employees (
          full_name,
          position,
          id_number
        ),
        businesses (
          business_name,
          logo_url,
          uif_reference_number
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setPayslips(data || []);
    setMessage("");
  }

  function printPayslip() {
    window.print();
  }

  return (
    <main style={page}>
      <h1 style={title}>My Payslips</h1>

      {message && <p style={messageStyle}>{message}</p>}

      {!message && payslips.length === 0 && (
        <p style={messageStyle}>No payslips available yet.</p>
      )}

      {payslips.map((payslip) => (
        <section key={payslip.id} style={payslipCard}>
          {payslip.businesses?.logo_url && (
            <img
              src={payslip.businesses.logo_url}
              alt="Company watermark"
              style={watermark}
            />
          )}

          <div style={payslipHeader}>
            <div>
              <h2 style={businessName}>
                {payslip.businesses?.business_name || "Business Name"}
              </h2>
              <p style={smallText}>
                UIF Ref: {payslip.businesses?.uif_reference_number || "Not provided"}
              </p>
            </div>

            <div style={rightHeader}>
              <p style={payslipLabel}>PAYSLIP</p>
              <p style={smallText}>
                {payslip.pay_period_month}/{payslip.pay_period_year}
              </p>
            </div>
          </div>

          <div style={divider} />

          <div style={detailsGrid}>
            <div>
              <p style={label}>Employee</p>
              <p style={value}>{payslip.employees?.full_name}</p>
            </div>

            <div>
              <p style={label}>Position</p>
              <p style={value}>{payslip.employees?.position || "Not provided"}</p>
            </div>

            <div>
              <p style={label}>ID Number</p>
              <p style={value}>{payslip.employees?.id_number || "Not provided"}</p>
            </div>

            <div>
              <p style={label}>Status</p>
              <p style={value}>{payslip.status}</p>
            </div>
          </div>

          <div style={divider} />

          <div style={amounts}>
            <div style={row}>
              <span>Basic Pay</span>
              <strong>R {Number(payslip.basic_pay || 0).toFixed(2)}</strong>
            </div>

            <div style={row}>
              <span>Gross Pay</span>
              <strong>R {Number(payslip.gross_pay || 0).toFixed(2)}</strong>
            </div>

            <div style={row}>
              <span>Employee UIF Deduction</span>
              <strong>R {Number(payslip.uif_employee || 0).toFixed(2)}</strong>
            </div>

            <div style={row}>
              <span>PAYE</span>
              <strong>R {Number(payslip.paye || 0).toFixed(2)}</strong>
            </div>

            <div style={row}>
              <span>Other Deductions</span>
              <strong>R {Number(payslip.other_deductions || 0).toFixed(2)}</strong>
            </div>

            <div style={netRow}>
              <span>Net Pay</span>
              <strong>R {Number(payslip.net_pay || 0).toFixed(2)}</strong>
            </div>
          </div>

          <p style={note}>
            This payslip was generated through WageFlow. Employers remain
            responsible for ensuring payroll, UIF, SARS, and labour compliance.
          </p>

          <button style={printButton} onClick={printPayslip}>
            Download / Print Payslip
          </button>
        </section>
      ))}
    </main>
  );
}

const page = {
  padding: "40px",
  fontFamily: "Arial, sans-serif",
  background: "#f8faf9",
  minHeight: "100vh",
};

const title = {
  fontSize: "24px",
  color: "#0f766e",
  marginBottom: "24px",
};

const messageStyle = {
  fontSize: "14px",
  color: "#555",
};

const payslipCard = {
  position: "relative" as const,
  overflow: "hidden",
  maxWidth: "760px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "30px",
  marginBottom: "30px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.04)",
};

const watermark = {
  position: "absolute" as const,
  top: "50%",
  left: "50%",
  width: "320px",
  maxWidth: "70%",
  opacity: 0.06,
  transform: "translate(-50%, -50%)",
  pointerEvents: "none" as const,
};

const payslipHeader = {
  position: "relative" as const,
  zIndex: 1,
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
};

const businessName = {
  fontSize: "20px",
  color: "#0f766e",
  margin: 0,
};

const rightHeader = {
  textAlign: "right" as const,
};

const payslipLabel = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#111827",
  margin: 0,
};

const smallText = {
  fontSize: "12px",
  color: "#666",
  marginTop: "6px",
};

const divider = {
  height: "1px",
  background: "#e5e7eb",
  margin: "22px 0",
};

const detailsGrid = {
  position: "relative" as const,
  zIndex: 1,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "16px",
};

const label = {
  fontSize: "12px",
  color: "#777",
  margin: 0,
};

const value = {
  fontSize: "14px",
  color: "#111827",
  marginTop: "4px",
};

const amounts = {
  position: "relative" as const,
  zIndex: 1,
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  padding: "10px 0",
  borderBottom: "1px solid #f1f1f1",
  fontSize: "14px",
};

const netRow = {
  display: "flex",
  justifyContent: "space-between",
  padding: "14px 0",
  marginTop: "8px",
  borderTop: "2px solid #0f766e",
  fontSize: "16px",
  color: "#0f766e",
};

const note = {
  position: "relative" as const,
  zIndex: 1,
  fontSize: "12px",
  color: "#777",
  lineHeight: "1.5",
  marginTop: "20px",
};

const printButton = {
  marginTop: "18px",
  background: "#0f766e",
  color: "#fff",
  padding: "10px 14px",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};