import Link from "next/link";
import type { CSSProperties } from "react";

export default function ExamplePayslipPage() {
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
      dateJoined: "01 February 2023",
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
    ytd: {
      grossPay: 46500,
      taxablePay: 46500,
      paye: 6480,
      uif: 531.36,
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
  };

  const grossPay = payslip.earnings.reduce((sum, row) => sum + row.amount, 0);
  const totalDeductions = payslip.deductions.reduce(
    (sum, row) => sum + row.amount,
    0
  );
  const netPay = grossPay - totalDeductions;

  const money = (amount: number) =>
    `R${amount.toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <main style={page}>
      <section style={sheet}>
        <img src={payslip.company.logoUrl} alt="" style={watermark} />

        <div style={content}>
          <Link href="/" style={backLink}>
            ← Back
          </Link>

          <header style={header}>
            <div style={logoWrap}>
              <img
                src={payslip.company.logoUrl}
                alt={`${payslip.company.name} logo`}
                style={logoImage}
              />
            </div>

            <div style={headerText}>
              <h1 style={title}>Example Payslip</h1>
              <p style={subtitle}>For the Period {payslip.pay.period}</p>
            </div>
          </header>

          <section style={detailsGrid}>
            <div style={detailsBox}>
              <h3 style={sectionTitle}>Employer Details</h3>
              <p style={strong}>{payslip.company.name}</p>
              <p>{payslip.company.address}</p>
              <p>Reg No: {payslip.company.registrationNumber}</p>
              <p>PAYE Ref: {payslip.company.payeReference}</p>
              <p>UIF Ref: {payslip.company.uifReference}</p>
              <p>Phone: {payslip.company.phone}</p>
              <p>Email: {payslip.company.email}</p>
            </div>

            <div style={detailsBox}>
              <h3 style={sectionTitle}>Employee Details</h3>
              <Info label="Employee Name" value={payslip.employee.name} />
              <Info label="Employee No." value={payslip.employee.employeeNumber} />
              <Info label="ID Number" value={payslip.employee.idNumber} />
              <Info label="Position" value={payslip.employee.position} />
              <Info label="Department" value={payslip.employee.department} />
              <Info label="Date Joined" value={payslip.employee.dateJoined} />
              <Info label="Payment Method" value={payslip.employee.paymentMethod} />
              <Info label="Bank" value={payslip.employee.bankName} />
              <Info label="Account No." value={payslip.employee.accountNumber} />
            </div>
          </section>

          <section style={summaryGrid}>
            <Summary label="Pay Period" value={payslip.pay.period} />
            <Summary label="Pay Date" value={payslip.pay.payDate} />
            <Summary label="Pay Reference" value={payslip.pay.payReference} />
            <Summary label="Gross Pay" value={money(grossPay)} />
            <Summary label="Deductions" value={money(totalDeductions)} />
            <Summary label="Net Pay" value={money(netPay)} highlight />
          </section>

          <section style={tableGrid}>
            <div style={tableBox}>
              <div style={tableHeader}>
                <span>Earnings</span>
                <span>Amount (R)</span>
              </div>

              {payslip.earnings.map((row) => (
                <div style={tableRow} key={row.item}>
                  <span>{row.item}</span>
                  <span>{money(row.amount)}</span>
                </div>
              ))}

              <div style={totalRow}>
                <span>Total Earnings</span>
                <span>{money(grossPay)}</span>
              </div>
            </div>

            <div style={tableBox}>
              <div style={tableHeader}>
                <span>Deductions</span>
                <span>Amount (R)</span>
              </div>

              {payslip.deductions.map((row) => (
                <div style={tableRow} key={row.item}>
                  <span>{row.item}</span>
                  <span>{money(row.amount)}</span>
                </div>
              ))}

              <div style={totalRow}>
                <span>Total Deductions</span>
                <span>{money(totalDeductions)}</span>
              </div>
            </div>
          </section>

          <section style={ytdBox}>
            <h3 style={ytdTitle}>Year To Date</h3>

            <div style={ytdGrid}>
              <Ytd label="YTD Gross Pay" value={money(payslip.ytd.grossPay)} />
              <Ytd label="YTD Taxable Pay" value={money(payslip.ytd.taxablePay)} />
              <Ytd label="YTD PAYE" value={money(payslip.ytd.paye)} />
              <Ytd label="YTD UIF" value={money(payslip.ytd.uif)} />
            </div>
          </section>

          <section style={netBox}>
            <div>
              <h2 style={netTitle}>Net Pay This Period</h2>
              <p style={netSubtext}>Payable via {payslip.employee.paymentMethod}</p>
            </div>

            <strong style={netAmount}>{money(netPay)}</strong>
          </section>

          <section style={bottomGrid}>
            <div style={supportBox}>
              <strong style={supportTitle}>Generated by WageFlow</strong>
              <p style={supportText}>
                This payslip was generated by WageFlow, a product of Lesedi Smart
                Solutions (Pty) Ltd.
              </p>
              <p style={supportText}>
                Support: info@lesedismartsolutions.co.za
              </p>
            </div>

            <div style={authBox}>
              <p style={authSmall}>Authorised By</p>
              <strong style={signature}>WageFlow Team</strong>
              <div style={signatureLine} />
              <p style={authSmall}>WageFlow Payroll Assistant</p>
            </div>
          </section>

          <p style={disclaimer}>
            WageFlow is a payslip generation and employee record-keeping tool. It
            does not act as the employer, payroll bureau, accountant or registered
            tax practitioner. This is a computer generated payslip.
          </p>
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <p style={infoRow}>
      <span style={infoLabel}>{label}</span>
      <span>{value}</span>
    </p>
  );
}

function Summary({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div style={summaryCard}>
      <p style={summaryLabel}>{label}</p>
      <strong style={highlight ? summaryHighlight : summaryValue}>{value}</strong>
    </div>
  );
}

function Ytd({ label, value }: { label: string; value: string }) {
  return (
    <div style={ytdItem}>
      <p style={ytdLabel}>{label}</p>
      <strong style={ytdValue}>{value}</strong>
    </div>
  );
}

const page: CSSProperties = {
  minHeight: "100vh",
  background: "#f4fbfb",
  padding: "40px 18px",
  color: "#172033",
  fontFamily: "Inter, Arial, Helvetica, sans-serif",
};

const sheet: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  maxWidth: "1050px",
  margin: "0 auto",
  background: "#ffffff",
  borderRadius: "22px",
  padding: "34px",
  boxShadow: "0 20px 60px rgba(16, 72, 84, 0.12)",
  border: "1px solid #d8eeee",
};

const content: CSSProperties = {
  position: "relative",
  zIndex: 1,
};

const watermark: CSSProperties = {
  position: "absolute",
  top: "47%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "520px",
  maxWidth: "75%",
  opacity: 0.045,
  zIndex: 0,
  pointerEvents: "none",
};

const backLink: CSSProperties = {
  display: "inline-block",
  marginBottom: "24px",
  color: "#176f7a",
  textDecoration: "none",
  fontWeight: 700,
};

const header: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "24px",
  borderBottom: "1px solid #d8eeee",
  paddingBottom: "24px",
  marginBottom: "28px",
};

const logoWrap: CSSProperties = {
  width: "210px",
  height: "96px",
  borderRadius: "18px",
  background: "rgba(255, 255, 255, 0.9)",
  border: "1px solid #d8eeee",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "14px",
};

const logoImage: CSSProperties = {
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
};

const headerText: CSSProperties = {
  textAlign: "right",
};

const title: CSSProperties = {
  margin: 0,
  color: "#176f7a",
  fontSize: "34px",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const subtitle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "16px",
};

const detailsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "22px",
  marginBottom: "24px",
};

const detailsBox: CSSProperties = {
  background: "rgba(247, 252, 252, 0.92)",
  border: "1px solid #d8eeee",
  borderRadius: "18px",
  padding: "22px",
  lineHeight: 1.65,
};

const sectionTitle: CSSProperties = {
  margin: "0 0 12px",
  color: "#176f7a",
  textTransform: "uppercase",
  fontSize: "15px",
  letterSpacing: "0.5px",
};

const strong: CSSProperties = {
  fontWeight: 800,
};

const infoRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "145px 1fr",
  gap: "12px",
  margin: "4px 0",
};

const infoLabel: CSSProperties = {
  fontWeight: 700,
  color: "#4c586d",
};

const summaryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, 1fr)",
  gap: "10px",
  marginBottom: "24px",
};

const summaryCard: CSSProperties = {
  border: "1px solid #d8eeee",
  borderRadius: "16px",
  padding: "16px 12px",
  background: "rgba(255, 255, 255, 0.94)",
  textAlign: "center",
};

const summaryLabel: CSSProperties = {
  margin: "0 0 8px",
  color: "#176f7a",
  fontWeight: 800,
  fontSize: "12px",
  textTransform: "uppercase",
};

const summaryValue: CSSProperties = {
  fontSize: "15px",
  color: "#172033",
};

const summaryHighlight: CSSProperties = {
  fontSize: "18px",
  color: "#176f7a",
};

const tableGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "24px",
  marginBottom: "24px",
};

const tableBox: CSSProperties = {
  border: "1px solid #d8eeee",
  borderRadius: "18px",
  overflow: "hidden",
  background: "rgba(255, 255, 255, 0.94)",
};

const tableHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "14px 18px",
  background: "#176f7a",
  color: "#ffffff",
  fontWeight: 800,
  textTransform: "uppercase",
};

const tableRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "13px 18px",
  borderBottom: "1px solid #eef6f6",
};

const totalRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "15px 18px",
  fontWeight: 900,
  color: "#176f7a",
  background: "#f7fcfc",
  textTransform: "uppercase",
};

const ytdBox: CSSProperties = {
  border: "1px solid #d8eeee",
  borderRadius: "18px",
  overflow: "hidden",
  marginBottom: "24px",
  background: "rgba(255, 255, 255, 0.94)",
};

const ytdTitle: CSSProperties = {
  margin: 0,
  padding: "14px 18px",
  textAlign: "center",
  color: "#176f7a",
  background: "#f7fcfc",
  textTransform: "uppercase",
  fontSize: "15px",
};

const ytdGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
};

const ytdItem: CSSProperties = {
  padding: "16px",
  textAlign: "center",
  borderRight: "1px solid #eef6f6",
};

const ytdLabel: CSSProperties = {
  margin: "0 0 6px",
  color: "#176f7a",
  fontWeight: 800,
  fontSize: "12px",
  textTransform: "uppercase",
};

const ytdValue: CSSProperties = {
  color: "#172033",
};

const netBox: CSSProperties = {
  border: "2px solid #176f7a",
  borderRadius: "18px",
  padding: "18px 24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "24px",
  background: "rgba(247, 252, 252, 0.94)",
};

const netTitle: CSSProperties = {
  margin: 0,
  color: "#176f7a",
  textTransform: "uppercase",
  fontSize: "18px",
};

const netSubtext: CSSProperties = {
  margin: "6px 0 0",
  color: "#4c586d",
  fontWeight: 700,
  fontSize: "14px",
};

const netAmount: CSSProperties = {
  color: "#176f7a",
  fontSize: "26px",
  lineHeight: 1.1,
};

const bottomGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "24px",
  marginBottom: "18px",
};

const supportBox: CSSProperties = {
  border: "1px solid #d8eeee",
  borderRadius: "18px",
  padding: "20px",
  background: "rgba(255, 255, 255, 0.94)",
};

const supportTitle: CSSProperties = {
  display: "block",
  color: "#176f7a",
  marginBottom: "8px",
  fontSize: "16px",
};

const supportText: CSSProperties = {
  margin: "6px 0",
  color: "#4c586d",
  fontSize: "13px",
  lineHeight: 1.5,
};

const authBox: CSSProperties = {
  border: "1px solid #d8eeee",
  borderRadius: "18px",
  padding: "20px",
  textAlign: "center",
  background: "rgba(255, 255, 255, 0.94)",
};

const authSmall: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "13px",
  color: "#4c586d",
};

const signature: CSSProperties = {
  display: "block",
  color: "#172033",
  fontSize: "22px",
  fontFamily: "cursive",
  margin: "8px 0",
};

const signatureLine: CSSProperties = {
  borderTop: "1px dashed #b8caca",
  margin: "12px auto",
  width: "75%",
};

const disclaimer: CSSProperties = {
  borderTop: "1px solid #d8eeee",
  paddingTop: "14px",
  color: "#5b6678",
  fontSize: "12px",
  lineHeight: 1.6,
  textAlign: "center",
  margin: 0,
};