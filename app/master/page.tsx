"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Subscription = {
  id: string;
  business_id: string;
  plan_name: string | null;
  monthly_fee: number | null;
  setup_fee: number | null;
  setup_paid: boolean | null;
  subscription_status: string | null;
  created_at: string;
  businesses?: {
    business_name: string | null;
    email: string | null;
    phone: string | null;
    status: string | null;
  } | null;
};

export default function MasterSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  async function fetchSubscriptions() {
    setLoading(true);

    const { data, error } = await supabase
      .from("subscriptions")
      .select(
        `
        *,
        businesses (
          business_name,
          email,
          phone,
          status
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setSubscriptions(data || []);
    setLoading(false);
  }

  const activeSubscriptions = subscriptions.filter(
    (item) => item.subscription_status?.toLowerCase() === "active"
  ).length;

  const pendingPayments = subscriptions.filter(
    (item) => item.subscription_status?.toLowerCase() === "pending"
  ).length;

  const setupFeesDue = subscriptions.filter((item) => !item.setup_paid).length;

  const monthlyRevenue = subscriptions
    .filter((item) => item.subscription_status?.toLowerCase() === "active")
    .reduce((sum, item) => sum + Number(item.monthly_fee || 0), 0);

  function money(amount: number) {
    return `R${amount.toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return (
    <main style={page}>
      <section style={header}>
        <div>
          <p style={eyebrow}>WageFlow Admin</p>
          <h1 style={title}>Subscriptions</h1>
          <p style={subtitle}>
            Monitor setup fees, monthly subscriptions, payment status and client
            billing activity.
          </p>
        </div>

        <a href="/master" style={backButton}>
          ← Back to Dashboard
        </a>
      </section>

      <section style={summaryGrid}>
        <SummaryCard
          label="Active Subscriptions"
          value={loading ? "..." : String(activeSubscriptions)}
        />
        <SummaryCard
          label="Pending Payments"
          value={loading ? "..." : String(pendingPayments)}
        />
        <SummaryCard
          label="Setup Fees Due"
          value={loading ? "..." : String(setupFeesDue)}
        />
        <SummaryCard
          label="Monthly Revenue"
          value={loading ? "..." : money(monthlyRevenue)}
        />
      </section>

      <section style={card}>
        <div style={cardHeader}>
          <div>
            <h2 style={cardTitle}>Subscription Management</h2>
            <p style={cardText}>
              View active plans, setup fee status and client subscription
              records.
            </p>
          </div>
        </div>

        {loading ? (
          <p>Loading subscriptions...</p>
        ) : subscriptions.length === 0 ? (
          <div style={emptyState}>
            <strong>No subscription records yet</strong>
            <span>
              Once businesses are approved, their billing status will appear
              here.
            </span>
          </div>
        ) : (
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Business</th>
                  <th style={th}>Plan</th>
                  <th style={th}>Monthly Fee</th>
                  <th style={th}>Setup Fee</th>
                  <th style={th}>Setup Paid</th>
                  <th style={th}>Status</th>
                  <th style={th}>Created</th>
                </tr>
              </thead>

              <tbody>
                {subscriptions.map((subscription) => (
                  <tr key={subscription.id}>
                    <td style={td}>
                      <strong>
                        {subscription.businesses?.business_name ||
                          "Unnamed Business"}
                      </strong>
                      <br />
                      <span style={muted}>
                        {subscription.businesses?.email || "No email"}
                      </span>
                    </td>

                    <td style={td}>{subscription.plan_name || "Starter"}</td>

                    <td style={td}>
                      {money(Number(subscription.monthly_fee || 0))}
                    </td>

                    <td style={td}>
                      {money(Number(subscription.setup_fee || 0))}
                    </td>

                    <td style={td}>
                      <span
                        style={
                          subscription.setup_paid
                            ? paidBadge
                            : unpaidBadge
                        }
                      >
                        {subscription.setup_paid ? "Paid" : "Due"}
                      </span>
                    </td>

                    <td style={td}>
                      <span style={statusBadge(subscription.subscription_status)}>
                        {subscription.subscription_status || "Pending"}
                      </span>
                    </td>

                    <td style={td}>
                      {new Date(subscription.created_at).toLocaleDateString()}
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

function statusBadge(status: string | null) {
  const base = {
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: 700,
    textTransform: "capitalize" as const,
  };

  if (status?.toLowerCase() === "active") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (status?.toLowerCase() === "suspended") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
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

const paidBadge = {
  background: "#dcfce7",
  color: "#166534",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: 700,
};

const unpaidBadge = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: 700,
};