"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
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
  default_payment_day?: number | null;
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
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [pendingChangeRequests, setPendingChangeRequests] = useState(0);
  const [missingDocuments, setMissingDocuments] = useState(0);

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
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup failed", profileError);
    }

    let businessRecord: Business | null = null;

    if (profile?.business_id) {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", profile.business_id)
        .maybeSingle();

      if (error) {
        console.error("Business lookup by profile failed", error);
      }

      businessRecord = data;
    }

    if (!businessRecord) {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("employer_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Business lookup by employer failed", error);
      }

      businessRecord = data;
    }

    if (!businessRecord && user.email) {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("email", user.email)
        .maybeSingle();

      if (error) {
        console.error("Business lookup by email failed", error);
      }

      businessRecord = data;
    }

    if (businessRecord?.id && profile?.business_id !== businessRecord.id) {
      await supabase
        .from("profiles")
        .update({ business_id: businessRecord.id })
        .eq("id", user.id);
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
    const employeeIds = (data || []).map((employee) => employee.id);
    if (employeeIds.length > 0) {
      const { data: documents } = await supabase.from("employee_documents").select("employee_id").in("employee_id", employeeIds);
      const employeesWithDocuments = new Set((documents || []).map((document) => document.employee_id));
      setMissingDocuments((data || []).filter((employee) => !["terminated", "inactive"].includes(String(employee.status || employee.employment_status || "active").toLowerCase()) && !employeesWithDocuments.has(employee.id)).length);
    } else {
      setMissingDocuments(0);
    }
    const { count } = await supabase.from("approval_requests").select("id", { count: "exact", head: true }).eq("business_id", businessRecord.id).eq("status", "Pending");
    setPendingApprovals(count || 0);
    const { count: changeRequestCount } = await supabase.from("employee_change_requests").select("id", { count: "exact", head: true }).eq("business_id", businessRecord.id).eq("status", "Pending");
    setPendingChangeRequests(changeRequestCount || 0);
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

  const employeesTerminated = useMemo(() => {
    return employees.filter((employee) => {
      const status = (employee.status || employee.employment_status || "")
        .trim()
        .toLowerCase();

      return status === "terminated";
    }).length;
  }, [employees]);

  const nextPayrollDate = useMemo(() => {
    const paymentDay = Math.min(Math.max(Number(business?.default_payment_day || 0), 1), 28);
    if (!business?.default_payment_day) return "Not set";
    const today = new Date();
    const candidate = new Date(today.getFullYear(), today.getMonth(), paymentDay);
    if (candidate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) candidate.setMonth(candidate.getMonth() + 1);
    return candidate.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
  }, [business?.default_payment_day]);

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

          <div style={brandText}>
            <h1 style={businessTitle}>{businessName}</h1>
            <h2 style={dashboardTitle}>Workplace overview</h2>

            <p style={subtitle}>
              Staff, payroll and business settings.
            </p>
          </div>
        </div>
      </section>

      {message && <div style={notice}>{message}</div>}

      <section style={overviewBox}>
        <div style={overviewHeader}>
          <h2 style={overviewTitle}>Workforce Summary</h2>
          <button style={refreshButton} onClick={loadDashboard} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div style={overviewGrid}>
          <OverviewCard label="Employees" value={String(totalEmployees)} />
          <OverviewCard label="On Leave" value={String(employeesOnLeave)} />
          <OverviewCard label="Terminated" value={String(employeesTerminated)} />
          <OverviewCard label="Next payroll date" value={nextPayrollDate} />
        </div>
        <div style={attentionHeader}>
          <h2 style={attentionTitle}>Needs attention</h2>
          <Link href="/employer/tasks" style={taskLink}>All tasks</Link>
        </div>
        <div style={overviewGrid}>
          <Link href="/employer/hr/documents" style={todoCard}><span style={overviewValue}>{String(missingDocuments)}</span><p style={overviewLabel}>Missing documents</p></Link>
          <Link href="/employer/hr/approvals" style={todoCard}><span style={overviewValue}>{String(pendingApprovals)}</span><p style={overviewLabel}>HR approvals</p></Link>
          <Link href="/employer/change-requests" style={todoCard}><span style={overviewValue}>{String(pendingChangeRequests)}</span><p style={overviewLabel}>Profile changes</p></Link>
        </div>
      </section>

      <section style={moduleSection}>
        <div style={moduleGrid}>
          <DashboardCard title="Employees" description="Profiles, employment and pay details." href="/employer/employees" />
          <DashboardCard title="HR" description="Documents, records, policies and approvals." href="/employer/hr" />
          <DashboardCard title="Payroll" description="Payslips, runs and payment records." href="/employer/payroll" />
          <DashboardCard title="Reports" description="Payroll, staff and compliance reports." href="/employer/reports" />
          <DashboardCard title="Settings" description="Business, payroll and account access." href="/employer/settings" />
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
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href} style={cardLink}>
      <article style={card}>
        <h2 style={cardTitle}>{title}</h2>
        <p style={cardText}>{description}</p>

        <div style={cardFooter}>
          <span style={openPill}>Open</span>
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
  gap: "14px",
  flexWrap: "wrap" as const,
};

