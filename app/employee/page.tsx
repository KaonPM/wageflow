"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type DashboardData = {
  employeeName: string;
  employeeStatus: string;
  employerName: string;
  primaryColor: string;
  secondaryColor: string;
  latestPayslip: {
    pay_period: string;
    net_pay: number;
    status: string;
  } | null;
  unreadNotifications: number;
};

export default function EmployeeDashboard() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: account, error: accountError } = await supabase
      .from("employee_accounts")
      .select(
        `
        portal_enabled,
        employee:employees (
          id,
          full_name,
          status,
          employer_id,
          employer:employers (
            business_name,
            primary_color,
            secondary_color
          )
        )
      `
      )
      .eq("auth_user_id", user.id)
      .single();

    if (accountError || !account || !account.portal_enabled) {
      setData(null);
      setLoading(false);
      return;
    }

    const employee = Array.isArray(account.employee)
      ? account.employee[0]
      : account.employee;

    const employer = Array.isArray(employee?.employer)
      ? employee.employer[0]
      : employee?.employer;

    const { data: latestPayslip } = await supabase
      .from("employee_payslips")
      .select("pay_period, net_pay, status")
      .eq("employee_id", employee.id)
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { count: unreadCount } = await supabase
      .from("employee_notifications")
      .select("*", { count: "exact", head: true })
      .eq("employee_id", employee.id)
      .eq("is_read", false);

    setData({
      employeeName: employee.full_name,
      employeeStatus: employee.status || "active",
      employerName: employer?.business_name || "Your Employer",
      primaryColor: employer?.primary_color || "#0f766e",
      secondaryColor: employer?.secondary_color || "#123c69",
      latestPayslip: latestPayslip || null,
      unreadNotifications: unreadCount || 0,
    });

    await supabase
      .from("employee_accounts")
      .update({ last_login: new Date().toISOString() })
      .eq("auth_user_id", user.id);

    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <main style={page}>
        <div style={loadingCard}>Loading employee portal...</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main style={page}>
        <div style={loadingCard}>
          Your employee portal access is not active. Please contact your employer.
        </div>
      </main>
    );
  }

  return (
    <main style={page}>
      <section
        style={{
          ...heroCard,
          background: `linear-gradient(135deg, ${data.primaryColor}, ${data.secondaryColor})`,
        }}
      >
        <div style={heroTopRow}>
          <a href="/" style={homeButton}>
            Home
          </a>

          <button onClick={handleLogout} style={logoutButton}>
            Logout
          </button>
        </div>

        <div>
          <p style={eyebrow}>{data.employerName} Employee Portal</p>
          <h1 style={title}>Welcome back, {data.employeeName}</h1>
          <p style={subtitle}>
            View your payslips, profile details, HR documents, leave updates,
            overtime records, and important employer notifications.
          </p>
        </div>

        <div style={statusBadge}>
          Employee Status: {capitalise(data.employeeStatus)}
        </div>

        <p style={poweredBy}>Powered by WageFlow</p>
      </section>

      <section style={summaryGrid}>
        <div style={summaryCard}>
          <p style={summaryLabel}>Latest Payslip</p>

          <h2 style={summaryValue}>
            {data.latestPayslip ? data.latestPayslip.pay_period : "Not issued yet"}
          </h2>

          <p style={summaryText}>
            {data.latestPayslip
              ? `Net pay: R${Number(data.latestPayslip.net_pay).toFixed(2)}`
              : "Your most recent payslip will appear here once your employer issues it."}
          </p>

          <a href="/employee/payslips" style={primaryButton}>
            Open
          </a>
        </div>

        <div style={summaryCard}>
          <p style={summaryLabel}>Notifications</p>

          <h2 style={summaryValue}>
            {data.unreadNotifications} unread
          </h2>

          <p style={summaryText}>
            View payroll notices, payslip updates, HR reminders, and employer
            messages.
          </p>

          <a href="/employee/notifications" style={secondaryButton}>
            Open
          </a>
        </div>
      </section>

      <section style={sectionHeader}>
        <h2 style={sectionTitle}>Employee Self-Service</h2>
        <p style={sectionText}>
          Quick access to your payroll and HR information.
        </p>
      </section>

      <section style={grid}>
        <a href="/employee/payslips" style={link}>
          <div style={card}>
            <div style={cardIcon}>📄</div>
            <h3 style={cardTitle}>My Payslips</h3>
            <p style={cardText}>
              View issued payslips and download PDF copies when available.
            </p>
            <span style={openText}>Open</span>
          </div>
        </a>

        <a href="/employee/profile" style={link}>
          <div style={card}>
            <div style={cardIcon}>👤</div>
            <h3 style={cardTitle}>Profile Details</h3>
            <p style={cardText}>
              Check your employee number, job details, tax number, and payment method.
            </p>
            <span style={openText}>Open</span>
          </div>
        </a>

        <a href="/employee/notifications" style={link}>
          <div style={card}>
            <div style={cardIcon}>🔔</div>
            <h3 style={cardTitle}>Notifications</h3>
            <p style={cardText}>
              See payroll notices, payslip updates, HR reminders, and employer messages.
            </p>
            <span style={openText}>Open</span>
          </div>
        </a>

        <div style={disabledCard}>
          <div style={cardIcon}>🌿</div>
          <h3 style={cardTitle}>Leave Requests</h3>
          <p style={cardText}>
            Future access for leave balances, requests, and approval tracking.
          </p>
          <span style={comingSoon}>Coming soon</span>
        </div>

        <div style={disabledCard}>
          <div style={cardIcon}>⏱️</div>
          <h3 style={cardTitle}>Overtime</h3>
          <p style={cardText}>
            Future access for overtime requests, approval status, and payroll links.
          </p>
          <span style={comingSoon}>Coming soon</span>
        </div>

        <div style={disabledCard}>
          <div style={cardIcon}>📁</div>
          <h3 style={cardTitle}>Employee Documents</h3>
          <p style={cardText}>
            Future access for confirmations, records, contracts, and HR documents.
          </p>
          <span style={comingSoon}>Coming soon</span>
        </div>
      </section>
    </main>
  );
}

