"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type Business = {
  id: string;
  employer_id?: string | null;
  business_name?: string | null;
  trading_name?: string | null;
  registered_name?: string | null;
  name?: string | null;
  logo_url?: string | null;
  status?: string | null;
};

type Employee = {
  id: string;
  business_id?: string | null;
  basic_salary?: number | null;
  salary?: number | null;
  employment_status?: string | null;
  status?: string | null;
};

export default function EmployerDashboard() {
  const router = useRouter();

  const [business, setBusiness] = useState<Business | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function getEmployerBusiness() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.business_id) {
      console.error("Profile lookup failed", profileError);
      return null;
    }

    const { data: businessRecord, error: businessError } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", profile.business_id)
      .single();

    if (businessError) {
      console.error("Business lookup failed", businessError);
      return null;
    }

    return businessRecord;
  }

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    const businessRecord = await getEmployerBusiness();

    if (!businessRecord?.id) {
      setBusiness(null);
      setEmployees([]);
      setMessage(
        "Business profile not found. Please complete employer settings first."
      );
      setLoading(false);
      return;
    }

    if (businessRecord.status === "suspended") {
      await supabase.auth.signOut();
      setMessage(
        "Your WageFlow account has been suspended. Please contact support."
      );
      setLoading(false);
      router.push("/login");
      return;
    }

    if (businessRecord.status === "archived") {
      await supabase.auth.signOut();
      setMessage("This WageFlow business account has been archived.");
      setLoading(false);
      router.push("/login");
      return;
    }

    if (businessRecord.status === "deleted") {
      await supabase.auth.signOut();
      setMessage("This WageFlow business account is no longer active.");
      setLoading(false);
      router.push("/login");
      return;
    }

    setBusiness(businessRecord);

    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("business_id", businessRecord.id)
      .order("created_at", { ascending: false });

    if (error) {
      setEmployees([]);
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setEmployees(data || []);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const businessName =
    business?.trading_name ||
    business?.business_name ||
    business?.registered_name ||
    business?.name ||
    "Kaone Cleaning Services";

  const totalEmployees = employees.length;

  const employeesOnLeave = useMemo(() => {
    return employees.filter((employee) => {
      const status = (employee.status || employee.employment_status || "")
        .trim()
        .toLowerCase();

      return status === "on_leave" || status === "on leave" || status === "leave";
    }).length;
  }, [employees]);

  const employeesAbsentToday = useMemo(() => {
    return employees.filter((employee) => {
      const status = (employee.status || employee.employment_status || "")
        .trim()
        .toLowerCase();

      return status === "absent" || status === "absent_today";
    }).length;
  }, [employees]);

  return (
    <main style={page}>
      <section style={hero}>
        <div style={topRightNav}>
          <Link href="/" style={topNavLink}>
            Home
          </Link>

          <span style={divider}>|</span>

          <button onClick={handleLogout} style={topNavButton}>
            Logout
          </button>
        </div>

        <div style={brandBlock}>
          <Logo logoUrl={business?.logo_url || ""} businessName={businessName} />

          <div>
            <h1 style={businessTitle}>{businessName}</h1>
            <h2 style={dashboardTitle}>Employer Dashboard</h2>

            <p style={subtitle}>
              Employer dashboard for managing employees, payroll, HR records,
              approvals and business settings from one organised workspace.
            </p>
          </div>
        </div>
      </section>

      {message && <div style={notice}>{message}</div>}

      <section style={moduleGrid}>
        <DashboardCard
          icon="👥"
          title="Employees"
          description="Add and manage employee profiles, job details, salary information, bank details and employment records."
          href="/employer/employees"
          tag="Staff Records"
        />

        <DashboardCard
          icon="💰"
          title="Payroll"
          description="Generate payslips, view payroll history, manage payslip records and review payroll totals."
          href="/employer/payroll"
          tag="Payroll Workspace"
        />

        <DashboardCard
          icon="🗂️"
          title="HR Records"
          description="Manage leave records, employee documents, warnings, confirmations of employment and HR notes."
          href="/employer/hr"
          tag="HR Records"
        />

        <DashboardCard
          icon="📑"
          title="Reports"
          description="Generate payroll, employee, compliance, salary confirmation and business reports."
          href="/employer/reports"
          tag="Reports"
        />

        <DashboardCard
          icon="⚙️"
          title="Settings"
          description="Configure company details, branding, PAYE, UIF and payment preferences."
          href="/employer/settings"
          tag="Business Setup"
        />
      </section>

      <section style={overviewBox}>
        <div style={overviewHeader}>
          <div>
            <p style={overviewEyebrow}>Workforce Overview</p>
            <h2 style={overviewTitle}>Employees & Attendance</h2>
          </div>

          <button style={refreshButton} onClick={loadDashboard} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div style={overviewGrid}>
          <OverviewCard label="Total Employees" value={String(totalEmployees)} />
          <OverviewCard label="On Leave" value={String(employeesOnLeave)} />
          <OverviewCard label="Absent Today" value={String(employeesAbsentToday)} />
        </div>
      </section>
    </main>
  );
}

