"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { showAppMessage } from "@/app/lib/appMessage";
import { Pagination } from "@/components/Pagination";

type Request = {
  id: string;
  business_name: string;
  contact_person: string;
  email: string;
  phone: string;
  selected_package: string;
  business_type: string;
  number_of_employees: number;
  notes: string;
  status: string;
  lifecycle_status: string;
  created_at: string;
};

export default function WageFlowRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage,setCurrentPage]=useState(1); const pageSize=10;
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);

    const { data, error } = await supabase
      .from("wageflow_setup_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showAppMessage(error.message);
      setLoading(false);
      return;
    }

    setRequests(data || []);
    setLoading(false);
  }

  async function runMasterAction(action: "prepare_approval" | "finalize_approval" | "decline_activation" | "reject", requestId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: "Your session has expired. Please sign in again." };
    const response = await fetch("/api/setup-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action, requestId }),
    });
    const result = await response.json().catch(() => ({}));
    return response.ok ? result : { error: result.error || "The setup request could not be updated." };
  }

  async function approveRequest(request: Request) {
    const confirmed = window.confirm(
      `Approve setup request for ${request.business_name}?`
    );

    if (!confirmed) return;

    const prepared = await runMasterAction("prepare_approval", request.id);
    if (prepared.error) { showAppMessage(prepared.error || "Initial payment could not be prepared."); return; }
    showAppMessage("Initial payment request prepared and queued for delivery.");
    fetchRequests();
  }

  async function activateRequest(request: Request) {
    if (!window.confirm(`Activate ${request.business_name} now that its payment is verified?`)) return;
    const activated = await runMasterAction("finalize_approval", request.id);
    if (activated.error || !activated.businessId) { showAppMessage(activated.error || "Activation could not be completed."); return; }
    showAppMessage("Business activated. Employer onboarding and secure password setup delivery are queued for retryable processing.");
    fetchRequests();
  }

  async function rejectRequest(id: string) {
    const result = await runMasterAction("reject", id);
    if (result.error) {
      showAppMessage(result.error);
      return;
    }

    fetchRequests();
  }

  const filteredRequests=filter === "all" ? requests : requests.filter((request) => request.lifecycle_status === filter);
  const totalPages=Math.max(1,Math.ceil(filteredRequests.length/pageSize));const safePage=Math.min(currentPage,totalPages);const visibleRequests=filteredRequests.slice((safePage-1)*pageSize,safePage*pageSize);

  return (
    <main style={page}>
      <div style={topBar}>
        <Link href="/master" style={backButton}>
           Back to Dashboard
        </Link>
      </div>

      <h1 style={title}>WageFlow Setup Requests</h1>

      <p style={subtitle}>Review applications, initial-payment progress and final activation decisions.</p>
      <select value={filter} onChange={(event) => { setFilter(event.target.value); setCurrentPage(1); }} style={filterSelect}>
        <option value="all">All application history</option><option value="submitted">New review</option><option value="awaiting_initial_payment">Payment outstanding</option><option value="payment_verified">Final approval needed</option><option value="activation_declined">Financial resolution</option><option value="activated">Activated</option><option value="rejected">Rejected</option><option value="archived">Archived</option>
      </select>

      <section style={card}>
        {loading ? (
          <p>Loading requests...</p>
        ) : filteredRequests.length === 0 ? (
          <p>No setup requests yet.</p>
        ) : (
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Business</th>
                  <th style={th}>Contact</th>
                  <th style={th}>Package</th>
                  <th style={th}>Employees</th>
                  <th style={th}>Status</th>
                  <th style={th}>Submitted</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {visibleRequests.map((request) => (
                  <tr key={request.id}>
                    <td style={td}>
                      <strong>{request.business_name}</strong>
                      <br />
                      <span style={muted}>
                        {request.business_type || "Business setup request"}
                      </span>
                    </td>

                    <td style={td}>
                      {request.contact_person}
                      <br />
                      <span style={muted}>{request.email}</span>
                      <br />
                      <span style={muted}>{request.phone}</span>
                    </td>

                    <td style={td}>{request.selected_package}</td>

                    <td style={td}>{request.number_of_employees || "-"}</td>

                    <td style={td}>
                      <span style={badge(request.lifecycle_status)}>
                        {request.lifecycle_status.replaceAll("_", " ")}
                      </span>
                    </td>

                    <td style={td}>
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>

                    <td style={td}>
                      {request.lifecycle_status === "submitted" ? (
                        <div style={actions}>
                          <button
                            style={approveBtn}
                            onClick={() => approveRequest(request)}
                          >
                            Approve & request payment
                          </button>

                          <button
                            style={rejectBtn}
                            onClick={() => rejectRequest(request.id)}
                          >
                            Reject
                          </button>
                        </div>
                      ) : request.lifecycle_status === "payment_verified" ? (
                        <div style={actions}><button style={approveBtn} onClick={() => activateRequest(request)}>Final activation approval</button><button style={rejectBtn} onClick={() => void runMasterAction("decline_activation", request.id).then(fetchRequests)}>Decline activation</button></div>
                      ) : (
                        <span style={muted}>Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={safePage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredRequests.length} pageSize={pageSize}/>
          </div>
        )}
      </section>
    </main>
  );
}

const page = {
  padding: "32px",
  background: "#f8fafc",
  minHeight: "100vh",
};

const topBar = {
  display: "flex",
  justifyContent: "flex-end",
  marginBottom: "20px",
};

const backButton = {
  background: "#0f766e",
  color: "#ffffff",
  textDecoration: "none",
  padding: "10px 16px",
  borderRadius: "999px",
  fontWeight: 800,
  fontSize: "14px",
};

const title = {
  fontSize: "32px",
  fontWeight: 700,
  color: "#0f172a",
};

const subtitle = {
  marginTop: "8px",
  marginBottom: "24px",
  color: "#475569",
};

const filterSelect = { padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", marginBottom: "18px", background: "#fff" };

const card = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "24px",
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
};

const td = {
  padding: "14px",
  borderBottom: "1px solid #e2e8f0",
  verticalAlign: "top" as const,
};

const muted = {
  color: "#64748b",
  fontSize: "13px",
};

const actions = {
  display: "flex",
  gap: "8px",
};

const approveBtn = {
  background: "#0f766e",
  color: "#ffffff",
  border: "none",
  borderRadius: "8px",
  padding: "8px 12px",
  cursor: "pointer",
};

const rejectBtn = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "none",
  borderRadius: "8px",
  padding: "8px 12px",
  cursor: "pointer",
};

function badge(status: string) {
  const base = {
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: 600,
  };

  if (status === "Approved") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (status === "Rejected") {
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
