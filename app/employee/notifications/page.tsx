"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { showAppMessage } from "@/app/lib/appMessage";

type Notification = {
  id: string;
  title: string | null;
  message: string | null;
  type: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

type Employee = {
  id: string;
  full_name: string | null;
  business_id: string;
};

type Business = {
  business_name: string | null;
  trading_name: string | null;
  primary_color: string | null;
  secondary_color: string | null;
};

export default function EmployeeNotificationsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading notifications...");
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);
    setMessage("Loading notifications...");

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
      .select("id, full_name, business_id")
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
      .select("business_name, trading_name, primary_color, secondary_color")
      .eq("id", employeeData.business_id)
      .maybeSingle();

    setBusiness(businessData || null);

    const { data: notificationData, error: notificationError } = await supabase
      .from("payslip_notifications")
      .select("id, title, message, type, is_read, created_at")
      .eq("employee_id", employeeData.id)
      .order("created_at", { ascending: false });

    if (notificationError) {
      setMessage(notificationError.message);
      setLoading(false);
      return;
    }

    setNotifications(notificationData || []);
    setMessage("");
    setLoading(false);
  }

  async function markAsRead(notificationId: string) {
    const { error } = await supabase
      .from("payslip_notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) {
      showAppMessage(error.message);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, is_read: true } : item
      )
    );
  }

  async function markAllAsRead() {
    if (!employee) return;

    const { error } = await supabase
      .from("payslip_notifications")
      .update({ is_read: true })
      .eq("employee_id", employee.id)
      .eq("is_read", false);

    if (error) {
      showAppMessage(error.message);
      return;
    }

    setNotifications((current) =>
      current.map((item) => ({ ...item, is_read: true }))
    );
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length;
  const primaryColor = business?.primary_color || "#0f766e";
  const secondaryColor = business?.secondary_color || "#123c69";

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

        <h1 style={title}>Notifications</h1>

        <p style={subtitle}>
          View payroll notices, payslip updates, HR messages, leave updates, and
          overtime notices from your employer.
        </p>
      </section>

      <section style={summaryGrid}>
        <div style={summaryCard}>
          <p style={summaryLabel}>Unread</p>
          <h2 style={summaryValue}>{unreadCount}</h2>
          <p style={summaryText}>Notifications waiting for your attention.</p>
        </div>

        <div style={summaryCard}>
          <p style={summaryLabel}>Total</p>
          <h2 style={summaryValue}>{notifications.length}</h2>
          <p style={summaryText}>All notifications linked to your profile.</p>
        </div>

        <div style={summaryCard}>
          <p style={summaryLabel}>Employee</p>
          <h2 style={summaryValue}>{employee?.full_name || "Not provided"}</h2>
          <p style={summaryText}>Only your own notifications are shown.</p>
        </div>
      </section>

      <div style={actionRow}>
        <button onClick={loadNotifications} style={secondaryButton}>
          Refresh
        </button>

        <button onClick={markAllAsRead} style={primaryButton}>
          Mark all as read
        </button>
      </div>

      {message && <div style={messageCard}>{message}</div>}

      {!loading && !message && notifications.length === 0 && (
        <div style={messageCard}>No notifications available yet.</div>
      )}

      <section style={list}>
        {notifications.map((item) => {
          const isOpen = openId === item.id;

          return (
            <article
              key={item.id}
              style={{
                ...notificationCard,
                borderLeftColor: item.is_read ? "#cbd5e1" : primaryColor,
              }}
            >
              <button
                onClick={() => setOpenId(isOpen ? null : item.id)}
                style={notificationHeader}
              >
                <div>
                  <div style={cardTopLine}>
                    <span style={typeBadge}>{formatType(item.type)}</span>

                    {!item.is_read && <span style={unreadBadge}>Unread</span>}
                  </div>

                  <h2 style={notificationTitle}>
                    {item.title || "Notification"}
                  </h2>

                  <p style={dateText}>{formatDate(item.created_at)}</p>
                </div>

                <span style={openText}>{isOpen ? "Hide" : "Open"}</span>
              </button>

              {isOpen && (
                <div style={notificationBody}>
                  <p style={bodyText}>
                    {item.message || "No message was provided."}
                  </p>

                  {!item.is_read && (
                    <button
                      onClick={() => markAsRead(item.id)}
                      style={markReadButton}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}

function formatType(value?: string | null) {
  if (!value) return "General";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value?: string | null) {
  if (!value) return "Date not available";

  return new Date(value).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
  marginBottom: "20px",
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
  maxWidth: "760px",
  fontSize: "15px",
  lineHeight: 1.6,
  margin: 0,
  opacity: 0.92,
};

const summaryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
  marginBottom: "16px",
};

const summaryCard: CSSProperties = {
  padding: "17px",
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
  fontSize: "19px",
};

const summaryText: CSSProperties = {
  margin: 0,
  fontSize: "13px",
  color: "#52616f",
};

const actionRow: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "16px",
};

const primaryButton: CSSProperties = {
  padding: "10px 14px",
  borderRadius: "12px",
  border: "none",
  background: "#0f766e",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButton: CSSProperties = {
  padding: "10px 14px",
  borderRadius: "12px",
  border: "1px solid #dbe3ea",
  background: "#fff",
  color: "#102a43",
  fontWeight: 700,
  cursor: "pointer",
};

const messageCard: CSSProperties = {
  padding: "18px",
  borderRadius: "16px",
  background: "#fff",
  border: "1px solid #e3e8ef",
  fontSize: "14px",
  color: "#52616f",
};

const list: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const notificationCard: CSSProperties = {
  background: "#fff",
  border: "1px solid #e3e8ef",
  borderLeft: "5px solid",
  borderRadius: "18px",
  overflow: "hidden",
  boxShadow: "0 10px 24px rgba(16, 42, 67, 0.04)",
};

const notificationHeader: CSSProperties = {
  width: "100%",
  padding: "16px 18px",
  border: "none",
  background: "#fff",
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "center",
  textAlign: "left",
  cursor: "pointer",
};

const cardTopLine: CSSProperties = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: "7px",
};

const typeBadge: CSSProperties = {
  display: "inline-flex",
  padding: "5px 9px",
  borderRadius: "999px",
  background: "#eef7f6",
  color: "#0f766e",
  fontSize: "12px",
  fontWeight: 700,
};

const unreadBadge: CSSProperties = {
  display: "inline-flex",
  padding: "5px 9px",
  borderRadius: "999px",
  background: "#fff7ed",
  color: "#c2410c",
  fontSize: "12px",
  fontWeight: 700,
};

const notificationTitle: CSSProperties = {
  margin: "0 0 5px",
  fontSize: "16px",
  color: "#102a43",
};

const dateText: CSSProperties = {
  margin: 0,
  fontSize: "12px",
  color: "#60758a",
};

const openText: CSSProperties = {
  fontSize: "13px",
  color: "#0f766e",
  fontWeight: 700,
  flexShrink: 0,
};

const notificationBody: CSSProperties = {
  padding: "0 18px 18px",
};

const bodyText: CSSProperties = {
  margin: "0 0 14px",
  padding: "14px",
  background: "#f8fafc",
  border: "1px solid #eef2f7",
  borderRadius: "14px",
  fontSize: "14px",
  color: "#334155",
  lineHeight: 1.5,
};

const markReadButton: CSSProperties = {
  padding: "9px 12px",
  borderRadius: "10px",
  border: "none",
  background: "#0f766e",
  color: "#fff",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
};