function capitalise(value: string) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const page: CSSProperties = {
  minHeight: "100vh",
  padding: "32px",
  fontFamily: "Arial, sans-serif",
  background: "#f4f7fb",
  color: "#102a43",
};

const loadingCard: CSSProperties = {
  padding: "24px",
  background: "#fff",
  border: "1px solid #e3e8ef",
  borderRadius: "18px",
};

const heroCard: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
  padding: "28px",
  borderRadius: "22px",
  color: "#fff",
  marginBottom: "24px",
  boxShadow: "0 16px 40px rgba(15, 118, 110, 0.18)",
};

const heroTopRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const homeButton: CSSProperties = {
  padding: "10px 16px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.14)",
  border: "1px solid rgba(255,255,255,0.22)",
  color: "#fff",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 700,
};

const logoutButton: CSSProperties = {
  padding: "10px 16px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.22)",
  background: "rgba(255,255,255,0.14)",
  color: "#fff",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};

const eyebrow: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  opacity: 0.9,
};

const title: CSSProperties = {
  fontSize: "30px",
  margin: "0 0 10px",
  lineHeight: 1.15,
};

const subtitle: CSSProperties = {
  maxWidth: "760px",
  fontSize: "15px",
  lineHeight: 1.6,
  margin: 0,
  opacity: 0.92,
};

const statusBadge: CSSProperties = {
  alignSelf: "flex-start",
  padding: "9px 13px",
  borderRadius: "999px",
  background: "rgba(255, 255, 255, 0.16)",
  border: "1px solid rgba(255, 255, 255, 0.28)",
  fontSize: "13px",
  fontWeight: 700,
};

const poweredBy: CSSProperties = {
  margin: 0,
  fontSize: "12px",
  opacity: 0.78,
};

const summaryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "18px",
  marginBottom: "28px",
};

const summaryCard: CSSProperties = {
  padding: "22px",
  borderRadius: "18px",
  background: "#fff",
  border: "1px solid #e3e8ef",
  boxShadow: "0 10px 24px rgba(16, 42, 67, 0.06)",
};

const summaryLabel: CSSProperties = {
  margin: "0 0 8px",
  color: "#60758a",
  fontSize: "13px",
  fontWeight: 700,
};

const summaryValue: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "20px",
  color: "#102a43",
};

const summaryText: CSSProperties = {
  margin: "0 0 16px",
  fontSize: "14px",
  lineHeight: 1.5,
  color: "#52616f",
};

const primaryButton: CSSProperties = {
  display: "inline-flex",
  padding: "10px 16px",
  borderRadius: "12px",
  background: "#0f766e",
  color: "#fff",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 700,
};

const secondaryButton: CSSProperties = {
  display: "inline-flex",
  padding: "10px 16px",
  borderRadius: "12px",
  background: "#eef7f6",
  color: "#0f766e",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 700,
};

const sectionHeader: CSSProperties = {
  marginBottom: "16px",
};

const sectionTitle: CSSProperties = {
  margin: "0 0 6px",
  fontSize: "21px",
};

const sectionText: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  color: "#60758a",
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "18px",
};

const link: CSSProperties = {
  textDecoration: "none",
  color: "inherit",
};

const card: CSSProperties = {
  minHeight: "175px",
  padding: "20px",
  border: "1px solid #e3e8ef",
  borderRadius: "18px",
  background: "#fff",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(16, 42, 67, 0.05)",
};

const disabledCard: CSSProperties = {
  minHeight: "175px",
  padding: "20px",
  border: "1px solid #e3e8ef",
  borderRadius: "18px",
  background: "#f9fbfd",
  opacity: 0.86,
};

const cardIcon: CSSProperties = {
  width: "42px",
  height: "42px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "14px",
  background: "#eef7f6",
  marginBottom: "14px",
  fontSize: "20px",
};

const cardTitle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "17px",
};

const cardText: CSSProperties = {
  margin: "0 0 16px",
  fontSize: "14px",
  lineHeight: 1.5,
  color: "#52616f",
};

const openText: CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#0f766e",
};

const comingSoon: CSSProperties = {
  display: "inline-flex",
  padding: "7px 10px",
  borderRadius: "999px",
  background: "#eef2f7",
  color: "#52616f",
  fontSize: "12px",
  fontWeight: 700,
};