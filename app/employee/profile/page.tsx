"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type EmployeeProfile = {
  id: string;
  business_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  employee_number: string | null;
  id_number: string | null;
  phone: string | null;
  email: string | null;
  position: string | null;
  department: string | null;
  employment_type: string | null;
  employment_status: string | null;
  status: string | null;
  start_date: string | null;
  salary_type: string | null;
  pay_frequency: string | null;
  payment_method: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_type: string | null;
  tax_number: string | null;
  uif_number: string | null;
  uif_registered: boolean | null;
  overtime_enabled: boolean | null;
  leave_balance: number | null;
};

type BusinessProfile = {
  business_name: string | null;
  trading_name: string | null;
  registration_number: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  show_leave_balances: boolean | null;
};

export default function EmployeeProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [message, setMessage] = useState("");
  const [openSection, setOpenSection] = useState("personal");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setMessage("");

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

    if (accountError || !account || account.portal_enabled !== true) {
      setMessage("Your employee portal access is not active.");
      setLoading(false);
      return;
    }

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select(
        `
        id,
        business_id,
        full_name,
        first_name,
        last_name,
        employee_number,
        id_number,
        phone,
        email,
        position,
        department,
        employment_type,
        employment_status,
        status,
        start_date,
        salary_type,
        pay_frequency,
        payment_method,
        bank_name,
        account_number,
        account_type,
        tax_number,
        uif_number,
        uif_registered,
        overtime_enabled,
        leave_balance
      `
      )
      .eq("id", account.employee_id)
      .maybeSingle();

    if (employeeError || !employeeData) {
      setMessage("Could not load your employee profile.");
      setLoading(false);
      return;
    }

    setEmployee(employeeData);

    const { data: businessData } = await supabase
      .from("businesses")
      .select(
        `
        business_name,
        trading_name,
        registration_number,
        contact_person,
        email,
        phone,
        primary_color,
        secondary_color,
        show_leave_balances
      `
      )
      .eq("id", employeeData.business_id)
      .maybeSingle();

    setBusiness(businessData || null);
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
          <div style={messageCard}>Loading profile details...</div>
        </div>
      </main>
    );
  }

  if (message || !employee) {
    return (
      <main style={page}>
        <div style={shell}>
          <div style={messageCard}>{message || "Profile unavailable."}</div>
        </div>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={shell}>
        <section style={heroCard}>
          <div style={heroTopRow}>
            <div>
              <h1 style={businessName}>
                {business?.trading_name ||
                  business?.business_name ||
                  "Employee Portal"}
              </h1>

              <h2 style={dashboardTitle}>My Profile</h2>
            </div>

            <div style={topActions}>
              <a href="/employee" style={primaryButton}>
                 ← Back to Dashboard
              </a>

              <a href="/" style={secondaryButton}>
                Home
              </a>

              <button onClick={handleLogout} style={secondaryButton}>
                Logout
              </button>
            </div>
          </div>

          <p style={subtitle}>
            View your personal, employment, payroll, tax and HR information.
            This profile is read-only and managed by your employer.
          </p>
        </section>

        <section style={summaryGrid}>
          <SummaryCard
            label="Employee"
            value={employee.full_name || "Not provided"}
            text={employee.position || "Position not provided"}
          />

          <SummaryCard
            label="Employee Status"
            value={capitalise(
              employee.employment_status || employee.status || "active"
            )}
            text={`Employee No: ${employee.employee_number || "Not provided"}`}
          />

          <SummaryCard
            label="HR Snapshot"
            value={
              business?.show_leave_balances === false
                ? "Leave hidden"
                : `${employee.leave_balance || 0} days leave`
            }
            text={`Overtime: ${
              employee.overtime_enabled ? "Enabled" : "Not enabled"
            }`}
          />
        </section>

        <ProfileSection
          title="Personal Details"
          isOpen={openSection === "personal"}
          onToggle={() =>
            setOpenSection(openSection === "personal" ? "" : "personal")
          }
        >
          <InfoGrid>
            <Info label="Full Name" value={employee.full_name} />
            <Info label="First Name" value={employee.first_name} />
            <Info label="Last Name" value={employee.last_name} />
            <Info label="ID Number" value={employee.id_number} />
            <Info label="Email" value={employee.email} />
            <Info label="Phone" value={employee.phone} />
          </InfoGrid>
        </ProfileSection>

        <ProfileSection
          title="Employment Details"
          isOpen={openSection === "employment"}
          onToggle={() =>
            setOpenSection(openSection === "employment" ? "" : "employment")
          }
        >
          <InfoGrid>
            <Info label="Employee Number" value={employee.employee_number} />
            <Info label="Position" value={employee.position} />
            <Info label="Department" value={employee.department} />
            <Info label="Employment Type" value={employee.employment_type} />
            <Info
              label="Employment Status"
              value={employee.employment_status || employee.status}
            />
            <Info label="Start Date" value={formatDate(employee.start_date)} />
          </InfoGrid>
        </ProfileSection>

        <ProfileSection
          title="Payroll and Banking Details"
          isOpen={openSection === "payroll"}
          onToggle={() =>
            setOpenSection(openSection === "payroll" ? "" : "payroll")
          }
        >
          <InfoGrid>
            <Info label="Salary Type" value={employee.salary_type} />
            <Info label="Pay Frequency" value={employee.pay_frequency} />
            <Info label="Payment Method" value={employee.payment_method} />
            <Info label="Bank Name" value={employee.bank_name} />
            <Info label="Account Type" value={employee.account_type} />
            <Info
              label="Account Number"
              value={maskAccount(employee.account_number)}
            />
          </InfoGrid>
        </ProfileSection>

        <ProfileSection
          title="Tax, UIF and HR Details"
          isOpen={openSection === "tax"}
          onToggle={() => setOpenSection(openSection === "tax" ? "" : "tax")}
        >
          <InfoGrid>
            <Info label="Tax Number" value={employee.tax_number} />
            <Info label="UIF Number" value={employee.uif_number} />
            <Info
              label="UIF Registered"
              value={employee.uif_registered ? "Yes" : "No"}
            />
            <Info
              label="Leave Balance"
              value={
                business?.show_leave_balances === false
                  ? "Hidden by employer"
                  : `${employee.leave_balance || 0} days`
              }
            />
            <Info
              label="Overtime Enabled"
              value={employee.overtime_enabled ? "Yes" : "No"}
            />
          </InfoGrid>
        </ProfileSection>

        <ProfileSection
          title="Employer Details"
          isOpen={openSection === "employer"}
          onToggle={() =>
            setOpenSection(openSection === "employer" ? "" : "employer")
          }
        >
          <InfoGrid>
            <Info label="Business Name" value={business?.business_name} />
            <Info label="Trading Name" value={business?.trading_name} />
            <Info
              label="Registration Number"
              value={business?.registration_number}
            />
            <Info label="Contact Person" value={business?.contact_person} />
            <Info label="Employer Email" value={business?.email} />
            <Info label="Employer Phone" value={business?.phone} />
          </InfoGrid>
        </ProfileSection>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  text,
}: {
  label: string;
  value: string;
  text: string;
}) {
  return (
    <div style={summaryCard}>
      <p style={summaryLabel}>{label}</p>
      <h2 style={summaryValue}>{value}</h2>
      <p style={summaryText}>{text}</p>
    </div>
  );
}

function ProfileSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section style={sectionCard}>
      <button onClick={onToggle} style={sectionButton}>
        <span>{title}</span>
        <span style={sectionButtonAction}>{isOpen ? "Hide" : "Open"}</span>
      </button>

      {isOpen && <div style={sectionContent}>{children}</div>}
    </section>
  );
}

function InfoGrid({ children }: { children: ReactNode }) {
  return <div style={infoGrid}>{children}</div>;
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div style={infoItem}>
      <p style={infoLabel}>{label}</p>
      <p style={infoValue}>{value || "Not provided"}</p>
    </div>
  );
}

function capitalise(value: string) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value?: string | null) {
  if (!value) return "Not provided";

  return new Date(value).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function maskAccount(value?: string | null) {
  if (!value) return "Not provided";
  if (value.length <= 4) return value;
  return `•••• ${value.slice(-4)}`;
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

const heroCard: CSSProperties = {
  padding: "32px",
  borderRadius: "28px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  marginBottom: "24px",
  boxShadow: "0 18px 45px rgba(15, 23, 42, 0.07)",
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

const subtitle: CSSProperties = {
  maxWidth: "820px",
  fontSize: "16px",
  lineHeight: 1.65,
  margin: "18px 0 0",
  color: "#5f6f82",
};

const topActions: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};

const primaryButton: CSSProperties = {
  padding: "10px 16px",
  borderRadius: "14px",
  background: "#0f766e",
  border: "1px solid #0f766e",
  color: "#ffffff",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 700,
};

const secondaryButton: CSSProperties = {
  padding: "10px 16px",
  borderRadius: "14px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  color: "#111827",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};

const summaryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "16px",
  marginBottom: "18px",
};

const summaryCard: CSSProperties = {
  padding: "20px",
  borderRadius: "22px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
};

const summaryLabel: CSSProperties = {
  margin: "0 0 8px",
  color: "#64748b",
  fontSize: "13px",
  fontWeight: 800,
};

const summaryValue: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "20px",
  color: "#111827",
};

const summaryText: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  color: "#5f6f82",
};

const sectionCard: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "22px",
  marginBottom: "12px",
  overflow: "hidden",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
};

const sectionButton: CSSProperties = {
  width: "100%",
  padding: "16px 20px",
  border: "none",
  background: "#ffffff",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "15px",
  fontWeight: 800,
  color: "#111827",
  cursor: "pointer",
};

const sectionButtonAction: CSSProperties = {
  color: "#0f766e",
  fontSize: "14px",
};

const sectionContent: CSSProperties = {
  padding: "0 20px 20px",
};

const infoGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "12px",
};

const infoItem: CSSProperties = {
  padding: "14px",
  borderRadius: "16px",
  background: "#f8fafc",
  border: "1px solid #eef2f7",
};

const infoLabel: CSSProperties = {
  margin: "0 0 6px",
  fontSize: "12px",
  color: "#64748b",
  fontWeight: 800,
};

const infoValue: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  color: "#111827",
  lineHeight: 1.45,
};

const messageCard: CSSProperties = {
  padding: "24px",
  borderRadius: "24px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)",
};