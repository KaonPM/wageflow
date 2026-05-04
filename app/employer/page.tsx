"use client";

export default function EmployerDashboard() {
  return (
    <main style={page}>
      <h1 style={title}>Employer Dashboard</h1>

      <div style={grid}>
        <a href="/employer/employees" style={link}>
          <div style={card}>Employees</div>
        </a>

        <a href="/employer/payroll" style={link}>
          <div style={card}>Payroll</div>
        </a>

        <a href="/employer/payslips" style={link}>
  <div style={card}>Payslips</div>
</a>
        <div style={card}>Settings</div>
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
  marginBottom: "20px",
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
  color: "#111827",
  cursor: "pointer",
};