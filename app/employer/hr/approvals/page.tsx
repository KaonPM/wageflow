"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { showAppMessage } from "@/app/lib/appMessage";

type ApprovalStatus = "Pending" | "Approved" | "Declined" | "Cancelled";

type Employee = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  employee_number?: string | null;
  department?: string | null;
  job_title?: string | null;
};

type ApprovalRequest = {
  id: string;
  business_id: string | null;
  employee_id: string;
  request_type: string;
  leave_type: string | null;
  start_date: string | null;
  end_date: string | null;
  overtime_date: string | null;
  overtime_start_time: string | null;
  overtime_end_time: string | null;
  overtime_hours: number | null;
  reason: string | null;
  status: ApprovalStatus;
  employee_note: string | null;
  employer_note: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export default function HRApprovalsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [employerNote, setEmployerNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPageData();
  }, []);

  const selectedEmployeeRequests = useMemo(() => {
    if (!selectedEmployee) return [];
    return requests.filter((request) => request.employee_id === selectedEmployee.id);
  }, [requests, selectedEmployee]);

  async function loadPageData() {
    setLoading(true);

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (employeeError) {
      showAppMessage(`Could not load employees: ${employeeError.message}`);
      setLoading(false);
      return;
    }

    const { data: requestData, error: requestError } = await supabase
      .from("approval_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (requestError) {
      showAppMessage(`Could not load approval requests: ${requestError.message}`);
      setLoading(false);
      return;
    }

    setEmployees((employeeData || []) as Employee[]);
    setRequests((requestData || []) as ApprovalRequest[]);
    setLoading(false);
  }

  function getEmployeeName(employee: Employee | null | undefined) {
    if (!employee) return "Unknown employee";
    if (employee.full_name) return employee.full_name;
    if (employee.name) return employee.name;

    const combinedName = `${employee.first_name || ""} ${employee.last_name || ""}`.trim();
    return combinedName || "Unnamed employee";
  }

  function getEmployeeRequests(employeeId: string) {
    return requests.filter((request) => request.employee_id === employeeId);
  }

  function getPendingCount(employeeId: string) {
    return getEmployeeRequests(employeeId).filter((request) => request.status === "Pending").length;
  }

  function getLatestRequest(employeeId: string) {
    return getEmployeeRequests(employeeId)[0] || null;
  }

  function viewEmployeeRequests(employee: Employee) {
    setSelectedEmployee(employee);
    setSelectedRequest(null);
    setEmployerNote("");
  }

  function viewRequest(request: ApprovalRequest) {
    setSelectedRequest(request);
    setEmployerNote(request.employer_note || "");
  }

  async function saveDecision(status: "Approved" | "Declined") {
    if (!selectedRequest) {
      showAppMessage("Please select a request first.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("approval_requests")
      .update({
        status,
        employer_note: employerNote,
        approved_by: "Employer admin",
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedRequest.id);

    if (error) {
      showAppMessage(`Decision was not saved: ${error.message}`);
      setSaving(false);
      return;
    }

    await loadPageData();

    setSaving(false);
    setSelectedRequest(null);
    showAppMessage(`Request ${status.toLowerCase()} successfully.`);
  }

  function requestSummary(request: ApprovalRequest) {
    if (request.request_type === "Leave request") {
      return `${request.leave_type || "Leave"} from ${formatDate(request.start_date)} to ${formatDate(
        request.end_date
      )}`;
    }

    if (request.request_type === "Overtime request") {
      return `${formatDate(request.overtime_date)} from ${
        request.overtime_start_time || "N/A"
      } to ${request.overtime_end_time || "N/A"}${
        request.overtime_hours ? `, ${request.overtime_hours} hours` : ""
      }`;
    }

    return request.reason || request.employee_note || "Other HR request";
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <p style={styles.muted}>Loading HR approvals...</p>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <h1 style={styles.title}>HR Approvals</h1>
          <p style={styles.subtitle}>
            Review leave, overtime and other HR requests by employee.
          </p>
        </div>

        <Link href="/employer/hr" style={styles.backButton}>
           ← Back to HR Records
        </Link>
      </section>

      <section style={styles.card}>
        <div style={styles.cardTop}>
          <div>
            <h2 style={styles.cardTitle}>Employee Approval Overview</h2>
            <p style={styles.muted}>
              Select an employee to view requests and make an approval decision.
            </p>
          </div>

          <button style={styles.lightButton} onClick={loadPageData}>
            Refresh
          </button>
        </div>

        {employees.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>No employees found</p>
            <p style={styles.muted}>Employees must be added before requests can be reviewed.</p>
          </div>
        ) : (
          <div style={styles.table}>
            <div style={styles.employeeTableHeader}>
              <span>Employee</span>
              <span>Pending</span>
              <span>Latest Status</span>
              <span>Action</span>
            </div>

            {employees.map((employee) => {
              const latest = getLatestRequest(employee.id);
              const pendingCount = getPendingCount(employee.id);

              return (
                <div key={employee.id} style={styles.employeeTableRow}>
                  <div>
                    <strong>{getEmployeeName(employee)}</strong>
                    <p style={styles.smallText}>
                      {employee.employee_number || "No employee number"}
                    </p>
                    <p style={styles.smallText}>
                      {employee.department || "No department"}
                    </p>
                  </div>

                  <div>
                    <span style={styles.pendingBadge}>{pendingCount}</span>
                  </div>

                  <div>
                    {latest ? (
                      <>
                        <span style={statusStyle(latest.status)}>{latest.status}</span>
                        <p style={styles.smallText}>{requestSummary(latest)}</p>
                      </>
                    ) : (
                      <p style={styles.smallText}>No requests yet</p>
                    )}
                  </div>

                  <div>
                    <button
                      style={styles.primaryButton}
                      onClick={() => viewEmployeeRequests(employee)}
                    >
                      View Requests
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {selectedEmployee && (
        <section style={styles.card}>
          <div style={styles.cardTop}>
            <div>
              <h2 style={styles.cardTitle}>
                Requests for {getEmployeeName(selectedEmployee)}
              </h2>
              <p style={styles.muted}>
                Review request history, then open a request to approve or decline it.
              </p>
            </div>

            <button
              style={styles.lightButton}
              onClick={() => {
                setSelectedEmployee(null);
                setSelectedRequest(null);
              }}
            >
              Close
            </button>
          </div>

          {selectedEmployeeRequests.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyTitle}>No requests for this employee</p>
              <p style={styles.muted}>
                Once the employee submits a request, it will appear here.
              </p>
            </div>
          ) : (
            <div style={styles.requestList}>
              {selectedEmployeeRequests.map((request) => (
                <div key={request.id} style={styles.requestCard}>
                  <div>
                    <div style={styles.requestTopLine}>
                      <strong>{request.request_type}</strong>
                      <span style={statusStyle(request.status)}>{request.status}</span>
                    </div>

                    <p style={styles.requestSummary}>{requestSummary(request)}</p>
                    <p style={styles.smallText}>
                      Requested: {formatDate(request.created_at)}
                    </p>
                    <p style={styles.smallText}>
                      Reason: {request.reason || request.employee_note || "No reason captured"}
                    </p>

                    {request.employer_note && (
                      <p style={styles.notePreview}>
                        Employer note: {request.employer_note}
                      </p>
                    )}
                  </div>

                  <button style={styles.primaryButton} onClick={() => viewRequest(request)}>
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {selectedEmployee && selectedRequest && (
        <section style={styles.card}>
          <div style={styles.cardTop}>
            <div>
              <h2 style={styles.cardTitle}>Approval Decision</h2>
              <p style={styles.muted}>
                Employee: {getEmployeeName(selectedEmployee)}
              </p>
            </div>

            <button
              style={styles.lightButton}
              onClick={() => {
                setSelectedRequest(null);
                setEmployerNote("");
              }}
            >
              Close Decision
            </button>
          </div>

          <div style={styles.formGrid}>
            <Detail label="Employee Number" value={selectedEmployee.employee_number || "N/A"} />
            <Detail label="Department" value={selectedEmployee.department || "N/A"} />
            <Detail label="Request Type" value={selectedRequest.request_type} />
            <Detail label="Leave Type" value={selectedRequest.leave_type || "N/A"} />
            <Detail label="Start Date" value={formatDate(selectedRequest.start_date)} />
            <Detail label="End Date" value={formatDate(selectedRequest.end_date)} />
            <Detail label="Overtime Date" value={formatDate(selectedRequest.overtime_date)} />
            <Detail label="Start Time" value={selectedRequest.overtime_start_time || "N/A"} />
            <Detail label="End Time" value={selectedRequest.overtime_end_time || "N/A"} />
            <Detail
              label="Total Overtime Hours"
              value={
                selectedRequest.overtime_hours !== null &&
                selectedRequest.overtime_hours !== undefined
                  ? String(selectedRequest.overtime_hours)
                  : "N/A"
              }
            />
            <Detail label="Current Status" value={selectedRequest.status} />
            <Detail label="Decision Date" value={formatDate(selectedRequest.approved_at)} />
          </div>

          <label style={styles.label}>
            Employee Reason
            <textarea
              style={styles.textarea}
              value={selectedRequest.reason || selectedRequest.employee_note || ""}
              readOnly
            />
          </label>

          <label style={styles.label}>
            Employer Note
            <textarea
              style={styles.textarea}
              value={employerNote}
              onChange={(event) => setEmployerNote(event.target.value)}
              placeholder="Add a clear approval note or decline reason..."
            />
          </label>

          <div style={styles.decisionActions}>
            <button
              style={styles.approveButton}
              onClick={() => saveDecision("Approved")}
              disabled={saving}
            >
              {saving ? "Saving..." : "Approve Request"}
            </button>

            <button
              style={styles.declineButton}
              onClick={() => saveDecision("Declined")}
              disabled={saving}
            >
              {saving ? "Saving..." : "Decline Request"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.detailBox}>
      <p style={styles.detailLabel}>{label}</p>
      <p style={styles.detailValue}>{value}</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "N/A";

  return new Date(value).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusStyle(status: ApprovalStatus): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "7px 11px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 800,
  };

  if (status === "Approved") {
    return { ...base, background: "#e8f5f2", color: "#225f54" };
  }

  if (status === "Declined") {
    return { ...base, background: "#fdecec", color: "#9f1d1d" };
  }

  if (status === "Cancelled") {
    return { ...base, background: "#f1f5f9", color: "#475569" };
  }

  return { ...base, background: "#fff7e6", color: "#92400e" };
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "38px 42px",
    background: "#f4f7f6",
    color: "#1f2937",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "18px",
    alignItems: "flex-start",
    marginBottom: "26px",
  },
  title: {
    margin: 0,
    fontSize: "34px",
    color: "#2f7d6d",
    fontWeight: 800,
  },
  subtitle: {
    marginTop: "10px",
    color: "#667085",
    fontSize: "15px",
  },
  backButton: {
    background: "#2f7d6d",
    color: "#ffffff",
    padding: "13px 18px",
    borderRadius: "12px",
    textDecoration: "none",
    fontWeight: 800,
    whiteSpace: "nowrap",
    boxShadow: "0 8px 18px rgba(47, 125, 109, 0.22)",
  },
  card: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 12px 28px rgba(16, 24, 40, 0.06)",
    border: "1px solid #e6ecea",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "20px",
  },
  cardTitle: {
    margin: 0,
    fontSize: "22px",
    color: "#2c2333",
    fontWeight: 700,
  },
  muted: {
    margin: "6px 0 0",
    color: "#667085",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  smallText: {
    margin: "5px 0 0",
    color: "#667085",
    fontSize: "13px",
  },
  emptyState: {
    background: "#f8fbfa",
    border: "1px dashed #bad8d1",
    borderRadius: "16px",
    padding: "20px",
  },
  emptyTitle: {
    margin: 0,
    fontWeight: 800,
    color: "#2c2333",
  },
  table: {
    width: "100%",
    overflowX: "auto",
  },
  employeeTableHeader: {
    minWidth: "860px",
    display: "grid",
    gridTemplateColumns: "2fr 0.8fr 1.6fr 1fr",
    gap: "16px",
    padding: "14px 8px",
    borderBottom: "1px solid #e5e7eb",
    fontWeight: 800,
    color: "#2c2333",
  },
  employeeTableRow: {
    minWidth: "860px",
    display: "grid",
    gridTemplateColumns: "2fr 0.8fr 1.6fr 1fr",
    gap: "16px",
    alignItems: "center",
    padding: "18px 8px",
    borderBottom: "1px solid #eef2f1",
  },
  pendingBadge: {
    display: "inline-block",
    minWidth: "34px",
    textAlign: "center",
    background: "#fff7e6",
    color: "#92400e",
    padding: "8px 12px",
    borderRadius: "999px",
    fontWeight: 800,
  },
  primaryButton: {
    border: "none",
    background: "#2f7d6d",
    color: "#ffffff",
    padding: "12px 17px",
    borderRadius: "12px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(47, 125, 109, 0.18)",
  },
  lightButton: {
    border: "1px solid #cfd8d5",
    background: "#ffffff",
    color: "#35514c",
    padding: "11px 16px",
    borderRadius: "11px",
    fontWeight: 800,
    cursor: "pointer",
  },
  requestList: {
    display: "grid",
    gap: "14px",
  },
  requestCard: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "16px",
    alignItems: "center",
    background: "#f8fbfa",
    border: "1px solid #e6ecea",
    borderRadius: "16px",
    padding: "18px",
  },
  requestTopLine: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    color: "#2c2333",
  },
  requestSummary: {
    margin: "8px 0 0",
    color: "#1f2937",
    fontSize: "14px",
    fontWeight: 700,
  },
  notePreview: {
    margin: "10px 0 0",
    color: "#35514c",
    background: "#ffffff",
    border: "1px solid #e6ecea",
    borderRadius: "12px",
    padding: "10px",
    fontSize: "13px",
    fontWeight: 700,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginTop: "18px",
    marginBottom: "16px",
  },
  label: {
    display: "grid",
    gap: "8px",
    fontWeight: 800,
    color: "#2c2333",
    fontSize: "14px",
    marginBottom: "16px",
  },
  textarea: {
    border: "1px solid #d0d5dd",
    borderRadius: "12px",
    padding: "12px",
    fontSize: "14px",
    background: "#ffffff",
    color: "#101828",
    minHeight: "100px",
    resize: "vertical",
  },
  detailBox: {
    border: "1px solid #e6ecea",
    borderRadius: "14px",
    padding: "13px",
    background: "#f8fbfa",
  },
  detailLabel: {
    margin: 0,
    color: "#667085",
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "uppercase",
  },
  detailValue: {
    margin: "6px 0 0",
    color: "#1f2937",
    fontSize: "14px",
    fontWeight: 700,
  },
  decisionActions: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  approveButton: {
    border: "none",
    background: "#2f7d6d",
    color: "#ffffff",
    padding: "13px 18px",
    borderRadius: "12px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(47, 125, 109, 0.18)",
  },
  declineButton: {
    border: "1px solid #f2c4c4",
    background: "#fff5f5",
    color: "#9f1d1d",
    padding: "13px 18px",
    borderRadius: "12px",
    fontWeight: 800,
    cursor: "pointer",
  },
};