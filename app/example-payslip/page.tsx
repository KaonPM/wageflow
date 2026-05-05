import Link from "next/link";

export default function ExamplePayslipPage() {
  const payslip = {
    company: {
  name: "WageFlow Demo Business",
  logoText: "WageFlow",
      address: "123 Business Park, Johannesburg, 2001",
      registrationNumber: "2024/123456/07",
      payeReference: "1234567890",
      uifReference: "U123456789",
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
        <Link href="/" style={backLink}>
          ← Back
        </Link>

        <header style={header}>
          <div style={companyLogo}>
            <span>{payslip.company.logoText}</span>
          </div>

          <div>
            <h1 style={title}>Example Payslip</h1>
            <p style={subtitle}>Pay period: {payslip.pay.period}</p>
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
          </div>

          <div style={detailsBox}>
            <h3 style={sectionTitle}>Employee Details</h3>
            <Info label="Employee Name" value={payslip.employee.name} />
            <Info label="Employee No." value={payslip.employee.employeeNumber} />
            <Info label="ID Number" value={payslip.employee.idNumber} />
            <Info label="Position" value={payslip.employee.position} />
            <Info label="Department" value={payslip.employee.department} />
            <Info label="Payment Method" value={payslip.employee.paymentMethod} />
            <Info label="Bank" value={payslip.employee.bankName} />
            <Info label="Account No." value={payslip.employee.accountNumber} />
          </div>
        </section>

        <section style={summaryGrid}>
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
              <span>Amount</span>
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
              <span>Amount</span>
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

        <section style={netBox}>
          <div>
            <h2 style={netTitle}>Net Pay This Period</h2>
            <p style={netSubtext}>
              Payable via {payslip.employee.paymentMethod}
            </p>
          </div>

          <strong style={netAmount}>{money(netPay)}</strong>
        </section>

        <section style={footerBox}>
          <p>
            This payslip was generated by <strong>WageFlow</strong>, a product of{" "}
            <strong>Lesedi Smart Solutions (Pty) Ltd</strong>.
          </p>

          <p>
            WageFlow is a payslip generation and employee record-keeping tool. It
            does not act as the employer, payroll bureau, accountant or registered
            tax practitioner.
          </p>
        </section>
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

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f4fbfb",
  padding: "40px 18px",
  color: "#172033",
  fontFamily:
    "Inter, Arial, Helvetica, sans-serif",
};

const sheet: React.CSSProperties = {
  maxWidth: "1050px",
  margin: "0 auto",
  background: "#ffffff",
  borderRadius: "22px",
  padding: "34px",
  boxShadow: "0 20px 60px rgba(16, 72, 84, 0.12)",
  border: "1px solid #d8eeee",
};

const backLink: React.CSSProperties = {
  display: "inline-block",
  marginBottom: "24px",
  color: "#176f7a",
  textDecoration: "none",
  fontWeight: 700,
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "24px",
  borderBottom: "1px solid #d8eeee",
  paddingBottom: "24px",
  marginBottom: "28px",
};

const companyLogo: React.CSSProperties = {
  width: "190px",
  height: "90px",
  borderRadius: "22px",
  background: "linear-gradient(135deg, #176f7a, #e7962d)",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
  fontWeight: 900,
  letterSpacing: "0.5px",
};

const title: React.CSSProperties = {
  margin: 0,
  color: "#176f7a",
  fontSize: "34px",
  textTransform: "uppercase",
  textAlign: "right",
};

const subtitle: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: "16px",
  textAlign: "right",
};

const detailsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "22px",
  marginBottom: "24px",
};

const detailsBox: React.CSSProperties = {
  background: "#f7fcfc",
  border: "1px solid #d8eeee",
  borderRadius: "18px",
  padding: "22px",
  lineHeight: 1.7,
};

const sectionTitle: React.CSSProperties = {
  margin: "0 0 12px",
  color: "#176f7a",
  textTransform: "uppercase",
  fontSize: "15px",
  letterSpacing: "0.5px",
};

const strong: React.CSSProperties = {
  fontWeight: 800,
};

const infoRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "150px 1fr",
  margin: "4px 0",
};

const infoLabel: React.CSSProperties = {
  fontWeight: 700,
  color: "#4c586d",
};

const summaryGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: "12px",
  marginBottom: "24px",
};

const summaryCard: React.CSSProperties = {
  border: "1px solid #d8eeee",
  borderRadius: "16px",
  padding: "18px",
  background: "#ffffff",
  textAlign: "center",
};

const summaryLabel: React.CSSProperties = {
  margin: "0 0 8px",
  color: "#176f7a",
  fontWeight: 800,
  fontSize: "13px",
  textTransform: "uppercase",
};

const summaryValue: React.CSSProperties = {
  fontSize: "17px",
  color: "#172033",
};

const summaryHighlight: React.CSSProperties = {
  fontSize: "22px",
  color: "#176f7a",
};

const tableGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "24px",
  marginBottom: "24px",
};

const tableBox: React.CSSProperties = {
  border: "1px solid #d8eeee",
  borderRadius: "18px",
  overflow: "hidden",
};

const tableHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "14px 18px",
  background: "#176f7a",
  color: "#ffffff",
  fontWeight: 800,
  textTransform: "uppercase",
};

const tableRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "14px 18px",
  borderBottom: "1px solid #eef6f6",
};

const totalRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "16px 18px",
  fontWeight: 900,
  color: "#176f7a",
  background: "#f7fcfc",
  textTransform: "uppercase",
};

const netBox: React.CSSProperties = {
  border: "2px solid #176f7a",
  borderRadius: "18px",
  padding: "22px 26px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "24px",
  background: "#f7fcfc",
};

const netTitle: React.CSSProperties = {
  margin: 0,
  color: "#176f7a",
  textTransform: "uppercase",
  fontSize: "22px",
};

const netSubtext: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#4c586d",
  fontWeight: 700,
};

const netAmount: React.CSSProperties = {
  color: "#176f7a",
  fontSize: "34px",
};

const footerBox: React.CSSProperties = {
  borderTop: "1px solid #d8eeee",
  paddingTop: "18px",
  color: "#5b6678",
  fontSize: "13px",
  lineHeight: 1.6,
  textAlign: "center",
};