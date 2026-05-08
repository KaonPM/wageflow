"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type DashboardData = {
  employeeName: string;
  employeeStatus: string;
  employerName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  unreadNotifications: number;
};

type DebugInfo = {
  message: string;
  userId?: string;
  userEmail?: string;
  account?: unknown;
  error?: unknown;
};

export default function EmployeeDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setDebugInfo(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return;
    }

    const { data: account, error: accountError } = await supabase
      .from("employee_accounts")
      .select("id, employee_id, auth_user_id, portal_enabled")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (accountError) {
      setDebugInfo({
        message: "Supabase could not read the employee account record.",
        userId: user.id,
        userEmail: user.email,
        error: accountError,
      });

      setData(null);
      setLoading(false);
      return;
    }

    if (!account) {
      setDebugInfo({
        message: "No employee account is linked to the currently logged-in user.",
        userId: user.id,
        userEmail: user.email,
        account,
      });

      setData(null);
      setLoading(false);
      return;
    }

    if (account.portal_enabled !== true) {
      setDebugInfo({
        message:
          "The employee account exists, but portal_enabled is not set to true.",
        userId: user.id,
        userEmail: user.email,
        account,
      });

      setData(null);
      setLoading(false);
      return;
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select(
        `
        id,
        business_id,
        full_name,
        status,
        employment_status
      `
      )
      .eq("id", account.employee_id)
      .maybeSingle();

    if (employeeError || !employee) {
      setDebugInfo({
        message:
          "The portal account exists, but the linked employee record could not be loaded.",
        userId: user.id,
        userEmail: user.email,
        account,
        error: employeeError,
      });

      setData(null);
      setLoading(false);
      return;
    }

    const { data: business } = await supabase
      .from("businesses")
      .select(
        `
        id,
        business_name,
        trading_name,
        primary_color,
        secondary_color,
        logo_url
      `
      )
      .eq("id", employee.business_id)
      .maybeSingle();

    const { count: unreadCount } = await supabase
      .from("payslip_notifications")
      .select("*", { count: "exact", head: true })
      .eq("employee_id", employee.id)
      .eq("is_read", false);

    setData({
      employeeName: employee.full_name,
      employeeStatus: employee.employment_status || employee.status || "active",
      employerName:
        business?.trading_name || business?.business_name || "Your Employer",
      logoUrl: business?.logo_url || null,
      primaryColor: business?.primary_color || "#0f766e",
      secondaryColor: business?.secondary_color || "#123c69",
      unreadNotifications: unreadCount || 0,
    });

    await supabase
      .from("employee_accounts")
      .update({
        last_login: new Date().toISOString(),
      })
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
        <div style={shell}>
          <div style={loadingCard}>Loading employee portal...</div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main style={page}>
        <div style={shell}>
          <div style={loadingCard}>
            <h2 style={{ marginTop: 0 }}>Employee portal access issue</h2>

            <p>
              The page could not load the employee dashboard. Below is the exact
              reason returned by the page.
            </p>

            <div style={debugBox}>
              <p>
                <strong>Reason:</strong>{" "}
                {debugInfo?.message || "Unknown issue"}
              </p>

              <p>
                <strong>Logged-in email:</strong>{" "}
                {debugInfo?.userEmail || "Not available"}
              </p>

              <p>
                <strong>Logged-in user ID:</strong>{" "}
                {debugInfo?.userId || "Not available"}
              </p>

              <pre style={preStyle}>
                {JSON.stringify(
                  {
                    account: debugInfo?.account,
                    error: debugInfo?.error,
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            <button onClick={loadDashboard} style={retryButton}>
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={shell}>
        <section style={heroCard}>
          <div style={heroLayout}>
            <div style={logoWrap}>
              {data.logoUrl ? (
                <img src={data.logoUrl} alt={data.employerName} style={logo} />
              ) : (
                <span style={logoInitial}>{data.employerName.charAt(0)}</span>
              )}
            </div>

            <div style={heroContent}>
              <div style={heroTopRow}>
                <div>
                  <h1 style={businessName}>{data.employerName}</h1>
                  <h2 style={dashboardTitle}>Employee Dashboard</h2>
                </div>

                <div style={topActions}>
                  <a href="/" style={homeButton}>
                    Home
                  </a>

                  <button onClick={handleLogout} style={logoutButton}>
                    Logout
                  </button>
                </div>
              </div>

              <p style={subtitle}>
                Welcome back, {data.employeeName}. Access your employee profile,
                payslips, leave requests, overtime records, HR records and
                disciplinary records from one organised workspace.
              </p>

              <div style={statusRow}>
                <div style={statusBadge}>
                  Employee Status: {capitalise(data.employeeStatus)}
                </div>

                <div style={statusBadge}>
                  {data.unreadNotifications} unread notification
                  {data.unreadNotifications === 1 ? "" : "s"}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section style={sectionHeader}>
          <h2 style={sectionTitle}>Employee Dashboard</h2>

          <p style={sectionText}>
            Use the cards below to manage your employee records, payroll
            information and HR requests.
          </p>
        </section>

        <section style={grid}>
          <DashboardCard
            icon="👤"
            eyebrow="My Details"
            title="Employee Profile"
            description="View your personal details, job details, banking information, emergency contact and employee profile records."
            href="/employee/profile"
          />

          <DashboardCard
            icon="📄"
            eyebrow="Payroll"
            title="My Payslips"
            description="View issued payslips, payment dates, net pay, payment method and PDF copies when available."
            href="/employee/payslips"
          />

          <DashboardCard
            icon="🌿"
            eyebrow="Leave"
            title="Manage Leave"
            description="Submit leave requests, view leave history and track pending, approved or declined requests."
            href="/employee/leave"
          />

          <DashboardCard
            icon="⏱️"
            eyebrow="Overtime"
            title="Manage Overtime"
            description="Submit overtime requests, view overtime history and track approval status."
            href="/employee/overtime"
          />

          <DashboardCard
            icon="🗂️"
            eyebrow="HR"
            title="HR Records"
            description="View shared HR records, leave records, employment notes and records linked to your profile."
            href="/employee/hr-records"
          />

        </section>
      </div>
    </main>
  );
}

function DashboardCard({
  icon,
  eyebrow,
  title,
  description,
  href,
}: {
  icon: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a href={href} style={link}>
      <div style={card}>
        <div style={cardIcon}>{icon}</div>

        <p style={cardEyebrow}>{eyebrow}</p>

        <h3 style={cardTitle}>{title}</h3>

        <p style={cardText}>{description}</p>

        <div style={cardFooter}>
          <span style={openText}>Open</span>
          <span style={arrow}>→</span>
        </div>
      </div>
    </a>
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
  color: "#111827",
};

const shell: CSSProperties = {
  width: "100%",
  maxWidth: "1180px",
  margin: "0 auto",
};

const loadingCard: CSSProperties = {
  padding: "24px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "24px",
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)",
};

const debugBox: CSSProperties = {
  marginTop: "16px",
  padding: "16px",
  borderRadius: "16px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const preStyle: CSSProperties = {
  whiteSpace: "pre-wrap",
  overflowX: "auto",
  padding: "12px",
  borderRadius: "12px",
  background: "#0f172a",
  color: "#e2e8f0",
  fontSize: "12px",
};

const retryButton: CSSProperties = {
  marginTop: "16px",
  padding: "10px 16px",
  borderRadius: "12px",
  border: "none",
  background: "#0f766e",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};

const heroCard: CSSProperties = {
  padding: "32px",
  borderRadius: "28px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  marginBottom: "28px",
  boxShadow: "0 18px 45px rgba(15, 23, 42, 0.07)",
};

const heroLayout: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "120px 1fr",
  gap: "28px",
  alignItems: "center",
};

const logoWrap: CSSProperties = {
  width: "120px",
  height: "120px",
  borderRadius: "28px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
};

const logo: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  padding: "10px",
};

