"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type ApprovalStatus = "Pending" | "Approved" | "Declined" | "Cancelled";

type Employee = {
  id: string;
  business_id: string;
  full_name: string | null;
  employee_number: string | null;
  department: string | null;
  position: string | null;
  leave_balance: number | null;
};

type Business = {
  id: string;
  business_name: string | null;
  trading_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
};

type LeaveRequest = {
  id: string;
  business_id: string | null;
  employee_id: string;
  request_type: string;
  leave_type: string | null;
  start_date: string | null;
  end_date: string | null;
  reason: string | null;
  status: ApprovalStatus;
  employee_note: string | null;
  employer_note: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export default function EmployeeLeavePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);

  const [leaveType, setLeaveType] = useState("Annual leave");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    loadPageData();
  }, []);

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === "Pending").length,
    [requests]
  );

  async function loadPageData() {
    setLoading(true);

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
      .select("employee_id, portal_enabled")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (accountError || !account || account.portal_enabled !== true) {
      alert("Employee portal access is not active.");
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
        employee_number,
        department,
        position,
        leave_balance
      `
      )
      .eq("id", account.employee_id)
      .maybeSingle();

    if (employeeError || !employeeData) {
      alert(
        `Employee record could not be loaded.${
          employeeError?.message ? ` ${employeeError.message}` : ""
        }`
      );
      setLoading(false);
      return;
    }

    const { data: businessData } = await supabase
      .from("businesses")
      .select(
        `
        id,
        business_name,
        trading_name,
        logo_url,
        primary_color,
        secondary_color
      `
      )
      .eq("id", employeeData.business_id)
      .maybeSingle();

    const { data: requestData, error: requestError } = await supabase
      .from("approval_requests")
      .select("*")
      .eq("employee_id", employeeData.id)
      .eq("request_type", "Leave request")
      .order("created_at", { ascending: false });

    if (requestError) {
      alert(`Could not load leave requests: ${requestError.message}`);
      setLoading(false);
      return;
    }

    setEmployee(employeeData as Employee);
    setBusiness((businessData || null) as Business | null);
    setRequests((requestData || []) as LeaveRequest[]);
    setLoading(false);
  }

  async function submitLeaveRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!employee) return;

    if (!startDate || !endDate) {
      alert("Please select both start date and end date.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      alert("End date cannot be before start date.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("approval_requests").insert({
      business_id: employee.business_id,
      employee_id: employee.id,
      request_type: "Leave request",
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      reason: reason || null,
      employee_note: reason || null,
      employer_note: null,
      status: "Pending",
      approved_by: null,
      approved_at: null,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      alert(`Leave request was not submitted: ${error.message}`);
      setSaving(false);
      return;
    }

    setLeaveType("Annual leave");
    setStartDate("");
    setEndDate("");
    setReason("");

    await loadPageData();

    setSaving(false);
    alert("Leave request submitted successfully.");
  }

  async function cancelRequest(request: LeaveRequest) {
    if (request.status !== "Pending") {
      alert("Only pending requests can be cancelled.");
      return;
    }

    const { error } = await supabase
      .from("approval_requests")
      .update({
        status: "Cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    if (error) {
      alert(`Request could not be cancelled: ${error.message}`);
      return;
    }

    await loadPageData();
  }

  if (loading) {
    return (
      <main style={page}>
        <div style={shell}>
          <div style={loadingCard}>Loading leave page...</div>
        </div>
      </main>
    );
  }

  if (!employee) {
    return (
      <main style={page}>
        <div style={shell}>
          <div style={loadingCard}>Employee record could not be found.</div>
        </div>
      </main>
    );
  }

  const employerName =
    business?.trading_name || business?.business_name || "Your Employer";

  return (
    <main style={page}>
      <div style={shell}>
        <section style={pageHeader}>
          <div>
            <h1 style={companyTitle}>{employerName}</h1>
            <h2 style={pageTitle}>Manage Leave</h2>
            <p style={pageSubtitle}>
              Submit leave requests and track your leave request history.
            </p>
          </div>

          <div style={headerActions}>
            <Link href="/employee" style={backDashboardButton}>
              ← Back to Dashboard
            </Link>
          </div>
        </section>

        <section style={summaryGrid}>
          <div style={summaryCard}>
            <p style={summaryLabel}>Employee</p>
            <h2 style={summaryValue}>{employee.full_name || "Employee"}</h2>
            <p style={summaryText}>
              {employee.employee_number || "No employee number"} ·{" "}
              {employee.department || "No department"}
            </p>
          </div>

          <div style={summaryCard}>
            <p style={summaryLabel}>Leave Balance</p>
            <h2 style={summaryValue}>
              {Number(employee.leave_balance || 0)} days
            </h2>
            <p style={summaryText}>
              This balance is read from your employee profile.
            </p>
          </div>

          <div style={summaryCard}>
            <p style={summaryLabel}>Pending</p>
            <h2 style={summaryValue}>{pendingCount}</h2>
            <p style={summaryText}>
              Pending requests will appear for employer review under HR
              Approvals.
            </p>
          </div>
        </section>

        <section style={layoutGrid}>
          <form style={formCard} onSubmit={submitLeaveRequest}>
            <div style={cardHeader}>
              <div>
                <h2 style={cardTitle}>New Leave Request</h2>
                <p style={muted}>
                  Complete the form below and submit it for employer approval.
                </p>
              </div>
            </div>

            <label style={label}>
              Leave Type
              <select
                style={input}
                value={leaveType}
                onChange={(event) => setLeaveType(event.target.value)}
              >
                <option>Annual leave</option>
                <option>Sick leave</option>
                <option>Family responsibility leave</option>
                <option>Unpaid leave</option>
                <option>Maternity leave</option>
                <option>Paternity leave</option>
                <option>Other leave</option>
              </select>
            </label>

            <div style={twoColumn}>
              <label style={label}>
                Start Date
                <input
                  type="date"
                  style={input}
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </label>

              <label style={label}>
                End Date
                <input
                  type="date"
                  style={input}
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </label>
            </div>

            <label style={label}>
              Reason or Note
              <textarea
                style={textarea}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Add a short note for your employer."
              />
            </label>

            <button type="submit" style={primaryButton} disabled={saving}>
              {saving ? "Submitting..." : "Submit Leave Request"}
            </button>
          </form>

          <section style={historyCard}>
            <div style={cardHeader}>
              <div>
                <h2 style={cardTitle}>Leave Request History</h2>
                <p style={muted}>
                  Your submitted leave requests and employer decisions appear
                  here.
                </p>
              </div>

              <button style={lightButton} onClick={loadPageData}>
                Refresh
              </button>
            </div>

            {requests.length === 0 ? (
              <div style={emptyState}>
                <p style={emptyTitle}>No leave requests yet</p>
                <p style={muted}>
                  Submit your first leave request using the form.
                </p>
              </div>
            ) : (
              <div style={requestList}>
                {requests.map((request) => (
                  <article key={request.id} style={requestCard}>
                    <div style={requestTop}>
                      <div>
                        <h3 style={requestTitle}>
                          {request.leave_type || "Leave request"}
                        </h3>

                        <p style={smallText}>
                          {formatDate(request.start_date)} to{" "}
                          {formatDate(request.end_date)}
                        </p>
                      </div>

                      <span style={statusStyle(request.status)}>
                        {request.status}
                      </span>
                    </div>

                    <p style={requestReason}>
                      {request.reason ||
                        request.employee_note ||
                        "No reason provided."}
                    </p>

                    {request.employer_note ? (
                      <div style={noteBox}>
                        <strong>Employer note</strong>
                        <p>{request.employer_note}</p>
                      </div>
                    ) : null}

                    <div style={requestFooter}>
                      <span>Submitted {formatDate(request.created_at)}</span>

                      {request.status === "Pending" ? (
                        <button
                          type="button"
                          style={cancelButton}
                          onClick={() => cancelRequest(request)}
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </article>
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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function statusStyle(status: ApprovalStatus): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 11px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 800,
  };

  if (status === "Approved") {
    return { ...base, background: "#dcfce7", color: "#166534" };
  }

  if (status === "Declined") {
    return { ...base, background: "#fee2e2", color: "#991b1b" };
  }

  if (status === "Cancelled") {
    return { ...base, background: "#e5e7eb", color: "#374151" };
  }

  return { ...base, background: "#fef3c7", color: "#92400e" };
}

const page: CSSProperties = {
  minHeight: "100vh",
  padding: "32px",
  fontFamily: "Arial, sans-serif",
  background: "#f4f7fb",
  color: "#102a43",
};

const shell: CSSProperties = {
  width: "100%",
  maxWidth: "1180px",
  margin: "0 auto",
};

const loadingCard: CSSProperties = {
  padding: "24px",
  background: "#fff",
  border: "1px solid #e3e8ef",
  borderRadius: "18px",
};

const pageHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  flexWrap: "wrap",
  padding: "34px",
  borderRadius: "22px",
  background: "#ffffff",
  border: "1px solid #e3e8ef",
  boxShadow: "0 10px 24px rgba(16, 42, 67, 0.06)",
  marginBottom: "24px",
};

const companyTitle: CSSProperties = {
  margin: "0 0 6px",
  fontSize: "34px",
  lineHeight: 1.1,
  color: "#0f766e",
  fontWeight: 900,
};

const pageTitle: CSSProperties = {
  margin: "0 0 14px",
  fontSize: "24px",
  color: "#172033",
};

const pageSubtitle: CSSProperties = {
  margin: 0,
  fontSize: "15px",
  color: "#52616f",
  lineHeight: 1.5,
};

const headerActions: CSSProperties = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
};

const backDashboardButton: CSSProperties = {
  padding: "11px 16px",
  borderRadius: "12px",
  background: "#0f766e",
  color: "#ffffff",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 800,
};

const summaryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "18px",
  marginBottom: "24px",
};

const summaryCard: CSSProperties = {
  padding: "22px",
  borderRadius: "18px",
  background: "#fff",
  border: "1px solid #e3e8ef",
  boxShadow: "0 10px 24px rgba(16, 42, 67, 0.06)",
};

const summaryLabel: CSSProperties = {
  margin: "0 0 8px",
  color: "#60758a",
  fontSize: "13px",
  fontWeight: 700,
};

const summaryValue: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "20px",
  color: "#102a43",
};

const summaryText: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.5,
  color: "#52616f",
};

const layoutGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(320px, 0.85fr) minmax(360px, 1.15fr)",
  gap: "18px",
  alignItems: "start",
};

const formCard: CSSProperties = {
  padding: "22px",
  borderRadius: "18px",
  background: "#fff",
  border: "1px solid #e3e8ef",
  boxShadow: "0 10px 24px rgba(16, 42, 67, 0.06)",
};

const historyCard: CSSProperties = {
  padding: "22px",
  borderRadius: "18px",
  background: "#fff",
  border: "1px solid #e3e8ef",
  boxShadow: "0 10px 24px rgba(16, 42, 67, 0.06)",
};

const cardHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  marginBottom: "18px",
  flexWrap: "wrap",
};

const cardTitle: CSSProperties = {
  margin: "0 0 6px",
  fontSize: "20px",
};

const muted: CSSProperties = {
  margin: 0,
  color: "#60758a",
  fontSize: "14px",
  lineHeight: 1.5,
};

const label: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "7px",
  fontSize: "13px",
  fontWeight: 800,
  color: "#334e68",
  marginBottom: "14px",
};

const input: CSSProperties = {
  width: "100%",
  border: "1px solid #d9e2ec",
  borderRadius: "12px",
  padding: "11px 12px",
  fontSize: "14px",
  outline: "none",
  background: "#fff",
  color: "#102a43",
};

const textarea: CSSProperties = {
  ...input,
  minHeight: "105px",
  resize: "vertical",
};

const twoColumn: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

const primaryButton: CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: "12px",
  border: "none",
  background: "#0f766e",
  color: "#fff",
  fontSize: "14px",
  fontWeight: 800,
  cursor: "pointer",
};

const lightButton: CSSProperties = {
  padding: "9px 13px",
  borderRadius: "12px",
  border: "1px solid #d9e2ec",
  background: "#f8fafc",
  color: "#0f766e",
  fontSize: "13px",
  fontWeight: 800,
  cursor: "pointer",
};

const emptyState: CSSProperties = {
  padding: "18px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
};

const emptyTitle: CSSProperties = {
  margin: "0 0 6px",
  fontWeight: 800,
};

const requestList: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const requestCard: CSSProperties = {
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #e3e8ef",
  background: "#ffffff",
};

const requestTop: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  marginBottom: "10px",
};

const requestTitle: CSSProperties = {
  margin: "0 0 4px",
  fontSize: "16px",
};

const smallText: CSSProperties = {
  margin: 0,
  fontSize: "13px",
  color: "#60758a",
};

const requestReason: CSSProperties = {
  margin: "0 0 12px",
  color: "#334e68",
  fontSize: "14px",
  lineHeight: 1.5,
};

const noteBox: CSSProperties = {
  padding: "12px",
  borderRadius: "12px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  marginBottom: "12px",
  fontSize: "13px",
  color: "#334e68",
};

const requestFooter: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  fontSize: "12px",
  color: "#60758a",
};

const cancelButton: CSSProperties = {
  padding: "8px 11px",
  borderRadius: "10px",
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#991b1b",
  fontSize: "12px",
  fontWeight: 800,
  cursor: "pointer",
};