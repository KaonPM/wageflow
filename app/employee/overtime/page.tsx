"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { showAppMessage } from "@/app/lib/appMessage";

type ApprovalStatus = "Pending" | "Approved" | "Declined" | "Cancelled";

type Employee = {
  id: string;
  business_id: string;
  full_name: string | null;
  employee_number: string | null;
  department: string | null;
  position: string | null;
};

type Business = {
  id: string;
  business_name: string | null;
  trading_name: string | null;
};

type OvertimeRequest = {
  id: string;
  employee_id: string;
  request_type: string;
  overtime_date: string | null;
  overtime_hours: number | null;
  employee_note: string | null;
  employer_note: string | null;
  status: ApprovalStatus;
  created_at: string;
};

export default function EmployeeOvertimePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);

  const [requests, setRequests] = useState<OvertimeRequest[]>([]);

  const [overtimeDate, setOvertimeDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const pendingCount = useMemo(
    () => requests.filter((item) => item.status === "Pending").length,
    [requests]
  );

  async function loadData() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: account } = await supabase
      .from("employee_accounts")
      .select("employee_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!account) {
      setLoading(false);
      return;
    }

    const { data: employeeData } = await supabase
      .from("employees")
      .select("*")
      .eq("id", account.employee_id)
      .maybeSingle();

    if (!employeeData) {
      setLoading(false);
      return;
    }

    const { data: businessData } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", employeeData.business_id)
      .maybeSingle();

    const { data: requestData } = await supabase
      .from("approval_requests")
      .select("*")
      .eq("employee_id", employeeData.id)
      .eq("request_type", "Overtime request")
      .order("created_at", { ascending: false });

    setEmployee(employeeData);
    setBusiness(businessData);
    setRequests(requestData || []);

    setLoading(false);
  }

  function calculateHours() {
    if (!startTime || !endTime) return 0;

    const start = new Date(`2026-01-01T${startTime}`);
    const end = new Date(`2026-01-01T${endTime}`);

    const difference = end.getTime() - start.getTime();

    return Math.max(difference / (1000 * 60 * 60), 0);
  }

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!employee) return;

    const hours = calculateHours();

    if (!overtimeDate || !startTime || !endTime) {
      showAppMessage("Please complete all overtime fields.");
      return;
    }

    if (hours <= 0) {
      showAppMessage("End time must be after start time.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("approval_requests").insert({
      business_id: employee.business_id,
      employee_id: employee.id,
      request_type: "Overtime request",
      overtime_date: overtimeDate,
      overtime_hours: Number(hours.toFixed(2)),
      employee_note: note || null,
      status: "Pending",
    });

    if (error) {
      showAppMessage(`Overtime request failed: ${error.message}`);
      setSaving(false);
      return;
    }

    setOvertimeDate("");
    setStartTime("");
    setEndTime("");
    setNote("");

    await loadData();

    setSaving(false);

    showAppMessage("Overtime request submitted.");
  }

  if (loading) {
    return (
      <main style={page}>
        <div style={loadingCard}>Loading overtime page...</div>
      </main>
    );
  }

  const employerName =
    business?.trading_name || business?.business_name || "Employer";

  return (
    <main style={page}>
      <div style={shell}>
        <section style={headerCard}>
          <div>
            <h1 style={companyTitle}>{employerName}</h1>

            <h2 style={pageTitle}>Manage Overtime</h2>

            <p style={subtitle}>
              Submit overtime requests and track employer approval status.
            </p>
          </div>

          <Link href="/employee" style={backButton}>
             ← Back to Dashboard
          </Link>
        </section>

        <section style={summaryGrid}>
          <div style={summaryCard}>
            <p style={summaryLabel}>Employee</p>
            <h3 style={summaryValue}>{employee?.full_name}</h3>
            <p style={summaryText}>
              {employee?.employee_number} · {employee?.department}
            </p>
          </div>

          <div style={summaryCard}>
            <p style={summaryLabel}>Pending Requests</p>
            <h3 style={summaryValue}>{pendingCount}</h3>
            <p style={summaryText}>
              Awaiting employer review and approval.
            </p>
          </div>

          <div style={summaryCard}>
            <p style={summaryLabel}>Total Requests</p>
            <h3 style={summaryValue}>{requests.length}</h3>
            <p style={summaryText}>
              Overtime submissions linked to your profile.
            </p>
          </div>
        </section>

        <section style={grid}>
          <form style={card} onSubmit={submitRequest}>
            <h2 style={cardTitle}>New Overtime Request</h2>

            <label style={label}>
              Overtime Date
              <input
                type="date"
                value={overtimeDate}
                onChange={(e) => setOvertimeDate(e.target.value)}
                style={input}
              />
            </label>

            <div style={twoColumn}>
              <label style={label}>
                Start Time
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={input}
                />
              </label>

              <label style={label}>
                End Time
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={input}
                />
              </label>
            </div>

            <div style={hoursCard}>
              Calculated Hours:{" "}
              <strong>{calculateHours().toFixed(2)}</strong>
            </div>

            <label style={label}>
              Note
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={textarea}
                placeholder="Optional note for employer approval."
              />
            </label>

            <button style={submitButton} disabled={saving}>
              {saving ? "Submitting..." : "Submit Overtime Request"}
            </button>
          </form>

          <section style={card}>
            <h2 style={cardTitle}>Overtime Request History</h2>

            {requests.length === 0 ? (
              <div style={emptyState}>
                No overtime requests submitted yet.
              </div>
            ) : (
              <div style={requestList}>
                {requests.map((request) => (
                  <div key={request.id} style={requestCard}>
                    <div style={requestTop}>
                      <div>
                        <h3 style={requestTitle}>
                          {request.overtime_hours} hours
                        </h3>

                        <p style={requestDate}>
                          {formatDate(request.overtime_date)}
                        </p>
                      </div>

                      <span style={statusStyle(request.status)}>
                        {request.status}
                      </span>
                    </div>

                    <p style={requestNote}>
                      {request.employee_note || "No note added."}
                    </p>

                    {request.employer_note ? (
                      <div style={employerNote}>
                        <strong>Employer note</strong>
                        <p>{request.employer_note}</p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function statusStyle(status: ApprovalStatus): CSSProperties {
  const base: CSSProperties = {
    padding: "7px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 800,
  };

  if (status === "Approved") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (status === "Declined") {
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

const page: CSSProperties = {
  minHeight: "100vh",
  background: "#f4f7fb",
  padding: "32px",
  fontFamily: "Arial, sans-serif",
};

const shell: CSSProperties = {
  maxWidth: "1180px",
  margin: "0 auto",
};

const loadingCard: CSSProperties = {
  background: "#fff",
  borderRadius: "18px",
  padding: "24px",
};

const headerCard: CSSProperties = {
  background: "#fff",
  borderRadius: "22px",
  padding: "34px",
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  flexWrap: "wrap",
  marginBottom: "24px",
};

const companyTitle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "34px",
  fontWeight: 900,
  color: "#0f766e",
};

const pageTitle: CSSProperties = {
  margin: "0 0 12px",
  fontSize: "24px",
};

const subtitle: CSSProperties = {
  margin: 0,
  color: "#52616f",
};

const backButton: CSSProperties = {
  padding: "11px 16px",
  borderRadius: "12px",
  background: "#0f766e",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
  height: "fit-content",
};

const summaryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "18px",
  marginBottom: "24px",
};

const summaryCard: CSSProperties = {
  background: "#fff",
  borderRadius: "18px",
  padding: "22px",
};

const summaryLabel: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "13px",
  color: "#60758a",
  fontWeight: 700,
};

const summaryValue: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "22px",
};

const summaryText: CSSProperties = {
  margin: 0,
  color: "#52616f",
  fontSize: "14px",
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "18px",
};

const card: CSSProperties = {
  background: "#fff",
  borderRadius: "18px",
  padding: "24px",
};

const cardTitle: CSSProperties = {
  margin: "0 0 20px",
  fontSize: "20px",
};

const label: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "16px",
  fontWeight: 700,
  fontSize: "14px",
};

const input: CSSProperties = {
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid #d9e2ec",
  fontSize: "14px",
};

const textarea: CSSProperties = {
  ...input,
  minHeight: "110px",
  resize: "vertical",
};

const twoColumn: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

const hoursCard: CSSProperties = {
  padding: "14px",
  borderRadius: "14px",
  background: "#f0fdfa",
  marginBottom: "16px",
  color: "#0f766e",
  fontWeight: 700,
};

const submitButton: CSSProperties = {
  width: "100%",
  padding: "13px",
  borderRadius: "12px",
  border: "none",
  background: "#0f766e",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const emptyState: CSSProperties = {
  padding: "18px",
  borderRadius: "14px",
  background: "#f8fafc",
};

const requestList: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const requestCard: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "16px",
};

const requestTop: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "12px",
  gap: "12px",
};

const requestTitle: CSSProperties = {
  margin: "0 0 4px",
};

const requestDate: CSSProperties = {
  margin: 0,
  fontSize: "13px",
  color: "#60758a",
};

const requestNote: CSSProperties = {
  margin: 0,
  color: "#334e68",
  lineHeight: 1.5,
};

const employerNote: CSSProperties = {
  marginTop: "14px",
  padding: "12px",
  borderRadius: "12px",
  background: "#f8fafc",
  fontSize: "13px",
};