"use client";

export default function EmployeeDashboard() {
  return (
    <main style={page}>
      <h1 style={title}>Employee Portal</h1>
      <p style={subtitle}>View your payslips and profile details.</p>

      <div style={grid}>
        <a href="/employee/payslips" style={link}>
          <div style={card}>My Payslips</div>
        </a>

        <a href="/employee/profile" style={link}>
          <div style={card}>My Profile</div>
        </a>
      </div>
    </main>
  );
}

const page = {
  padding: "40px",
  fontFamily: "Arial, sans-serif",
};

const title = {
  fontSize: "24px",
  color: "#0f766e",
  marginBottom: "8px",
};

const subtitle = {
  fontSize: "14px",
  color: "#555",
  marginBottom: "24px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "20px",
};

const link = {
  textDecoration: "none",
  color: "inherit",
};

const card = {
  padding: "20px",
  border: "1px solid #eee",
  borderRadius: "10px",
  background: "#fff",
  cursor: "pointer",
};