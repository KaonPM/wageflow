"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PayslipTemplate from "@/components/PayslipTemplate";
import { supabase } from "@/app/lib/supabaseClient";

type PayslipRecord = {
  id: string;
  employee_id: string;
  business_id: string;
  basic_pay: number | null;
  bonus: number | null;
  overtime_pay: number | null;
  gross_pay: number | null;
  taxable_income: number | null;
  uif_employee: number | null;
  employer_uif: number | null;
  total_uif: number | null;
  paye: number | null;
  other_deductions: number | null;
  net_pay: number | null;
  payment_method: string | null;
  payroll_month: string | null;
  pay_period_month: number | null;
  pay_period_year: number | null;
  status: string | null;
  created_at: string | null;
};

type EmployeeRecord = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  employee_number: string | null;
  position: string | null;
  department: string | null;
  id_number: string | null;
  payment_method: string | null;
  bank_name: string | null;
  account_number: string | null;
  leave_balance: number | null;
};

type BusinessRecord = {
  id: string;
  business_name: string | null;
  trading_name: string | null;
  registration_number: string | null;
  paye_reference: string | null;
  uif_reference: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
};

export default function EmployerPayslipViewerPage() {
  const params = useParams();
  const payslipId = String(params.id);

  const [payslip, setPayslip] = useState<PayslipRecord | null>(null);
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null);
  const [business, setBusiness] = useState<BusinessRecord | null>(null);
  const [ytdPayslips, setYtdPayslips] = useState<PayslipRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchPayslip();
  }, [payslipId]);

  async function fetchPayslip() {
    setLoading(true);
    setMessage("");

    const { data: payslipData, error: payslipError } = await supabase
      .from("payslips")
      .select("*")
      .eq("id", payslipId)
      .single();

    if (payslipError || !payslipData) {
      setMessage(payslipError?.message || "Payslip not found.");
      setLoading(false);
      return;
    }

    setPayslip(payslipData);

    const { data: employeeData } = await supabase
      .from("employees")
      .select("*")
      .eq("id", payslipData.employee_id)
      .single();

    const { data: businessData } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", payslipData.business_id)
      .single();

    const { data: ytdData } = await supabase
      .from("payslips")
      .select("*")
      .eq("employee_id", payslipData.employee_id)
      .eq("business_id", payslipData.business_id)
      .eq("pay_period_year", payslipData.pay_period_year)
      .lte("pay_period_month", payslipData.pay_period_month || 12);

    setEmployee(employeeData || null);
    setBusiness(businessData || null);
    setYtdPayslips(ytdData || []);
    setLoading(false);
  }

  function maskAccount(accountNumber?: string | null) {
    if (!accountNumber) return "-";
    if (accountNumber.length <= 4) return accountNumber;
    return `******${accountNumber.slice(-4)}`;
  }

  function employeeName() {
    return (
      employee?.full_name ||
      `${employee?.first_name || ""} ${employee?.last_name || ""}`.trim() ||
      "Unnamed Employee"
    );
  }

  function formatPayrollPeriod(monthValue?: string | null) {
    if (!monthValue) return "Payroll period not set";

    const [year, month] = monthValue.split("-");
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0);

    return `${startDate.toLocaleDateString("en-ZA")} - ${endDate.toLocaleDateString(
      "en-ZA"
    )}`;
  }

  function formatPayDate(monthValue?: string | null) {
    if (!monthValue) return new Date().toLocaleDateString("en-ZA");

    const [year, month] = monthValue.split("-");
    const payDate = new Date(Number(year), Number(month), 0);

    return payDate.toLocaleDateString("en-ZA");
  }

  const templateData = useMemo(() => {
    if (!payslip) return null;

    const ytdGross = ytdPayslips.reduce(
      (sum, item) => sum + Number(item.gross_pay || 0),
      0
    );

    const ytdTaxable = ytdPayslips.reduce(
      (sum, item) => sum + Number(item.taxable_income || item.gross_pay || 0),
      0
    );

    const ytdPaye = ytdPayslips.reduce(
      (sum, item) => sum + Number(item.paye || 0),
      0
    );

    const ytdUif = ytdPayslips.reduce(
      (sum, item) => sum + Number(item.uif_employee || 0),
      0
    );

    const earnings = [
      { item: "Basic Salary", amount: Number(payslip.basic_pay || 0) },
      { item: "Overtime", amount: Number(payslip.overtime_pay || 0) },
      { item: "Bonus", amount: Number(payslip.bonus || 0) },
    ].filter((item) => item.amount > 0);

    const deductions = [
      { item: "PAYE", amount: Number(payslip.paye || 0) },
      { item: "UIF", amount: Number(payslip.uif_employee || 0) },
      { item: "Other Deductions", amount: Number(payslip.other_deductions || 0) },
    ].filter((item) => item.amount > 0);

    return {
      company: {
        name:
          business?.trading_name ||
          business?.business_name ||
          "WageFlow Business",
        logoUrl: business?.logo_url || "/wageflow-logo.png",
        address: business?.address || "-",
        registrationNumber: business?.registration_number || "-",
        payeReference: business?.paye_reference || "-",
        uifReference: business?.uif_reference || "-",
        phone: business?.phone || "-",
        email: business?.email || "-",
      },
      employee: {
        name: employeeName(),
        employeeNumber: employee?.employee_number || "-",
        position: employee?.position || "-",
        department: employee?.department || "-",
        idNumber: employee?.id_number || "-",
        paymentMethod:
          payslip.payment_method ||
          employee?.payment_method ||
          "Bank Transfer",
        bankName: employee?.bank_name || "-",
        accountNumber: maskAccount(employee?.account_number),
      },
      pay: {
        period: formatPayrollPeriod(payslip.payroll_month),
        payDate: formatPayDate(payslip.payroll_month),
        payReference: `PAY-${payslip.payroll_month || "MONTH"}-${employee?.employee_number || payslip.id.slice(0, 6)}`,
      },
      earnings,
      deductions,
      ytd: {
        from: `01 March ${payslip.pay_period_year || new Date().getFullYear()}`,
        to: formatPayDate(payslip.payroll_month),
        gross: ytdGross,
        taxable: ytdTaxable,
        paye: ytdPaye,
        uif: ytdUif,
      },
      leave: {
        annual: Number(employee?.leave_balance || 0),
      },
    };
  }, [payslip, employee, business, ytdPayslips]);

  return (
    <main style={page}>
      <section style={topBar}>
        <Link href="/employer/payslips" style={backLink}>
          ← Back to Payslips
        </Link>

        <button style={pdfButton} disabled title="PDF download will be connected next">
          Download PDF
        </button>
      </section>

      {loading ? (
        <div style={emptyState}>Loading payslip...</div>
      ) : message ? (
        <div style={emptyState}>{message}</div>
      ) : templateData ? (
        <PayslipTemplate payslip={templateData} />
      ) : (
        <div style={emptyState}>Payslip could not be prepared.</div>
      )}
    </main>
  );
}

const page = {
  minHeight: "100vh",
  background: "#f4fbfb",
  padding: "40px 18px",
  color: "#172033",
  fontFamily: "Inter, Arial, Helvetica, sans-serif",
};

const topBar = {
  maxWidth: "1050px",
  margin: "0 auto 18px",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
};

const backLink = {
  color: "#176f7a",
  textDecoration: "none",
  fontWeight: 800,
};

const pdfButton = {
  background: "#e2e8f0",
  color: "#64748b",
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "not-allowed",
};

const emptyState = {
  maxWidth: "1050px",
  margin: "0 auto",
  background: "#ffffff",
  border: "1px solid #d8eeee",
  borderRadius: "18px",
  padding: "22px",
  color: "#155e75",
  fontWeight: 700,
};