function Logo({
  logoUrl,
  businessName,
}: {
  logoUrl: string;
  businessName: string;
}) {
  if (logoUrl) {
    return (
      <div style={logoBox}>
        <img src={logoUrl} alt={`${businessName} logo`} style={logoImage} />
      </div>
    );
  }

  return (
    <div style={logoFallback}>
      {businessName
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()}
    </div>
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
    <Link href={href} style={cardLink}>
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
    </Link>
  );
}

function OverviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={overviewCard}>
      <span style={overviewValue}>{value}</span>
      <p style={overviewLabel}>{label}</p>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  padding: "40px",
  fontFamily: "Arial, sans-serif",
  background: "#f4f8fb",
  color: "#0f172a",
};

const hero = {
  position: "relative" as const,
  display: "flex",
  flexDirection: "column" as const,
  gap: "24px",
  marginBottom: "28px",
  paddingTop: "24px",
};

const topRightNav = {
  position: "absolute" as const,
  top: "0",
  right: "0",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "14px",
  fontWeight: 500,
};

const topNavLink = {
  color: "#1f4f4f",
  textDecoration: "underline",
  fontSize: "14px",
  fontWeight: 500,
};

const topNavButton = {
  background: "none",
  border: "none",
  padding: 0,
  color: "#333",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 500,
};

const divider = {
  color: "#999",
};

const brandBlock = {
  display: "flex",
  alignItems: "center",
  gap: "24px",
};

const logoBox = {
  width: "132px",
  height: "132px",
  borderRadius: "26px",
  background: "#ffffff",
  border: "1px solid #dbeafe",
  overflow: "hidden",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 14px 32px rgba(15, 23, 42, 0.08)",
};

const logoImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
};

const logoFallback = {
  width: "132px",
  height: "132px",
  borderRadius: "26px",
  background: "#0f766e",
  color: "#ffffff",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "38px",
  fontWeight: 900,
  boxShadow: "0 14px 32px rgba(15, 23, 42, 0.08)",
};

const businessTitle = {
  color: "#0f766e",
  fontSize: "40px",
  margin: "0 0 8px",
  fontWeight: 900,
};

const dashboardTitle = {
  color: "#0f172a",
  fontSize: "24px",
  margin: "0 0 10px",
  fontWeight: 800,
};

const subtitle = {
  maxWidth: "760px",
  color: "#64748b",
  fontSize: "15px",
  lineHeight: 1.6,
  margin: 0,
};

const notice = {
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  color: "#9a3412",
  padding: "14px 16px",
  borderRadius: "14px",
  marginBottom: "20px",
  fontWeight: 700,
};

const moduleGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "18px",
  marginBottom: "22px",
};

const cardLink = {
  textDecoration: "none",
  color: "inherit",
};

const card = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "22px",
  padding: "22px",
  minHeight: "210px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.05)",
};

const cardTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "18px",
};

const iconBox = {
  width: "44px",
  height: "44px",
  borderRadius: "14px",
  background: "#ecfeff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
};

const tagStyle = {
  background: "#f1f5f9",
  color: "#475569",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 800,
};

const cardTitle = {
  color: "#0f172a",
  fontSize: "20px",
  margin: "0 0 10px",
  fontWeight: 900,
};

const cardText = {
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.55,
  margin: 0,
};

const cardFooter = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: "22px",
  color: "#0f766e",
  fontWeight: 800,
};

const overviewBox = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "22px",
  padding: "24px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.05)",
};

const overviewHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  marginBottom: "18px",
};

const overviewEyebrow = {
  color: "#0f766e",
  fontWeight: 800,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  fontSize: "12px",
  margin: "0 0 8px",
};

const overviewTitle = {
  color: "#0f172a",
  fontSize: "22px",
  margin: 0,
};

const refreshButton = {
  background: "#ecfeff",
  color: "#0f766e",
  border: "1px solid #99f6e4",
  padding: "9px 14px",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: 800,
};

const overviewGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "16px",
};

const overviewCard = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "18px",
};

const overviewValue = {
  display: "block",
  color: "#0f766e",
  fontSize: "30px",
  fontWeight: 900,
};

const overviewLabel = {
  margin: "8px 0 0",
  color: "#64748b",
  fontSize: "14px",
  fontWeight: 700,
};