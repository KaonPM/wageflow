"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import PayslipTemplate, {
  type PayslipData as TemplatePayslipData,
} from "@/components/PayslipTemplate";
import { supabase } from "../../../lib/supabaseClient";

type RawPayslip = {
  id: string;
  employee_id: string;
  business_id: string | null;
  payroll_month: string | null;
  pay_period_month: string | number | null;
  pay_period_year: string | number | null;
  basic_pay: number | null;
  gross_pay: number | null;
  paye: number | null;
  uif_employee: number | null;
  other_deductions: number | null;
  net_pay: number | null;
  payment_method: string | null;
  created_at: string | null;
  downloaded_at?: string | null;
};

type EmployeeRecord = {
  id: string;
  business_id: string;
  full_name: string | null;
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
  logo_url: string | null;
  address: string | null;
  registration_number: string | null;
  paye_reference: string | null;
  uif_reference: string | null;
  email: string | null;
  phone: string | null;
};

export default function EmployeePayslipViewPage() {
  const params = useParams();
  const router = useRouter();
  const payslipRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState("");

  const [payslip, setPayslip] = useState<RawPayslip | null>(null);
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null);
  const [business, setBusiness] = useState<BusinessRecord | null>(null);
  const [ytdPayslips, setYtdPayslips] = useState<RawPayslip[]>([]);

  useEffect(() => {
    const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

    if (id) {
      loadPayslip(id);
    }
  }, [params]);

  async function loadPayslip(id: string) {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: account, error: accountError } = await supabase
      .from("employee_accounts")
      .select("employee_id, portal_enabled")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (accountError || !account || account.portal_enabled !== true) {
      setMessage("Employee portal access is not active.");
      setLoading(false);
      return;
    }

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select(
        `
        id,
        business_id,
        full_name,
        employee_number,
        position,
        department,
        id_number,
        payment_method,
        bank_name,
        account_number,
        leave_balance
      `
      )
      .eq("id", account.employee_id)
      .maybeSingle();

    if (employeeError || !employeeData) {
      setMessage("Employee record could not be loaded.");
      setLoading(false);
      return;
    }

    const { data: payslipData, error: payslipError } = await supabase
      .from("payslips")
      .select(
        `
        id,
        employee_id,
        business_id,
        payroll_month,
        pay_period_month,
        pay_period_year,
        basic_pay,
        gross_pay,
        paye,
        uif_employee,
        other_deductions,
        net_pay,
        payment_method,
        created_at,
        downloaded_at
      `
      )
      .eq("id", id)
      .eq("employee_id", employeeData.id)
      .maybeSingle();

    if (payslipError || !payslipData) {
      setMessage("Payslip could not be loaded.");
      setLoading(false);
      return;
    }

    const { data: businessData } = await supabase
      .from("businesses")
      .select(
        `
        id,
        business_name,
        trading_name,
        logo_url,
        address,
        registration_number,
        paye_reference,
        uif_reference,
        email,
        phone
      `
      )
      .eq("id", employeeData.business_id)
      .maybeSingle();

    const { data: ytdData } = await supabase
      .from("payslips")
      .select(
        `
        id,
        employee_id,
        business_id,
        payroll_month,
        pay_period_month,
        pay_period_year,
        basic_pay,
        gross_pay,
        paye,
        uif_employee,
        other_deductions,
        net_pay,
        payment_method,
        created_at
      `
      )
      .eq("employee_id", employeeData.id)
      .eq("pay_period_year", payslipData.pay_period_year);

    setEmployee(employeeData);
    setPayslip(payslipData);
    setBusiness(businessData || null);
    setYtdPayslips(ytdData || []);
    setLoading(false);
  }

  const templateData = useMemo<TemplatePayslipData | null>(() => {
    if (!payslip || !employee) return null;

    const earnings = [
      {
        item: "Basic Salary",
        amount: Number(payslip.basic_pay || payslip.gross_pay || 0),
      },
    ];

    const deductions = [
      {
        item: "PAYE",
        amount: Number(payslip.paye || 0),
      },
      {
        item: "UIF",
        amount: Number(payslip.uif_employee || 0),
      },
    ];

    const otherDeductions = Number(payslip.other_deductions || 0);

    if (otherDeductions > 0) {
      deductions.push({
        item: "Other Deductions",
        amount: otherDeductions,
      });
    }

    const ytdGross = ytdPayslips.reduce(
      (sum, row) => sum + Number(row.gross_pay || row.basic_pay || 0),
      0
    );

    const ytdPaye = ytdPayslips.reduce(
      (sum, row) => sum + Number(row.paye || 0),
      0
    );

    const ytdUif = ytdPayslips.reduce(
      (sum, row) => sum + Number(row.uif_employee || 0),
      0
    );

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
        name: employee.full_name || "-",
        employeeNumber: employee.employee_number || "-",
        position: employee.position || "-",
        department: employee.department || "-",
        idNumber: employee.id_number || "-",
        paymentMethod:
          payslip.payment_method || employee.payment_method || "Bank Transfer",
        bankName: employee.bank_name || "-",
        accountNumber: maskAccount(employee.account_number),
      },
      pay: {
        period: formatPayrollPeriod(payslip),
        payDate: formatPayDate(payslip.created_at),
        payReference: `PAY-${formatReferenceMonth(payslip)}-${
          employee.employee_number || payslip.id.slice(0, 6)
        }`,
      },
      earnings,
      deductions,
      ytd: {
        from: `01 March ${payslip.pay_period_year || new Date().getFullYear()}`,
        to: formatPayDate(payslip.created_at),
        gross: ytdGross,
        taxable: ytdGross,
        paye: ytdPaye,
        uif: ytdUif,
      },
      leave: {
        annual: Number(employee.leave_balance || 0),
      },
    };
  }, [payslip, employee, business, ytdPayslips]);

  async function downloadPdf() {
    if (!payslipRef.current || !payslip) return;

    setDownloading(true);

    const canvas = await html2canvas(payslipRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imageData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imageWidth = pageWidth;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;

    let heightLeft = imageHeight;
    let position = 0;

    pdf.addImage(imageData, "PNG", 0, position, imageWidth, imageHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imageHeight;
      pdf.addPage();
      pdf.addImage(imageData, "PNG", 0, position, imageWidth, imageHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`payslip-${formatReferenceMonth(payslip)}.pdf`);

    await supabase
      .from("payslips")
      .update({
        downloaded_at: new Date().toISOString(),
      })
      .eq("id", payslip.id);

    setDownloading(false);
  }

  return (
    <main style={page}>
      <section style={topBar}>
        <Link href="/employee/payslips" style={backLink}>
           ← Back to Payslips
        </Link>

        <button style={pdfButton} onClick={downloadPdf} disabled={downloading}>
          {downloading ? "Preparing PDF..." : "Download PDF"}
        </button>
      </section>

      {loading ? (
        <div style={emptyState}>Loading payslip...</div>
      ) : message ? (
        <div style={emptyState}>{message}</div>
      ) : templateData ? (
        <div ref={payslipRef}>
          <PayslipTemplate payslip={templateData} />
        </div>
      ) : (
        <div style={emptyState}>Payslip could not be prepared.</div>
      )}
    </main>
  );
}

function formatPayrollPeriod(payslip: RawPayslip) {
  if (payslip.payroll_month) return payslip.payroll_month;

  if (payslip.pay_period_month && payslip.pay_period_year) {
    return `${payslip.pay_period_year}/${String(
      payslip.pay_period_month
    ).padStart(2, "0")}`;
  }

  return "Payroll Period";
}

function formatReferenceMonth(payslip: RawPayslip) {
  if (payslip.payroll_month) return payslip.payroll_month;

  if (payslip.pay_period_month && payslip.pay_period_year) {
    return `${payslip.pay_period_year}-${String(
      payslip.pay_period_month
    ).padStart(2, "0")}`;
  }

  return "MONTH";
}

function formatPayDate(dateValue: string | null) {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toISOString().slice(0, 10);
}

function maskAccount(accountNumber: string | null) {
  if (!accountNumber) return "-";

  const clean = String(accountNumber).trim();

  if (clean.length <= 4) return clean;

  return `******${clean.slice(-4)}`;
}

const page: CSSProperties = {
  minHeight: "100vh",
  background: "#f4fbfb",
  padding: "40px 18px",
  color: "#172033",
  fontFamily: "Inter, Arial, Helvetica, sans-serif",
};

const topBar: CSSProperties = {
  maxWidth: "1050px",
  margin: "0 auto 18px",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
};

const backLink: CSSProperties = {
  color: "#176f7a",
  textDecoration: "none",
  fontWeight: 800,
};

const pdfButton: CSSProperties = {
  background: "#0f766e",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const emptyState: CSSProperties = {
  maxWidth: "1050px",
  margin: "0 auto",
  background: "#ffffff",
  border: "1px solid #d8eeee",
  borderRadius: "18px",
  padding: "22px",
  color: "#155e75",
  fontWeight: 700,
};