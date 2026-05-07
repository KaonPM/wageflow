"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type EmployeeRecord = {
  id: string;
  full_name: string;
  position: string | null;
  id_number: string | null;
  business_id: string;
};

type BusinessRecord = {
  business_name: string;
  trading_name: string | null;
  logo_url: string | null;
  uif_reference_number: string | null;
  primary_color: string | null;
  secondary_color: string | null;
};

type PayslipRecord = {
  id: string;
  pay_period_month: string | number | null;
  pay_period_year: string | number | null;
  basic_pay: number | null;
  gross_pay: number | null;
  uif_employee: number | null;
  paye: number | null;
  other_deductions: number | null;
  net_pay: number | null;
  status: string | null;
  created_at: string | null;
  pdf_url?: string | null;
};

export default function EmployeePayslipsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading payslips...");
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null);
  const [business, setBusiness] = useState<BusinessRecord | null>(null);
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);

  useEffect(() => {
    fetchPayslips();
  }, []);

  async function fetchPayslips() {
    setLoading(true);
    setMessage("Loading payslips...");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return;
    }

    const { data: account, error: accountError } = await supabase
      .from("employee_accounts")
      .select("id, employee_id, auth_user_id, portal_enabled")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (accountError || !account || account.portal_enabled !== true) {
      setMessage("Your employee portal access is not active.");
      setLoading(false);
      return;
    }

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select("id, full_name, position, id_number, business_id")
      .eq("id", account.employee_id)
      .maybeSingle();

    if (employeeError || !employeeData) {
      setMessage("Could not load your employee profile.");
      setLoading(false);
      return;
    }

    setEmployee(employeeData);

    const { data: businessData } = await supabase
      .from("businesses")
      .select(
        "business_name, trading_name, logo_url, uif_reference_number, primary_color, secondary_color"
      )
      .eq("id", employeeData.business_id)
      .maybeSingle();

    setBusiness(businessData || null);

    const { data: payslipData, error: payslipError } = await supabase
      .from("payslips")
      .select(
        `
        id,
        pay_period_month,
        pay_period_year,
        basic_pay,
        gross_pay,
        uif_employee,
        paye,
        other_deductions,
        net_pay,
        status,
        created_at,
        pdf_url
      `
      )
      .eq("employee_id", employeeData.id)
      .order("created_at", { ascending: false });

    if (payslipError) {
      setMessage(payslipError.message);
      setLoading(false);
      return;
    }

    setPayslips(payslipData || []);
    setMessage("");
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  function printPayslip() {
    window.print();
  }

  const primaryColor = business?.primary_color || "#0f766e";

  return (
    <main style={page}>
      <section
        style={{
          ...hero,
          background: `linear-gradient(135deg, ${primaryColor}, ${
            business?.secondary_color || "#123c69"
          })`,
        }}
      >
        <div style={topRow}>
          <a href="/employee" style={heroButton}>
            Back to Dashboard
          </a>

          <button onClick={handleLogout} style={heroButton}>
            Logout
          </button>
        </div>

        <p style={eyebrow}>
          {business?.trading_name || business?.business_name || "Employee Portal"}
        </p>

        <h1 style={title}>My Payslips</h1>

        <p style={subtitle}>
          View your issued payslips and download or print copies for your
          records.
        </p>
      </section>

      {message && <p style={messageStyle}>{message}</p>}

      {!loading && !message && payslips.length === 0 && (
        <p style={messageStyle}>No payslips available yet.</p>
      )}

      {payslips.map((payslip) => (
        <section key={payslip.id} style={payslipCard}>
          {business?.logo_url && (
            <img
              src={business.logo_url}
              alt="Company watermark"
              style={watermark}
            />
          )}

          <div style={payslipHeader}>
            <div>
              <h2 style={{ ...businessName, color: primaryColor }}>
                {business?.trading_name ||
                  business?.business_name ||
                  "Business Name"}
              </h2>

              <p style={smallText}>
                UIF Ref: {business?.uif_reference_number || "Not provided"}
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
              <p style={value}>{employee?.full_name || "Not provided"}</p>
            </div>

            <div>
              <p style={label}>Position</p>
              <p style={value}>{employee?.position || "Not provided"}</p>
            </div>

            <div>
              <p style={label}>ID Number</p>
              <p style={value}>{employee?.id_number || "Not provided"}</p>
            </div>

            <div>
              <p style={label}>Status</p>
              <p style={value}>{payslip.status || "Issued"}</p>
            </div>
          </div>

          <div style={divider} />

          <div style={amounts}>
            <div style={row}>
              <span>Basic Pay</span>
              <strong>R {money(payslip.basic_pay)}</strong>
            </div>

            <div style={row}>
              <span>Gross Pay</span>
              <strong>R {money(payslip.gross_pay)}</strong>
            </div>

            <div style={row}>
              <span>Employee UIF Deduction</span>
              <strong>R {money(payslip.uif_employee)}</strong>
            </div>

            <div style={row}>
              <span>PAYE</span>
              <strong>R {money(payslip.paye)}</strong>
            </div>

            <div style={row}>
              <span>Other Deductions</span>
              <strong>R {money(payslip.other_deductions)}</strong>
            </div>

            <div style={{ ...netRow, borderTopColor: primaryColor, color: primaryColor }}>
              <span>Net Pay</span>
              <strong>R {money(payslip.net_pay)}</strong>
            </div>
          </div>

          <p style={note}>
            This payslip was generated through WageFlow. Employers remain
            responsible for ensuring payroll, UIF, SARS, and labour compliance.
          </p>

          <div style={actions}>
            {payslip.pdf_url ? (
              <a href={payslip.pdf_url} target="_blank" style={downloadButton}>
                Download PDF
              </a>
            ) : (
              <button style={printButton} onClick={printPayslip}>
                Download / Print Payslip
              </button>
            )}
          </div>
        </section>
      ))}
    </main>
  );
}

