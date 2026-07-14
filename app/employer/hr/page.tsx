import Link from "next/link";

export default function EmployerHRPage() {
  return (
    <main style={page}>
      <section style={header}>
        <div>
          <h1 style={title}>HR Records</h1>

          <p style={subtitle}>
            Manage employee documents, disciplinary records, HR approvals and
            internal HR notes from one workspace.
          </p>
        </div>

        <Link href="/employer" style={backButton}>
           ← Back to Employer Dashboard
        </Link>
      </section>

      <section style={grid}>
        <ModuleCard
          title="Employee Documents"
          description="Upload contracts, IDs, proof of address, certificates and other staff documents."
          href="/employer/hr/documents"
          tag="Uploads"
        />

        <ModuleCard
          title="Disciplinary Records"
          description="Record disciplinary incidents, warning letters, hearings, outcomes and follow-up actions."
          href="/employer/hr/disciplinary-records"
          tag="Records"
        />

        <ModuleCard
          title="HR Approvals"
          description="Manage leave requests, overtime requests, approval status, approval notes and employee notifications."
          href="/employer/hr/approvals"
          tag="Approvals"
        />

        <ModuleCard
          title="HR Notes"
          description="Keep general employee HR notes, internal comments and non-payroll records."
          href="/employer/hr/notes"
          tag="Notes"
        />
      </section>
    </main>
  );
}

function ModuleCard({
  title,
  description,
  href,
  tag,
}: {
  title: string;
  description: string;
  href: string;
  tag: string;
}) {
  return (
    <Link href={href} style={link}>
      <article style={card}>
        <div style={cardTop}>
          <span style={tagStyle}>{tag}</span>
        </div>

        <h2 style={cardTitle}>{title}</h2>

        <p style={cardText}>{description}</p>

        <div style={cardFooter}>
          <span style={openPill}>Open</span>
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
  justifyContent: "flex-start",
};

const cardTop = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: "12px",
  marginBottom: "14px",
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
  justifyContent: "flex-start",
  alignItems: "center",
  marginTop: "20px",
};

const openPill = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#ecfeff",
  color: "#0f766e",
  border: "1px solid #99f6e4",
  borderRadius: "999px",
  padding: "8px 16px",
  fontWeight: 900,
};