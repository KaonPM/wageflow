"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type Subscription = {
  id: string;
  business_id?: string | null;
  business_name?: string | null;
  plan: string | null;
  status: string | null;
  setup_fee_status: string | null;
  monthly_payment_status: string | null;
  monthly_amount?: number | null;
  setup_fee_amount?: number | null;
  renewal_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const plans = ["Starter", "Growth", "Premium", "Bloom", "Bloom Pro", "Bloom Elite"];
const statuses = ["active", "pending", "trial", "suspended", "cancelled"];
const paymentStatuses = ["paid", "pending", "overdue", "waived"];

export default function MasterSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function loadSubscriptions() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setSubscriptions([]);
    } else {
      setSubscriptions(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const summary = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === "active").length;
    const pendingPayments = subscriptions.filter(
      (s) => s.monthly_payment_status === "pending"
    ).length;
    const setupFeesDue = subscriptions.filter(
      (s) => s.setup_fee_status === "pending"
    ).length;
    const overdue = subscriptions.filter(
      (s) => s.monthly_payment_status === "overdue" || s.status === "suspended"
    ).length;

    return { active, pendingPayments, setupFeesDue, overdue };
  }, [subscriptions]);

  function updateLocal(id: string, field: keyof Subscription, value: string) {
    setSubscriptions((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  async function saveSubscription(subscription: Subscription) {
    setSavingId(subscription.id);
    setMessage("");

    const { error } = await supabase
      .from("subscriptions")
      .update({
        plan: subscription.plan,
        status: subscription.status,
        setup_fee_status: subscription.setup_fee_status,
        monthly_payment_status: subscription.monthly_payment_status,
        renewal_date: subscription.renewal_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Subscription updated successfully.");
      await loadSubscriptions();
    }

    setSavingId(null);
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

        <Link href="/master" style={backButton}>
          ← Back to Master Dashboard
        </Link>
      </section>

      <section style={summaryGrid}>
        <SummaryCard label="Active Subscriptions" value={String(summary.active)} />
        <SummaryCard label="Pending Payments" value={String(summary.pendingPayments)} />
        <SummaryCard label="Setup Fees Due" value={String(summary.setupFeesDue)} />
        <SummaryCard label="Overdue Accounts" value={String(summary.overdue)} />
      </section>

      <section style={card}>
        <div style={cardHeader}>
          <div>
            <h2 style={cardTitle}>Subscription Management</h2>
            <p style={cardText}>
              Change plan, payment status, setup fee status and renewal tracking
              for each business.
            </p>
          </div>

          <button onClick={loadSubscriptions} style={secondaryButton}>
            Refresh
          </button>
        </div>

        {message && <div style={notice}>{message}</div>}

        {loading ? (
          <div style={emptyState}>
            <strong>Loading subscriptions</strong>
            <span>Please wait while billing records are fetched.</span>
          </div>
        ) : subscriptions.length === 0 ? (
          <div style={emptyState}>
            <strong>No subscription records yet</strong>
            <span>
              Once businesses are onboarded, their billing status will appear here.
            </span>
          </div>
        ) : (
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Business</th>
                  <th style={th}>Plan</th>
                  <th style={th}>Status</th>
                  <th style={th}>Setup Fee</th>
                  <th style={th}>Monthly Payment</th>
                  <th style={th}>Renewal Date</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {subscriptions.map((subscription) => (
                  <tr key={subscription.id}>
                    <td style={td}>
                      <strong>
                        {subscription.business_name || "Unnamed Business"}
                      </strong>
                    </td>

                    <td style={td}>
                      <select
                        style={select}
                        value={subscription.plan || ""}
                        onChange={(e) =>
                          updateLocal(subscription.id, "plan", e.target.value)
                        }
                      >
                        <option value="">Select plan</option>
                        {plans.map((plan) => (
                          <option key={plan} value={plan}>
                            {plan}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={td}>
                      <select
                        style={select}
                        value={subscription.status || ""}
                        onChange={(e) =>
                          updateLocal(subscription.id, "status", e.target.value)
                        }
                      >
                        <option value="">Select status</option>
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={td}>
                      <select
                        style={select}
                        value={subscription.setup_fee_status || ""}
                        onChange={(e) =>
                          updateLocal(
                            subscription.id,
                            "setup_fee_status",
                            e.target.value
                          )
                        }
                      >
                        <option value="">Select</option>
                        {paymentStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={td}>
                      <select
                        style={select}
                        value={subscription.monthly_payment_status || ""}
                        onChange={(e) =>
                          updateLocal(
                            subscription.id,
                            "monthly_payment_status",
                            e.target.value
                          )
                        }
                      >
                        <option value="">Select</option>
                        {paymentStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={td}>
                      <input
                        type="date"
                        style={input}
                        value={subscription.renewal_date || ""}
                        onChange={(e) =>
                          updateLocal(
                            subscription.id,
                            "renewal_date",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td style={td}>
                      <button
                        style={primaryButton}
                        onClick={() => saveSubscription(subscription)}
                        disabled={savingId === subscription.id}
                      >
                        {savingId === subscription.id ? "Saving..." : "Save"}
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
  maxWidth: "720px",
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
  gap: "16px",
  alignItems: "flex-start",
  marginBottom: "18px",
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
  width: "100%",
  overflowX: "auto" as const,
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
  minWidth: "980px",
};

const th = {
  textAlign: "left" as const,
  padding: "12px",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: "12px",
  textTransform: "uppercase" as const,
};

const td = {
  padding: "12px",
  borderBottom: "1px solid #e2e8f0",
  verticalAlign: "middle" as const,
};

const select = {
  width: "100%",
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
};

const input = {
  width: "100%",
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
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