function money(value: number | null | undefined) {
  return Number(value || 0).toFixed(2);
}

const page: CSSProperties = {
  padding: "32px",
  fontFamily: "Arial, sans-serif",
  background: "#f4f7fb",
  minHeight: "100vh",
  color: "#102a43",
};

const hero: CSSProperties = {
  padding: "28px",
  borderRadius: "22px",
  color: "#fff",
  marginBottom: "24px",
  boxShadow: "0 16px 40px rgba(15, 118, 110, 0.18)",
};

const topRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "22px",
};

const heroButton: CSSProperties = {
  padding: "10px 16px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.14)",
  border: "1px solid rgba(255,255,255,0.22)",
  color: "#fff",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};

const eyebrow: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "13px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  opacity: 0.9,
};

const title: CSSProperties = {
  fontSize: "30px",
  margin: "0 0 10px",
};

const subtitle: CSSProperties = {
  maxWidth: "720px",
  fontSize: "15px",
  lineHeight: 1.6,
  margin: 0,
  opacity: 0.92,
};

const messageStyle: CSSProperties = {
  padding: "18px",
  borderRadius: "16px",
  background: "#fff",
  border: "1px solid #e3e8ef",
  fontSize: "14px",
  color: "#52616f",
};

const payslipCard: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  maxWidth: "820px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "30px",
  marginBottom: "30px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.04)",
};

const watermark: CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  width: "320px",
  maxWidth: "70%",
  opacity: 0.06,
  transform: "translate(-50%, -50%)",
  pointerEvents: "none",
};

const payslipHeader: CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
};

const businessName: CSSProperties = {
  fontSize: "20px",
  margin: 0,
};

const rightHeader: CSSProperties = {
  textAlign: "right",
};

const payslipLabel: CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#111827",
  margin: 0,
};

const smallText: CSSProperties = {
  fontSize: "12px",
  color: "#666",
  marginTop: "6px",
};

const divider: CSSProperties = {
  height: "1px",
  background: "#e5e7eb",
  margin: "22px 0",
};

const detailsGrid: CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "16px",
};

const label: CSSProperties = {
  fontSize: "12px",
  color: "#777",
  margin: 0,
};

const value: CSSProperties = {
  fontSize: "14px",
  color: "#111827",
  marginTop: "4px",
};

const amounts: CSSProperties = {
  position: "relative",
  zIndex: 1,
};

const row: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "10px 0",
  borderBottom: "1px solid #f1f1f1",
  fontSize: "14px",
};

const netRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "14px 0",
  marginTop: "8px",
  borderTop: "2px solid",
  fontSize: "16px",
};

const note: CSSProperties = {
  position: "relative",
  zIndex: 1,
  fontSize: "12px",
  color: "#777",
  lineHeight: 1.5,
  marginTop: "20px",
};

const actions: CSSProperties = {
  marginTop: "18px",
  display: "flex",
  gap: "10px",
};

const printButton: CSSProperties = {
  background: "#0f766e",
  color: "#fff",
  padding: "10px 14px",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 700,
};

const downloadButton: CSSProperties = {
  background: "#0f766e",
  color: "#fff",
  padding: "10px 14px",
  borderRadius: "10px",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 700,
};