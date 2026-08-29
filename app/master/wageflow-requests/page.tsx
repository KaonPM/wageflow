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
  created_at: string;
};

export default function WageFlowRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage,setCurrentPage]=useState(1); const pageSize=10;

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);

    const { data, error } = await supabase
      .from("wageflow_setup_requests")
      .select("*")
      .eq("status", "Pending")
      .order("created_at", { ascending: false });

    if (error) {
      showAppMessage(error.message);
      setLoading(false);
      return;
    }

    setRequests(data || []);
    setLoading(false);
  }

  async function runMasterAction(action: "prepare_approval" | "finalize_approval" | "reject", requestId: string) {
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

  async function createEmployerLogin(request: Request, businessId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { showAppMessage("Your session has expired. Please sign in again."); return false; }
    const loginResponse = await fetch("/api/contact/create-employer-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        businessId,
        email: request.email,
        name: request.contact_person,
        businessName: request.business_name,
      }),
    });

    const loginResult = await loginResponse.json().catch(() => ({}));
    if (!loginResponse.ok || loginResult.notificationSent !== true) {

      showAppMessage(
        loginResult.error ||
          "The business was created, but the employer login email could not be sent."
      );

      return false;
    }

    showAppMessage(loginResult.message || "Employer setup email accepted for delivery.");
    return true;
  }

  async function approveRequest(request: Request) {
    const confirmed = window.confirm(
      `Approve setup request for ${request.business_name}?`
    );

    if (!confirmed) return;

    const prepared = await runMasterAction("prepare_approval", request.id);
    if (prepared.error || !prepared.businessId) {
      showAppMessage(prepared.error || "Business onboarding could not be prepared.");
      return;
    }

    const loginCreated = await createEmployerLogin(request, String(prepared.businessId));

    if (!loginCreated) return;

    const approved = await runMasterAction("finalize_approval", request.id);
    if (approved.error) { showAppMessage(approved.error); return; }

    showAppMessage("Employer approved and setup email accepted for delivery.");
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

  const totalPages=Math.max(1,Math.ceil(requests.length/pageSize));const safePage=Math.min(currentPage,totalPages);const visibleRequests=requests.slice((safePage-1)*pageSize,safePage*pageSize);

  return (
    <main style={page}>
      <div style={topBar}>
        <Link href="/master" style={backButton}>
           Back to Dashboard
        </Link>
      </div>

      <h1 style={title}>WageFlow Setup Requests</h1>

      <p style={subtitle}>
        Review new WageFlow employer requests before activating their business
        account.
      </p>

      <section style={card}>
        {loading ? (
          <p>Loading requests...</p>
        ) : requests.length === 0 ? (
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
                      <span style={badge(request.status)}>
                        {request.status}
                      </span>
                    </td>

                    <td style={td}>
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>

                    <td style={td}>
                      {request.status === "Pending" ? (
                        <div style={actions}>
                          <button
                            style={approveBtn}
                            onClick={() => approveRequest(request)}
                          >
                            Approve
                          </button>

                          <button
                            style={rejectBtn}
                            onClick={() => rejectRequest(request.id)}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={muted}>Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={safePage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={requests.length} pageSize={pageSize}/>
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
