"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
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

  const primaryColor = business?.primary_color || "#0f766e";
  const secondaryColor = business?.secondary_color || "#123c69";

  if (loading) {
    return (
      <main style={page}>
        <div style={messageCard}>Loading profile details...</div>
      </main>
    );
  }

  if (message || !employee) {
    return (
      <main style={page}>
        <div style={messageCard}>{message || "Profile unavailable."}</div>
      </main>
    );
  }

  return (
    <main style={page}>
      <section
        style={{
          ...hero,
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
        }}
      >
        <div style={topRow}>
          <a href="/" style={heroButton}>
            Home
          </a>

          <div style={buttonGroup}>
            <a href="/employee" style={heroButton}>
              Dashboard
            </a>

            <button onClick={handleLogout} style={heroButton}>
              Logout
            </button>
          </div>
        </div>

        <p style={eyebrow}>
          {business?.trading_name || business?.business_name || "Employee Portal"}
        </p>

        <h1 style={title}>My Profile</h1>

        <p style={subtitle}>
          View your personal, employment, payroll, tax, and HR information.
        </p>
      </section>

      <section style={summaryGrid}>
        <div style={summaryCard}>
          <p style={summaryLabel}>Employee</p>
          <h2 style={summaryValue}>{employee.full_name || "Not provided"}</h2>
          <p style={summaryText}>
            {employee.position || "Position not provided"}
          </p>
        </div>

        <div style={summaryCard}>
          <p style={summaryLabel}>Employee Status</p>
          <h2 style={summaryValue}>
            {capitalise(employee.employment_status || employee.status || "active")}
          </h2>
          <p style={summaryText}>
            Employee No: {employee.employee_number || "Not provided"}
          </p>
        </div>

        <div style={summaryCard}>
          <p style={summaryLabel}>HR Snapshot</p>
          <h2 style={summaryValue}>
            {business?.show_leave_balances === false
              ? "Leave hidden"
              : `${employee.leave_balance || 0} days leave`}
          </h2>
          <p style={summaryText}>
            Overtime: {employee.overtime_enabled ? "Enabled" : "Not enabled"}
          </p>
        </div>
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
        title="Payroll and Payment Details"
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
    </main>
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
  children: React.ReactNode;
}) {
  return (
    <section style={sectionCard}>
      <button onClick={onToggle} style={sectionButton}>
        <span>{title}</span>
        <span>{isOpen ? "Hide" : "Open"}</span>
      </button>

      {isOpen && <div style={sectionContent}>{children}</div>}
    </section>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
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
  color: "#102a43",
};

const hero: CSSProperties = {
  padding: "26px",
  borderRadius: "22px",
  color: "#fff",
  marginBottom: "22px",
  boxShadow: "0 16px 40px rgba(15, 118, 110, 0.18)",
};

const topRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "20px",
  flexWrap: "wrap",
};

const buttonGroup: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const heroButton: CSSProperties = {
  padding: "10px 14px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.14)",
  border: "1px solid rgba(255,255,255,0.22)",
  color: "#fff",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};

const eyebrow: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "13px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  opacity: 0.9,
};

const title: CSSProperties = {
  fontSize: "30px",
  margin: "0 0 10px",
};

const subtitle: CSSProperties = {
  maxWidth: "720px",
  fontSize: "15px",
  lineHeight: 1.6,
  margin: 0,
  opacity: 0.92,
};

const summaryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "16px",
  marginBottom: "18px",
};

const summaryCard: CSSProperties = {
  padding: "18px",
  borderRadius: "18px",
  background: "#fff",
  border: "1px solid #e3e8ef",
  boxShadow: "0 10px 24px rgba(16, 42, 67, 0.05)",
};

const summaryLabel: CSSProperties = {
  margin: "0 0 6px",
  color: "#60758a",
  fontSize: "12px",
  fontWeight: 700,
};

const summaryValue: CSSProperties = {
  margin: "0 0 6px",
  fontSize: "18px",
};

const summaryText: CSSProperties = {
  margin: 0,
  fontSize: "13px",
  color: "#52616f",
};

const sectionCard: CSSProperties = {
  background: "#fff",
  border: "1px solid #e3e8ef",
  borderRadius: "18px",
  marginBottom: "12px",
  overflow: "hidden",
};

const sectionButton: CSSProperties = {
  width: "100%",
  padding: "15px 18px",
  border: "none",
  background: "#fff",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "15px",
  fontWeight: 700,
  color: "#102a43",
  cursor: "pointer",
};

const sectionContent: CSSProperties = {
  padding: "0 18px 18px",
};

const infoGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
};

const infoItem: CSSProperties = {
  padding: "13px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px solid #eef2f7",
};

const infoLabel: CSSProperties = {
  margin: "0 0 5px",
  fontSize: "12px",
  color: "#60758a",
  fontWeight: 700,
};

const infoValue: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  color: "#102a43",
  lineHeight: 1.4,
};

const messageCard: CSSProperties = {
  padding: "22px",
  borderRadius: "18px",
  background: "#fff",
  border: "1px solid #e3e8ef",
};