const logoInitial: CSSProperties = {
  fontSize: "42px",
  fontWeight: 800,
  color: "#0f766e",
};

const heroContent: CSSProperties = {
  minWidth: 0,
};

const heroTopRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
};

const businessName: CSSProperties = {
  margin: 0,
  fontSize: "38px",
  lineHeight: 1.1,
  fontWeight: 800,
  color: "#0f766e",
  letterSpacing: "-0.03em",
};

const dashboardTitle: CSSProperties = {
  margin: "10px 0 0",
  fontSize: "24px",
  lineHeight: 1.2,
  fontWeight: 800,
  color: "#111827",
};

const topActions: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};

const homeButton: CSSProperties = {
  padding: "10px 16px",
  borderRadius: "14px",
  background: "#0f766e",
  border: "1px solid #0f766e",
  color: "#ffffff",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 700,
};

const logoutButton: CSSProperties = {
  padding: "10px 16px",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  color: "#111827",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};

const subtitle: CSSProperties = {
  maxWidth: "820px",
  fontSize: "16px",
  lineHeight: 1.65,
  margin: "18px 0 0",
  color: "#5f6f82",
};

const statusRow: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "22px",
};

const statusBadge: CSSProperties = {
  padding: "10px 16px",
  borderRadius: "999px",
  background: "#f3f4f6",
  color: "#111827",
  fontWeight: 700,
  fontSize: "13px",
  border: "1px solid #e5e7eb",
};

const sectionHeader: CSSProperties = {
  marginBottom: "16px",
};

const sectionTitle: CSSProperties = {
  margin: "0 0 6px",
  fontSize: "18px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#334155",
};

const sectionText: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  color: "#64748b",
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "20px",
};

const link: CSSProperties = {
  textDecoration: "none",
  color: "inherit",
};

const card: CSSProperties = {
  minHeight: "220px",
  padding: "24px",
  border: "1px solid #e5e7eb",
  borderRadius: "24px",
  background: "#ffffff",
  cursor: "pointer",
  boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
  display: "flex",
  flexDirection: "column",
};

const cardIcon: CSSProperties = {
  width: "42px",
  height: "42px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "14px",
  background: "#eef7f6",
  marginBottom: "16px",
  fontSize: "20px",
};

const cardEyebrow: CSSProperties = {
  margin: "0 0 10px",
  fontSize: "13px",
  fontWeight: 800,
  color: "#0f766e",
};

const cardTitle: CSSProperties = {
  margin: "0 0 10px",
  fontSize: "22px",
  lineHeight: 1.2,
  fontWeight: 500,
  color: "#111827",
};

const cardText: CSSProperties = {
  margin: "0 0 18px",
  fontSize: "14px",
  lineHeight: 1.55,
  color: "#5f6f82",
};

const cardFooter: CSSProperties = {
  marginTop: "auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const openText: CSSProperties = {
  fontSize: "15px",
  fontWeight: 800,
  color: "#0f766e",
};

const arrow: CSSProperties = {
  fontSize: "18px",
  color: "#94a3b8",
};