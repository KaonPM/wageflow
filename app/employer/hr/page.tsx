import Link from "next/link";

export default function EmployerHRPage() {
  return (
    <main style={page}>
      <section style={header}>
        <div>
          <h1 style={title}>HR Records</h1>
          <p style={subtitle}>
            Manage employee documents, confirmations, warnings, disciplinary
            records and internal HR notes from one workspace.
          </p>
        </div>

        <Link href="/employer" style={backButton}>
          ← Back to Employer Dashboard
        </Link>
      </section>

      <section style={grid}>
        <ModuleCard
          icon="📁"
          title="Employee Documents"
          description="Upload contracts of employment, IDs, proof of address, certificates and other staff documents."
          href="/employer/hr/documents"
          tag="Uploads"
        />

        <ModuleCard
          icon="📝"
          title="Employment Confirmations"
          description="Generate confirmation of employment letters from stored employee records."
          href="/employer/hr/confirmations"
          tag="Generate"
        />

        <ModuleCard
          icon="⚠️"
          title="Warning Records"
          description="Create and store written warnings, final warnings and related HR notes."
          href="/employer/hr/warnings"
          tag="Records"
        />

        <ModuleCard
          icon="⚖️"
          title="Disciplinary Records"
          description="Record disciplinary incidents, hearings, outcomes and follow-up actions."
          href="/employer/hr/disciplinary"
          tag="Records"
        />

        <ModuleCard
          icon="🗒️"
          title="HR Notes"
          description="Keep general employee HR notes, internal comments and non-payroll records."
          href="/employer/hr/notes"
          tag="Notes"
        />
      </section>

      <section style={infoBox}>
        <h2 style={infoTitle}>HR records approach</h2>
        <p style={infoText}>
          Upload-based records such as contracts and IDs will use secure
          document storage. Generated records such as confirmations and warnings
          will be created from employee data and saved for future reference.
        </p>
      </section>
    </main>
  );
}

function ModuleCard({
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
    <Link href={href} style={link}>
      <article style={card}>
        <div style={cardTop}>
          <span style={iconBox}>{icon}</span>
          <span style={tagStyle}>{tag}</span>
        </div>

        <h2 style={cardTitle}>{title}</h2>
        <p style={cardText}>{description}</p>

        <div style={cardFooter}>
          <span>Open</span>
          <strong>→</strong>
        </div>
      </article>
    </Link>
  );
}

const page = {
  minHeight: "100vh",
  padding: "38px",
  fontFamily: "Arial, sans-serif",
  background: "#f4f8fb",
  color: "#0f172a",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "28px",
  flexWrap: "wrap" as const,
};

const title = {
  fontSize: "34px",
  color: "#0f766e",
  margin: "0 0 10px",
  fontWeight: 900,
};

const subtitle = {
  maxWidth: "760px",
  color: "#64748b",
  fontSize: "15px",
  lineHeight: 1.6,
  margin: 0,
};

const backButton = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "10px 18px",
  borderRadius: "12px",
  textDecoration: "none",
  fontWeight: 700,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "18px",
  marginBottom: "24px",
};

const link = {
  textDecoration: "none",
  color: "inherit",
};

const card = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  padding: "22px",
  minHeight: "210px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "space-between",
};

const cardTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "14px",
};

const iconBox = {
  width: "44px",
  height: "44px",
  borderRadius: "15px",
  background: "#ecfeff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
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
  fontSize: "20px",
};

const cardText = {
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.55,
  margin: 0,
};

const cardFooter = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: "20px",
  color: "#0f766e",
  fontWeight: 800,
};

const infoBox = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  padding: "22px",
};

const infoTitle = {
  margin: "0 0 8px",
  color: "#0f172a",
  fontSize: "20px",
};

const infoText = {
  margin: 0,
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.6,
};