const brandText = {
  flex: "1 1 220px",
  minWidth: 0,
};

const logoBox = {
  width: "72px",
  height: "72px",
  borderRadius: "18px",
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
  width: "72px",
  height: "72px",
  borderRadius: "18px",
  background: "#0f766e",
  color: "#ffffff",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
  fontWeight: 900,
  boxShadow: "0 14px 32px rgba(15, 23, 42, 0.08)",
};

const businessTitle = {
  color: "#0f766e",
  fontSize: "clamp(24px, 5vw, 30px)",
  lineHeight: 1.08,
  margin: "0 0 8px",
  fontWeight: 800,
  overflowWrap: "anywhere" as const,
};

const dashboardTitle = {
  color: "#0f172a",
  fontSize: "17px",
  margin: "0 0 6px",
  fontWeight: 700,
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
  gap: "12px",
};

const moduleSection = { marginBottom: "22px" };
const moduleHeader = { borderBottom: "1px solid #dce6ee", marginBottom: "10px", paddingBottom: "7px" };
const moduleTitle = { margin: 0, color: "#334155", fontSize: "15px", fontWeight: 800 };

const cardLink = {
  textDecoration: "none",
  color: "inherit",
  display: "block",
  height: "100%",
};

const card: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "16px",
  minHeight: "140px",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.05)",
};

const cardTitle = {
  color: "#0f172a",
  fontSize: "17px",
  margin: "0 0 6px",
  fontWeight: 800,
};

const cardText = {
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.4,
  margin: 0,
};

const cardFooter = {
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
  marginTop: "auto",
  paddingTop: "12px",
};

const openPill = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#ecfeff",
  color: "#0f766e",
  border: "1px solid #99f6e4",
  borderRadius: "999px",
  padding: "5px 10px",
  fontSize: "12px",
  fontWeight: 800,
};

const overviewBox = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "14px 16px",
  marginBottom: "18px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.05)",
};

const overviewHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  marginBottom: "10px",
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
  fontSize: "18px",
  margin: 0,
  fontWeight: 900,
};

const refreshButton = {
  background: "#ecfeff",
  color: "#0f766e",
  border: "1px solid #99f6e4",
  padding: "7px 11px",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: 800,
};

const overviewGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
  gap: "10px",
};

const overviewCard = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "11px",
  padding: "10px 12px",
};

const overviewValue = {
  display: "block",
  color: "#0f766e",
  fontSize: "22px",
  fontWeight: 900,
};

const overviewLabel = {
  margin: "3px 0 0",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 700,
};

const attentionHeader = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", margin: "16px 0 9px" };
const attentionTitle = { margin: 0, color: "#334155", fontSize: "14px", fontWeight: 800 };
const taskLink = { color: "#0f766e", textDecoration: "none", fontSize: "12px", fontWeight: 800 };

const todoCard = { ...overviewCard, textDecoration: "none", display: "block", border: "1px solid #99f6e4" };
