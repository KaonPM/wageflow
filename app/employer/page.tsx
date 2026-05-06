"use client";

export default function EmployerDashboard() {
  return (
    <main style={page}>
      <section style={hero}>
        <div>
          <p style={eyebrow}>WageFlow Employer Portal</p>
          <h1 style={title}>Employer Dashboard</h1>
          <p style={subtitle}>
            Manage staff records, payroll, payslips and business settings from
            one organised workspace.
          </p>
        </div>

        <div style={statusCard}>
          <span style={statusLabel}>Current Status</span>
          <strong style={statusValue}>Setup in Progress</strong>
          <p style={statusText}>Complete your settings before running payroll.</p>
        </div>
      </section>

      <section style={summaryGrid}>
        <SummaryCard label="Employees" value="0" note="Staff records" />
        <SummaryCard label="Payroll" value="Draft" note="Next run pending" />
        <SummaryCard label="Payslips" value="0" note="Generated this month" />
        <SummaryCard label="Settings" value="Open" note="Business setup" />
      </section>

      <section style={moduleGrid}>
        <DashboardCard
          icon="👥"
          title="Employees"
          description="Add staff profiles, job details, bank details and employment records."
          href="/employer/employees"
          tag="Staff Records"
        />

        <DashboardCard
          icon="💰"
          title="Payroll"
          description="Capture salary, allowances, overtime and deductions before generating payslips."
          href="/employer/payroll"
          tag="Payroll Assistant"
        />

        <DashboardCard
          icon="📄"
          title="Payslips"
          description="View and manage employee payslips once payroll has been processed."
          href="/employer/payslips"
          tag="Payslip Centre"
        />

        <DashboardCard
          icon="⚙️"
          title="Settings"
          description="Configure company branding, PAYE, UIF, payment methods and payslip preferences."
          href="/employer/settings"
          tag="Business Setup"
        />
      </section>

      <section style={noticeBox}>
        <strong>Next recommended step:</strong> Complete your employer settings
        so WageFlow can apply the correct payroll and payslip preferences for
        your business.
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div style={summaryCard}>
      <p style={summaryLabel}>{label}</p>
      <strong style={summaryValue}>{value}</strong>
      <span style={summaryNote}>{note}</span>
    </div>
  );
}

function DashboardCard({
  icon,
  title,
  description,
  href,
  tag,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
  tag: string;
}) {
  return (
    <a href={href} style={cardLink}>
      <article style={card}>
        <div style={cardTop}>
          <div style={iconBox}>{icon}</div>
          <span style={tagStyle}>{tag}</span>
        </div>

        <h2 style={cardTitle}>{title}</h2>
        <p style={cardText}>{description}</p>

        <div style={cardFooter}>
          <span>Open module</span>
          <strong>→</strong>
        </div>
      </article>
    </a>
  );
}

const page = {
  minHeight: "100vh",
  padding: "40px",
  fontFamily: "Arial, sans-serif",
  background: "#f4f8fb",
  color: "#0f172a",
};

const hero = {
  display: "grid",
  gridTemplateColumns: "1.7fr 1fr",
  gap: "24px",
  alignItems: "stretch",
  marginBottom: "28px",
};

const eyebrow = {
  color: "#0f766e",
  fontWeight: 800,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  fontSize: "13px",
  marginBottom: "10px",
};

const title = {
  fontSize: "36px",
  color: "#0f766e",
  margin: "0 0 12px",
  fontWeight: 900,
};

const subtitle = {
  maxWidth: "720px",
  color: "#64748b",
  fontSize: "16px",
  lineHeight: 1.7,
  margin: 0,
};

const statusCard = {
  background: "linear-gradient(135deg, #0f766e, #14b8a6)",
  color: "#ffffff",
  borderRadius: "22px",
  padding: "26px",
  boxShadow: "0 16px 40px rgba(15, 118, 110, 0.22)",
};

const statusLabel = {
  display: "block",
  fontSize: "13px",
  opacity: 0.9,
  marginBottom: "10px",
};

const statusValue = {
  display: "block",
  fontSize: "24px",
  marginBottom: "8px",
};

const statusText = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.5,
  opacity: 0.95,
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "16px",
  marginBottom: "28px",
};

const summaryCard = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.05)",
};

const summaryLabel = {
  margin: "0 0 8px",
  color: "#64748b",
  fontSize: "13px",
  fontWeight: 700,
  textTransform: "uppercase" as const,
};

const summaryValue = {
  display: "block",
  color: "#0f766e",
  fontSize: "24px",
  marginBottom: "6px",
};

const summaryNote = {
  color: "#64748b",
  fontSize: "13px",
};

const moduleGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "22px",
};

const cardLink = {
  textDecoration: "none",
  color: "inherit",
};

const card = {
  height: "100%",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "22px",
  padding: "24px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
};

const cardTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "22px",
};

const iconBox = {
  width: "52px",
  height: "52px",
  borderRadius: "16px",
  background: "#e6fffb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
};

const tagStyle = {
  background: "#fff7ed",
  color: "#c2410c",
  padding: "7px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
};

const cardTitle = {
  color: "#0f172a",
  margin: "0 0 10px",
  fontSize: "21px",
};

const cardText = {
  color: "#64748b",
  lineHeight: 1.6,
  fontSize: "14px",
  minHeight: "68px",
};

const cardFooter = {
  marginTop: "22px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  color: "#0f766e",
  fontWeight: 800,
};

const noticeBox = {
  marginTop: "28px",
  background: "#ecfeff",
  border: "1px solid #a5f3fc",
  color: "#155e75",
  borderRadius: "18px",
  padding: "18px 20px",
  lineHeight: 1.6,
};