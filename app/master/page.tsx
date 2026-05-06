"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type DashboardStats = {
  businesses: number;
  activeSubscriptions: number;
  employers: number;
  employees: number;
  pendingRequests: number;
};

export default function MasterDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    businesses: 0,
    activeSubscriptions: 0,
    employers: 0,
    employees: 0,
    pendingRequests: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);

    const [
      businessesResult,
      subscriptionsResult,
      employersResult,
      employeesResult,
      requestsResult,
    ] = await Promise.all([
      supabase.from("businesses").select("*", { count: "exact", head: true }),
      supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "active"),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "employer"),
      supabase.from("employees").select("*", { count: "exact", head: true }),
      supabase
        .from("wageflow_setup_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "Pending"),
    ]);

    setStats({
      businesses: businessesResult.count ?? 0,
      activeSubscriptions: subscriptionsResult.count ?? 0,
      employers: employersResult.count ?? 0,
      employees: employeesResult.count ?? 0,
      pendingRequests: requestsResult.count ?? 0,
    });

    setLoading(false);
  }

  return (
    <main style={page}>
      <section style={hero}>
        <div>
          <p style={eyebrow}>WageFlow Admin</p>

          <h1 style={title}>Master Dashboard</h1>

          <p style={subtitle}>
            Manage WageFlow businesses, setup requests, subscriptions and users
            from one central workspace.
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

      <section style={statsGrid}>
        <StatCard
          label="Businesses"
          value={loading ? "..." : String(stats.businesses)}
          note="Registered client businesses"
        />

        <StatCard
          label="Active Subscriptions"
          value={loading ? "..." : String(stats.activeSubscriptions)}
          note="Currently active billing records"
        />

        <StatCard
          label="Employers"
          value={loading ? "..." : String(stats.employers)}
          note="Employer user accounts"
        />

        <StatCard
          label="Employees"
          value={loading ? "..." : String(stats.employees)}
          note="Employee records captured"
        />

        <StatCard
          label="Pending Requests"
          value={loading ? "..." : String(stats.pendingRequests)}
          note="Businesses awaiting setup"
        />
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
          title="WageFlow Requests"
          description="Track businesses waiting for setup and onboarding."
          href="/master/wageflow-requests"
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

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article style={statCard}>
      <p style={statLabel}>{label}</p>
      <strong style={statValue}>{value}</strong>
      <span style={statNote}>{note}</span>
    </article>
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
  maxWidth: "760px",
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

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "16px",
  marginBottom: "28px",
};

const statCard = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 10px 26px rgba(15, 23, 42, 0.05)",
};

const statLabel = {
  margin: "0 0 8px",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase" as const,
};

const statValue = {
  display: "block",
  color: "#0f766e",
  fontSize: "28px",
  marginBottom: "6px",
};

const statNote = {
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