"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import PayslipTemplate from "@/components/PayslipTemplate";

export default function ExamplePayslipPage() {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "WageFlow-Payslip",
  });

  const payslip = {
    company: {
      name: "WageFlow Demo Business",
      logoUrl: "/wageflow-logo.png",
      address: "123 Business Park, Johannesburg, 2001",
      registrationNumber: "2024/123456/07",
      payeReference: "1234567890",
      uifReference: "U123456789",
      phone: "+27 11 123 4567",
      email: "info@wageflow.co.za",
    },
    employee: {
      name: "Sipho Mthembu",
      employeeNumber: "EMP-001",
      position: "Store Assistant",
      department: "Operations",
      idNumber: "9001015800084",
      paymentMethod: "Bank Transfer",
      bankName: "First National Bank",
      accountNumber: "******7890",
    },
    pay: {
      period: "01 May 2026 - 31 May 2026",
      payDate: "31 May 2026",
      payReference: "PAY-2026-05-EMP001",
    },
    earnings: [
      { item: "Basic Salary", amount: 12000 },
      { item: "Transport Allowance", amount: 1600 },
      { item: "Cellphone Allowance", amount: 500 },
      { item: "Overtime", amount: 1150 },
      { item: "Performance Bonus", amount: 250 },
    ],
    deductions: [
      { item: "PAYE", amount: 2100 },
      { item: "UIF", amount: 177.12 },
      { item: "Pension Fund", amount: 310 },
      { item: "Medical Aid", amount: 850 },
    ],
    ytd: {
      from: "01 March 2026",
      to: "31 May 2026",
      gross: 46500,
      taxable: 46500,
      paye: 6480,
      uif: 531.36,
    },
    leave: {
      annual: 10,
    },
  };

  return (
    <main style={page}>
      <div style={topBar}>
        <Link href="/" style={backLink}>
          ← Back
        </Link>

        <button onClick={handlePrint} style={downloadButton}>
          Download PDF
        </button>
      </div>

      <div ref={printRef}>
        <PayslipTemplate payslip={payslip} />
      </div>
    </main>
  );
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
  alignItems: "center",
};

const backLink: CSSProperties = {
  color: "#176f7a",
  textDecoration: "none",
  fontWeight: 700,
};

const downloadButton: CSSProperties = {
  background: "#176f7a",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "12px 18px",
  fontWeight: 700,
  cursor: "pointer",
};