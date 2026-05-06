"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  business_id: string | null;
  created_at: string;
  businesses?: {
    business_name: string | null;
  } | null;
};

export default function MasterUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);

    const { data, error } = await supabase
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

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setUsers(data || []);
    setLoading(false);
  }

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

        <a href="/master" style={backButton}>
          ← Back to Dashboard
        </a>
      </section>

      <section style={summaryGrid}>
        <SummaryCard
          label="Master Admins"
          value={loading ? "..." : String(masterAdmins)}
        />
        <SummaryCard
          label="Employers"
          value={loading ? "..." : String(employers)}
        />
        <SummaryCard
          label="Employees"
          value={loading ? "..." : String(employees)}
        />
        <SummaryCard
          label="Linked Users"
          value={loading ? "..." : String(linkedUsers)}
        />
      </section>

      <section style={card}>
        <div style={cardHeader}>
          <div>
            <h2 style={cardTitle}>User Access Management</h2>
            <p style={cardText}>
              View users linked to WageFlow, their roles and business access.
            </p>
          </div>
        </div>

        {loading ? (
          <p>Loading users...</p>
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
                  <th style={th}>Access</th>
                  <th style={th}>Created</th>
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
                      <span style={roleBadge(user.role)}>
                        {user.role || "Unassigned"}
                      </span>
                    </td>

                    <td style={td}>
                      {user.businesses?.business_name || (
                        <span style={muted}>No business linked</span>
                      )}
                    </td>

                    <td style={td}>
                      <span style={user.business_id ? activeBadge : pendingBadge}>
                        {user.business_id ? "Linked" : "Not linked"}
                      </span>
                    </td>

                    <td style={td}>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "-"}
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

function roleBadge(role: string | null) {
  const base = {
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: 700,
    textTransform: "capitalize" as const,
  };

  if (role?.toLowerCase() === "master") {
    return {
      ...base,
      background: "#ede9fe",
      color: "#5b21b6",
    };
  }

  if (role?.toLowerCase() === "employer") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (role?.toLowerCase() === "employee") {
    return {
      ...base,
      background: "#e0f2fe",
      color: "#075985",
    };
  }

  return {
    ...base,
    background: "#fef3c7",
    color: "#92400e",
  };
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

const activeBadge = {
  background: "#dcfce7",
  color: "#166534",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: 700,
};

const pendingBadge = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: 700,
};