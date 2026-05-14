"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type DashboardData = {
  employeeName: string;
  employerName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
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
        full_name
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

    setData({
      employeeName: employee.full_name,
      employerName:
        business?.trading_name || business?.business_name || "Your Employer",
      logoUrl: business?.logo_url || null,
      primaryColor: business?.primary_color || "#0f766e",
      secondaryColor: business?.secondary_color || "#123c69",
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
      <div style={topActions}>
        <a href="/" style={topLink}>
          Home
        </a>
        <span style={divider}>|</span>
        <button onClick={handleLogout} style={logoutLink}>
          Logout
        </button>
      </div>

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
              <h1 style={businessName}>{data.employerName}</h1>
              <h2 style={dashboardTitle}>Employee Dashboard</h2>

              <p style={subtitle}>
                Welcome back, {data.employeeName}. Access your employee profile,
                payslips, leave requests, overtime records, HR records and
                disciplinary records from one organised workspace.
              </p>
            </div>
          </div>
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

const page: CSSProperties = {
  minHeight: "100vh",
  padding: "72px 32px 32px",
  fontFamily: "Arial, sans-serif",
  background: "#f4f7fb",
  color: "#111827",
  position: "relative",
};

const topActions: CSSProperties = {
  position: "absolute",
  top: "22px",
  right: "34px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  zIndex: 10,
};

const topLink: CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#0f172a",
  fontSize: "12px",
  fontWeight: 700,
  textDecoration: "none",
};

const logoutLink: CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#0f172a",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
  padding: 0,
};

const divider: CSSProperties = {
  color: "#94a3b8",
  fontSize: "12px",
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
  padding: "52px 32px",
  borderRadius: "28px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  marginBottom: "34px",
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

const businessName: CSSProperties = {
  margin: 0,
  fontSize: "42px",
  lineHeight: 1.1,
  fontWeight: 800,
  color: "#0f766e",
  letterSpacing: "-0.03em",
};

const dashboardTitle: CSSProperties = {
  margin: "12px 0 0",
  fontSize: "26px",
  lineHeight: 1.2,
  fontWeight: 800,
  color: "#111827",
};

const subtitle: CSSProperties = {
  maxWidth: "850px",
  fontSize: "16px",
  lineHeight: 1.65,
  margin: "18px 0 0",
  color: "#5f6f82",
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