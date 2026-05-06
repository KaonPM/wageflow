"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type Business = {
  id: string;
  business_name: string | null;
};

type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  access_status: string | null;
  business_id: string | null;
  created_at: string;
  businesses?: {
    business_name: string | null;
  } | null;
};

const roles = ["master", "employer", "employee"];
const accessStatuses = ["active", "pending", "suspended", "inactive"];

export default function MasterUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchPageData();
  }, []);

  async function fetchPageData() {
    setLoading(true);
    setMessage("");

    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select(
        `
        *,
        businesses (
          business_name
        )
      `
      )
      .order("created_at", { ascending: false });

    const { data: businessData, error: businessError } = await supabase
      .from("businesses")
      .select("id, business_name")
      .order("business_name", { ascending: true });

    if (userError) {
      setMessage(userError.message);
      setUsers([]);
    } else {
      setUsers(userData || []);
    }

    if (businessError) {
      setMessage(businessError.message);
      setBusinesses([]);
    } else {
      setBusinesses(businessData || []);
    }

    setLoading(false);
  }

  const summary = useMemo(() => {
    const masterAdmins = users.filter(
      (user) => user.role?.toLowerCase() === "master"
    ).length;

    const employers = users.filter(
      (user) => user.role?.toLowerCase() === "employer"
    ).length;

    const employees = users.filter(
      (user) => user.role?.toLowerCase() === "employee"
    ).length;

    const linkedUsers = users.filter((user) => user.business_id).length;

    return { masterAdmins, employers, employees, linkedUsers };
  }, [users]);

  function updateLocal(id: string, field: keyof UserProfile, value: string) {
    setUsers((current) =>
      current.map((user) =>
        user.id === id
          ? {
              ...user,
              [field]: value === "none" ? null : value,
            }
          : user
      )
    );
  }

  async function saveUser(user: UserProfile) {
    setSavingId(user.id);
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({
        role: user.role,
        access_status: user.access_status,
        business_id: user.business_id || null,
      })
      .eq("id", user.id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("User updated successfully.");
      await fetchPageData();
    }

    setSavingId(null);
  }

  return (
    <main style={page}>
      <section style={header}>
        <div>
          <p style={eyebrow}>WageFlow Admin</p>
          <h1 style={title}>Users</h1>
          <p style={subtitle}>
            Manage master admin, employer and employee access across WageFlow.
          </p>
        </div>

        <Link href="/master" style={backButton}>
          ← Back to Master Dashboard
        </Link>
      </section>

      <section style={summaryGrid}>
        <SummaryCard
          label="Master Admins"
          value={loading ? "..." : String(summary.masterAdmins)}
        />
        <SummaryCard
          label="Employers"
          value={loading ? "..." : String(summary.employers)}
        />
        <SummaryCard
          label="Employees"
          value={loading ? "..." : String(summary.employees)}
        />
        <SummaryCard
          label="Linked Users"
          value={loading ? "..." : String(summary.linkedUsers)}
        />
      </section>

      <section style={card}>
        <div style={cardHeader}>
          <div>
            <h2 style={cardTitle}>User Access Management</h2>
            <p style={cardText}>
              Change user roles, business links and access status.
            </p>
          </div>

          <button onClick={fetchPageData} style={secondaryButton}>
            Refresh
          </button>
        </div>

        {message && <div style={notice}>{message}</div>}

        {loading ? (
          <div style={emptyState}>
            <strong>Loading users</strong>
            <span>Please wait while user records are fetched.</span>
          </div>
        ) : users.length === 0 ? (
          <div style={emptyState}>
            <strong>No user records found</strong>
            <span>
              Once master, employer or employee accounts are created, they will
              appear here.
            </span>
          </div>
        ) : (
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>User</th>
                  <th style={th}>Role</th>
                  <th style={th}>Business</th>
                  <th style={th}>Access Status</th>
                  <th style={th}>Created</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td style={td}>
                      <strong>{user.full_name || "Unnamed User"}</strong>
                      <br />
                      <span style={muted}>{user.email || "No email"}</span>
                    </td>

                    <td style={td}>
                      <select
                        style={select}
                        value={user.role || ""}
                        onChange={(e) =>
                          updateLocal(user.id, "role", e.target.value)
                        }
                      >
                        <option value="">Select role</option>
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={td}>
                      <select
                        style={select}
                        value={user.business_id || "none"}
                        onChange={(e) =>
                          updateLocal(user.id, "business_id", e.target.value)
                        }
                      >
                        <option value="none">No business linked</option>
                        {businesses.map((business) => (
                          <option key={business.id} value={business.id}>
                            {business.business_name || "Unnamed Business"}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={td}>
                      <select
                        style={select}
                        value={user.access_status || "pending"}
                        onChange={(e) =>
                          updateLocal(user.id, "access_status", e.target.value)
                        }
                      >
                        {accessStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={td}>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "-"}
                    </td>

                    <td style={td}>
                      <button
                        style={primaryButton}
                        onClick={() => saveUser(user)}
                        disabled={savingId === user.id}
                      >
                        {savingId === user.id ? "Saving..." : "Save"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryCard}>
      <span style={summaryLabel}>{label}</span>
      <strong style={summaryValue}>{value}</strong>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  padding: "38px",
  fontFamily: "Arial, sans-serif",
  background: "#f4f8fb",
  color: "#0f172a",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
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

const backButton = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "10px 18px",
  borderRadius: "12px",
  textDecoration: "none",
  fontWeight: 700,
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "16px",
  marginBottom: "24px",
};

const summaryCard = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "18px",
  boxShadow: "0 10px 26px rgba(15, 23, 42, 0.05)",
};

const summaryLabel = {
  display: "block",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase" as const,
  marginBottom: "7px",
};

const summaryValue = {
  color: "#0f766e",
  fontSize: "24px",
};

const card = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  padding: "26px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "20px",
};

const cardTitle = {
  margin: "0 0 10px",
  color: "#0f172a",
  fontSize: "22px",
};

const cardText = {
  color: "#64748b",
  lineHeight: 1.6,
  margin: 0,
};

const notice = {
  background: "#ecfeff",
  border: "1px solid #a5f3fc",
  color: "#155e75",
  borderRadius: "14px",
  padding: "14px 16px",
  marginBottom: "16px",
  fontWeight: 700,
};

const emptyState = {
  background: "#ecfeff",
  border: "1px solid #a5f3fc",
  color: "#155e75",
  borderRadius: "16px",
  padding: "22px",
  display: "flex",
  flexDirection: "column" as const,
  gap: "6px",
};

const tableWrap = {
  overflowX: "auto" as const,
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
  minWidth: "980px",
};

const th = {
  textAlign: "left" as const,
  padding: "14px",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: "13px",
  textTransform: "uppercase" as const,
};

const td = {
  padding: "14px",
  borderBottom: "1px solid #e2e8f0",
  verticalAlign: "top" as const,
  fontSize: "14px",
};

const muted = {
  color: "#64748b",
  fontSize: "13px",
};

const select = {
  width: "100%",
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
};

const primaryButton = {
  background: "#0f766e",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButton = {
  background: "#ffffff",
  color: "#0f766e",
  border: "1px solid #0f766e",
  borderRadius: "10px",
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};