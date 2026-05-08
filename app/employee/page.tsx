"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type DashboardData = {
  employeeName: string;
  employeeStatus: string;
  employerName: string;
  primaryColor: string;
  secondaryColor: string;
  latestPayslip: {
    id: string;
    payroll_month: string | null;
    pay_period_month: string | number | null;
    pay_period_year: string | number | null;
    net_pay: number | null;
    status: string | null;
    created_at: string | null;
  } | null;
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

  function payslipPeriod(
    payslip: DashboardData["latestPayslip"]
  ) {
    if (!payslip) return "Not issued yet";

    if (payslip.payroll_month) return payslip.payroll_month;

    if (payslip.pay_period_month && payslip.pay_period_year) {
      return `${payslip.pay_period_month}/${payslip.pay_period_year}`;
    }

    return "Payroll period not set";
  }

  async function loadDashboard() {
    setLoading(true);
    setDebugInfo(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log("Logged in user:", user);
    console.log("User error:", userError);

    if (userError || !user) {
      router.push("/login");
      return;
    }

    const { data: account, error: accountError } = await supabase
      .from("employee_accounts")
      .select("id, employee_id, auth_user_id, portal_enabled")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    console.log("Employee account:", account);
    console.log("Employee account error:", accountError);

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
        message:
          "No employee account is linked to the currently logged-in user.",
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
        employment_status,
        position,
        department,
        leave_balance,
        overtime_enabled
      `
      )
      .eq("id", account.employee_id)
      .maybeSingle();

    console.log("Employee record:", employee);
    console.log("Employee lookup error:", employeeError);

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

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select(
        `
        id,
        business_name,
        trading_name,
        primary_color,
        secondary_color,
        logo_url,
        show_leave_balances
      `
      )
      .eq("id", employee.business_id)
      .maybeSingle();

    console.log("Business record:", business);
    console.log("Business lookup error:", businessError);

    const { data: latestPayslip, error: payslipError } = await supabase
      .from("payslips")
      .select(
        `
        id,
        payroll_month,
        pay_period_month,
        pay_period_year,
        net_pay,
        status,
        created_at
      `
      )
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("Latest payslip:", latestPayslip);
    console.log("Latest payslip error:", payslipError);

    const { count: unreadCount, error: notificationError } = await supabase
      .from("payslip_notifications")
      .select("*", { count: "exact", head: true })
      .eq("employee_id", employee.id)
      .eq("is_read", false);

    console.log("Unread notifications:", unreadCount);
    console.log("Notification count error:", notificationError);

    setData({
      employeeName: employee.full_name,
      employeeStatus: employee.employment_status || employee.status || "active",
      employerName:
        business?.trading_name || business?.business_name || "Your Employer",
      primaryColor: business?.primary_color || "#0f766e",
      secondaryColor: business?.secondary_color || "#123c69",
      latestPayslip: latestPayslip || null,
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
        <div style={loadingCard}>Loading employee portal...</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main style={page}>
        <div style={loadingCard}>
          <h2 style={{ marginTop: 0 }}>Employee portal access issue</h2>

          <p>
            The page could not load the employee dashboard. Below is the exact
            reason returned by the page.
          </p>

          <div style={debugBox}>
            <p>
              <strong>Reason:</strong> {debugInfo?.message || "Unknown issue"}
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
            {data.latestPayslip
              ? payslipPeriod(data.latestPayslip)
              : "Not issued yet"}
          </h2>

          <p style={summaryText}>
            {data.latestPayslip
              ? `Net pay: R${Number(data.latestPayslip.net_pay || 0).toFixed(2)}`
              : "Your most recent payslip will appear here once your employer issues it."}
          </p>

          <a href="/employee/payslips" style={primaryButton}>
            Open
          </a>
        </div>

        <div style={summaryCard}>
          <p style={summaryLabel}>Notifications</p>

          <h2 style={summaryValue}>{data.unreadNotifications} unread</h2>

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
              Check your employee number, job details, tax number, and payment
              method.
            </p>
            <span style={openText}>Open</span>
          </div>
        </a>

        <a href="/employee/notifications" style={link}>
          <div style={card}>
            <div style={cardIcon}>🔔</div>
            <h3 style={cardTitle}>Notifications</h3>
            <p style={cardText}>
              See payroll notices, payslip updates, HR reminders, and employer
              messages.
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
            Future access for overtime requests, approval status, and payroll
            links.
          </p>
          <span style={comingSoon}>Coming soon</span>
        </div>

        <div style={disabledCard}>
          <div style={cardIcon}>📁</div>
          <h3 style={cardTitle}>Employee Documents</h3>
          <p style={cardText}>
            Future access for confirmations, records, contracts, and HR
            documents.
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

const debugBox: CSSProperties = {
  marginTop: "16px",
  padding: "16px",
  borderRadius: "14px",
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
  color: "#fff",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
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