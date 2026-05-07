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
          <strong style={statusValue}>Payroll Workspace</strong>
          <p style={statusText}>
            Use the cards below to manage employees, process payroll and review
            payslips.
          </p>
        </div>
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
          description="Capture salary, bonuses, overtime and deductions before generating payslips."
          href="/employer/payroll"
          tag="Payroll Run"
        />

        <DashboardCard
          icon="📄"
          title="Payslips"
          description="View payslip history, download PDFs and resend employee notifications."
          href="/employer/payslips"
          tag="Payslip Centre"
        />

        <DashboardCard
          icon="⚙️"
          title="Settings"
          description="Configure company details, branding, PAYE, UIF and payment preferences."
          href="/employer/settings"
          tag="Business Setup"
        />
      </section>

      <section style={checklistBox}>
        <div>
          <p style={checklistEyebrow}>Monthly Payroll Flow</p>
          <h2 style={checklistTitle}>Payroll Checklist</h2>
        </div>

        <div style={checklistGrid}>
          <ChecklistItem text="Confirm business settings and payment preferences" />
          <ChecklistItem text="Add or update employee salary information" />
          <ChecklistItem text="Run payroll and review PAYE and UIF calculations" />
          <ChecklistItem text="Review payslips and resend employee notifications" />
        </div>
      </section>
    </main>
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
          <span>Open</span>
          <strong>→</strong>
        </div>
      </article>
    </a>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div style={checkItem}>
      <span style={checkDot}>✓</span>
      <p style={checkText}>{text}</p>
    </div>
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

const moduleGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "20px",
  marginBottom: "24px",
};

const cardLink = {
  textDecoration: "none",
  color: "inherit",
};

const card = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "22px",
  padding: "24px",
  minHeight: "230px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "space-between",
  cursor: "pointer",
};

const cardTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "18px",
};

const iconBox = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  background: "#ecfeff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
};

const tagStyle = {
  background: "#f8fafc",
  color: "#0f766e",
  border: "1px solid #dbeafe",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: 800,
};

const cardTitle = {
  margin: "0 0 10px",
  color: "#0f172a",
  fontSize: "22px",
};

const cardText = {
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.6,
  margin: 0,
};

const cardFooter = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: "24px",
  color: "#0f766e",
  fontWeight: 800,
};

const checklistBox = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "22px",
  padding: "24px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.05)",
};

const checklistEyebrow = {
  color: "#0f766e",
  fontWeight: 800,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  fontSize: "12px",
  margin: "0 0 8px",
};

const checklistTitle = {
  color: "#0f172a",
  fontSize: "22px",
  margin: "0 0 18px",
};

const checklistGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "14px",
};

const checkItem = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "14px",
};

const checkDot = {
  color: "#0f766e",
  fontWeight: 900,
};

const checkText = {
  margin: 0,
  color: "#334155",
  fontSize: "14px",
  lineHeight: 1.5,
  fontWeight: 600,
};