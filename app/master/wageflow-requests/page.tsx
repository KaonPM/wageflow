"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

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
      alert(error.message);
      setLoading(false);
      return;
    }

    setRequests(data || []);
    setLoading(false);
  }

  function getMonthlyFee(packageName: string | null) {
    if (!packageName) return 149;

    if (packageName.includes("Growth")) return 249;
    if (packageName.includes("Elite")) return 499;

    return 149;
  }

  async function approveRequest(request: Request) {
    const confirmed = window.confirm(
      `Approve setup request for ${request.business_name}?`
    );

    if (!confirmed) return;

    const { data: existingBusiness, error: checkError } = await supabase
      .from("businesses")
      .select("id")
      .eq("source_request_id", request.id)
      .maybeSingle();

    if (checkError) {
      alert(checkError.message);
      return;
    }

    if (existingBusiness) {
      const { error: settingsError } = await supabase
        .from("business_settings")
        .upsert(
          {
            business_id: existingBusiness.id,
            primary_color: "#0f766e",
            secondary_color: "#d4af37",
            paye_enabled: true,
            uif_enabled: true,
            pension_enabled: false,
            medical_aid_enabled: false,
            show_leave_balances: true,
            default_payment_method: "Bank Transfer",
          },
          { onConflict: "business_id" }
        );

      if (settingsError) {
        alert(settingsError.message);
        return;
      }

      const { error: subscriptionError } = await supabase
        .from("subscriptions")
        .upsert(
          {
            business_id: existingBusiness.id,
            plan_name: request.selected_package || "Starter",
            monthly_fee: getMonthlyFee(request.selected_package),
            setup_fee: 499,
            setup_paid: false,
            subscription_status: "active",
          },
          { onConflict: "business_id" }
        );

      if (subscriptionError) {
        alert(subscriptionError.message);
        return;
      }

      const { error: updateOnlyError } = await supabase
        .from("wageflow_setup_requests")
        .update({
          status: "Approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (updateOnlyError) {
        alert(updateOnlyError.message);
        return;
      }

      fetchRequests();
      return;
    }

    const { data: newBusiness, error: businessError } = await supabase
      .from("businesses")
      .insert({
        business_name: request.business_name,
        email: request.email,
        phone: request.phone,
        status: "Active",
        source_request_id: request.id,
        selected_package: request.selected_package,
        number_of_employees: request.number_of_employees,
      })
      .select()
      .single();

    if (businessError || !newBusiness) {
      alert(businessError?.message || "Failed to create business.");
      return;
    }

    const { error: settingsError } = await supabase
      .from("business_settings")
      .insert({
        business_id: newBusiness.id,
        primary_color: "#0f766e",
        secondary_color: "#d4af37",
        paye_enabled: true,
        uif_enabled: true,
        pension_enabled: false,
        medical_aid_enabled: false,
        show_leave_balances: true,
        default_payment_method: "Bank Transfer",
      });

    if (settingsError) {
      alert(settingsError.message);
      return;
    }

    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .insert({
        business_id: newBusiness.id,
        plan_name: request.selected_package || "Starter",
        monthly_fee: getMonthlyFee(request.selected_package),
        setup_fee: 499,
        setup_paid: false,
        subscription_status: "active",
      });

    if (subscriptionError) {
      alert(subscriptionError.message);
      return;
    }

    const { error: requestError } = await supabase
      .from("wageflow_setup_requests")
      .update({
        status: "Approved",
        approved_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    if (requestError) {
      alert(requestError.message);
      return;
    }

    fetchRequests();
  }

  async function rejectRequest(id: string) {
    const { error } = await supabase
      .from("wageflow_setup_requests")
      .update({
        status: "Rejected",
        rejected_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchRequests();
  }

  return (
    <main style={page}>
      <div style={topBar}>
        <Link href="/master" style={backButton}>
          ← Back to Dashboard
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
                {requests.map((request) => (
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