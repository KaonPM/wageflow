"use client";

export default function MasterDashboard() {
  return (
    <main style={page}>
      <section style={hero}>
        <div>
          <p style={eyebrow}>WageFlow Admin</p>

          <h1 style={title}>Master Dashboard</h1>

          <p style={subtitle}>
            Manage businesses, setup requests, subscriptions and users from one
            central workspace.
          </p>

          <div style={topActions}>
            <a href="/" style={homeButton}>
              Home
            </a>

            <a href="/login" style={logoutButton}>
              Logout
            </a>
          </div>
        </div>
      </section>

      <section style={overviewGrid}>
        <OverviewCard label="Total Businesses" value="0" note="Client businesses" />
        <OverviewCard label="Pending Setup" value="0" note="Waiting for onboarding" />
        <OverviewCard label="Active Subscriptions" value="0" note="Monthly billing" />
        <OverviewCard label="Total Users" value="0" note="Employer and employee access" />
      </section>

      <section style={grid}>
        <DashboardCard
          icon="🏢"
          title="Businesses"
          description="View, edit and manage WageFlow client businesses."
          href="/master/businesses"
          tag="Client Records"
        />

        <DashboardCard
          icon="🧾"
          title="Setup Requests"
          description="Track businesses waiting for setup and onboarding."
          href="/master/setup-requests"
          tag="Onboarding"
        />

        <DashboardCard
          icon="💳"
          title="Subscriptions"
          description="Monitor setup fees, monthly subscriptions and payment status."
          href="/master/subscriptions"
          tag="Billing"
        />

        <DashboardCard
          icon="👤"
          title="Users"
          description="Manage employer and employee access across WageFlow."
          href="/master/users"
          tag="Access Control"
        />
      </section>
    </main>
  );
}

function OverviewCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div style={overviewCard}>
      <span style={overviewLabel}>{label}</span>
      <strong style={overviewValue}>{value}</strong>
      <p style={overviewNote}>{note}</p>
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
          <span>Open</span>
          <strong>→</strong>
        </div>
      </article>
    </a>
  );
}

const page = {
  minHeight: "100vh",
  padding: "38px",
  fontFamily: "Arial, sans-serif",
  background: "#f4f8fb",
  color: "#0f172a",
};

const hero = {
  marginBottom: "26px",
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

const topActions = {
  display: "flex",
  gap: "12px",
  marginTop: "22px",
};

const homeButton = {
  background: "#ffffff",
  color: "#0f766e",
  border: "1px solid #cbd5e1",
  padding: "10px 18px",
  borderRadius: "12px",
  textDecoration: "none",
  fontWeight: 700,
};

const logoutButton = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "10px 18px",
  borderRadius: "12px",
  textDecoration: "none",
  fontWeight: 700,
  boxShadow: "0 8px 18px rgba(15, 118, 110, 0.18)",
};

const overviewGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "16px",
  marginBottom: "26px",
};

const overviewCard = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 10px 26px rgba(15, 23, 42, 0.05)",
};

const overviewLabel = {
  display: "block",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase" as const,
  marginBottom: "8px",
};

const overviewValue = {
  display: "block",
  color: "#0f766e",
  fontSize: "28px",
  marginBottom: "6px",
};

const overviewNote = {
  margin: 0,
  color: "#64748b",
  fontSize: "13px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "20px",
};

const cardLink = {
  textDecoration: "none",
  color: "inherit",
};

const card = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  padding: "22px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
};

const cardTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
};

const iconBox = {
  width: "50px",
  height: "50px",
  borderRadius: "15px",
  background: "#e6fffb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "23px",
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
  margin: "0 0 10px",
  fontSize: "20px",
  color: "#0f172a",
};

const cardText = {
  color: "#64748b",
  lineHeight: 1.6,
  fontSize: "14px",
  minHeight: "64px",
};

const cardFooter = {
  marginTop: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  color: "#0f766e",
  fontWeight: 800,
};