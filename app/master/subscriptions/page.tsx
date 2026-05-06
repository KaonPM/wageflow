export default function MasterSubscriptionsPage() {
  return (
    <main style={page}>
      <section style={header}>
        <div>
          <p style={eyebrow}>WageFlow Admin</p>
          <h1 style={title}>Subscriptions</h1>
          <p style={subtitle}>
            Monitor setup fees, monthly subscriptions, payment status and client billing activity.
          </p>
        </div>

        <a href="/master" style={backButton}>
          ← Back to Dashboard
        </a>
      </section>

      <section style={summaryGrid}>
        <SummaryCard label="Active Subscriptions" value="0" />
        <SummaryCard label="Pending Payments" value="0" />
        <SummaryCard label="Setup Fees Due" value="0" />
        <SummaryCard label="Overdue Accounts" value="0" />
      </section>

      <section style={card}>
        <h2 style={cardTitle}>Subscription Management</h2>
        <p style={cardText}>
          This area will show business subscriptions, setup fees, monthly payment status and renewal tracking.
        </p>

        <div style={emptyState}>
          <strong>No subscription records yet</strong>
          <span>Once businesses are onboarded, their billing status will appear here.</span>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryCard}>
      <span style={summaryLabel}>{label}</span>
      <strong style={summaryValue}>{value}</strong>
    </div>
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
};

const eyebrow = {
  color: "#0f766e",
  fontWeight: 800,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  fontSize: "12px",
  marginBottom: "8px",
};

const title = {
  fontSize: "34px",
  color: "#0f766e",
  margin: "0 0 10px",
  fontWeight: 900,
};

const subtitle = {
  maxWidth: "720px",
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

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "16px",
  marginBottom: "24px",
};

const summaryCard = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "18px",
  boxShadow: "0 10px 26px rgba(15, 23, 42, 0.05)",
};

const summaryLabel = {
  display: "block",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase" as const,
  marginBottom: "7px",
};

const summaryValue = {
  color: "#0f766e",
  fontSize: "24px",
};

const card = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  padding: "26px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
};

const cardTitle = {
  margin: "0 0 10px",
  color: "#0f172a",
  fontSize: "22px",
};

const cardText = {
  color: "#64748b",
  lineHeight: 1.6,
  marginBottom: "24px",
};

const emptyState = {
  background: "#ecfeff",
  border: "1px solid #a5f3fc",
  color: "#155e75",
  borderRadius: "16px",
  padding: "22px",
  display: "flex",
  flexDirection: "column" as const,
  gap: "6px",
};