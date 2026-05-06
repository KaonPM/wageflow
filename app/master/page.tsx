import Link from "next/link";

export default function MasterDashboardPage() {
  return (
    <main style={page}>
      <h1 style={title}>WageFlow Master Dashboard</h1>
      <p style={subtitle}>
        Manage businesses, setup requests, subscriptions, and users.
      </p>

      <section style={grid}>
        <Link href="/master/businesses" style={card}>
          <h2 style={cardTitle}>Businesses</h2>
          <p style={cardText}>View and manage WageFlow client businesses.</p>
        </Link>

        <Link href="/master/wageflow-requests" style={card}>
          <h2 style={cardTitle}>Setup Requests</h2>
          <p style={cardText}>Track businesses waiting for setup.</p>
        </Link>

        <Link href="/master/subscriptions" style={card}>
          <h2 style={cardTitle}>Subscriptions</h2>
          <p style={cardText}>Monitor setup fees and monthly subscriptions.</p>
        </Link>

        <Link href="/master/users" style={card}>
          <h2 style={cardTitle}>Users</h2>
          <p style={cardText}>Manage employer and employee access.</p>
        </Link>
      </section>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  padding: "48px",
  background: "#f8fafc",
  fontFamily: "Arial, sans-serif",
};

const title = {
  fontSize: 30,
  color: "#102a43",
  marginBottom: 8,
};

const subtitle = {
  color: "#486581",
  marginBottom: 32,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 22,
};

const card = {
  background: "#ffffff",
  border: "1px solid #d9e2ec",
  borderRadius: 14,
  padding: 24,
  textDecoration: "none",
  color: "inherit",
  boxShadow: "0 10px 25px rgba(15, 23, 42, 0.06)",
  cursor: "pointer",
};

const cardTitle = {
  fontSize: 18,
  color: "#102a43",
  marginBottom: 10,
};

const cardText = {
  color: "#486581",
  lineHeight: 1.5,
  fontSize: 14,
};