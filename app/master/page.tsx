"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
        <div style={heroTop}>
          <div>
            <p style={eyebrow}>WageFlow Admin</p>

            <h1 style={title}>Master Dashboard</h1>

            <p style={subtitle}>
              Manage WageFlow businesses, setup requests, subscriptions and
              users from one central workspace.
            </p>
          </div>

          <div style={topActions}>
            <Link href="/" style={homeButton}>
              Home
            </Link>

            <span style={{ color: "#94a3b8" }}>|</span>

            <button onClick={fetchStats} style={refreshButton}>
              Refresh Dashboard
            </button>

            <span style={{ color: "#94a3b8" }}>|</span>

            <Link href="/login" style={logoutButton}>
              Logout
            </Link>
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
          title="Businesses"
          description="View, edit and manage WageFlow client businesses."
          href="/master/businesses"
          tag="Client Records"
        />

        <DashboardCard
          title="WageFlow Requests"
          description="Approve pending businesses and complete onboarding."
          href="/master/wageflow-requests"
          tag="Onboarding"
        />

        <DashboardCard
          title="Subscriptions"
          description="Change plans, payment status, setup fees and billing records."
          href="/master/subscriptions"
          tag="Billing"
        />

        <DashboardCard
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
    <Link href={href} style={cardLink}>
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

const hero = {
  marginBottom: "28px",
};

const heroTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  flexWrap: "wrap" as const,
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
  alignItems: "center",
  gap: "10px",
  fontSize: "14px",
  fontWeight: 500,
};

const homeButton = {
  background: "none",
  border: "none",
  padding: 0,
  color: "#1f4f4f",
  textDecoration: "underline",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
};

const refreshButton = {
  background: "none",
  border: "none",
  padding: 0,
  color: "#1f4f4f",
  textDecoration: "underline",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
};

const logoutButton = {
  background: "none",
  border: "none",
  padding: 0,
  color: "#333",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
  boxShadow: "none",
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
  cursor: "pointer",
};

const cardTop = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  marginBottom: "20px",
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
  justifyContent: "flex-start",
  alignItems: "center",
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