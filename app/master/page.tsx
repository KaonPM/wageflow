"use client";

export default function MasterDashboard() {
  return (
    <main style={page}>
      <section style={header}>
        <h1 style={title}>WageFlow Master Dashboard</h1>
        <p style={subtitle}>
          Manage businesses, setup requests, subscriptions, and users.
        </p>
      </section>

      <section style={grid}>
        <div style={card}>
          <h2 style={cardTitle}>Businesses</h2>
          <p style={cardText}>View and manage WageFlow client businesses.</p>
        </div>

        <div style={card}>
          <h2 style={cardTitle}>Setup Requests</h2>
          <p style={cardText}>Track businesses waiting for setup.</p>
        </div>

        <div style={card}>
          <h2 style={cardTitle}>Subscriptions</h2>
          <p style={cardText}>Monitor setup fees and monthly subscriptions.</p>
        </div>

        <div style={card}>
          <h2 style={cardTitle}>Users</h2>
          <p style={cardText}>Manage employer and employee access.</p>
        </div>
      </section>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  background: "#f8faf9",
  fontFamily: "Arial, sans-serif",
  padding: "40px",
};

const header = {
  marginBottom: "30px",
};

const title = {
  fontSize: "28px",
  color: "#0f766e",
  marginBottom: "8px",
};

const subtitle = {
  fontSize: "15px",
  color: "#555",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "20px",
};

const card = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "24px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.04)",
};

const cardTitle = {
  fontSize: "18px",
  color: "#111827",
  marginBottom: "8px",
};

const cardText = {
  fontSize: "14px",
  color: "#666",
};