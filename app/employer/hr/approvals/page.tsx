"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type ApprovalStatus = "Pending" | "Approved" | "Declined" | "Cancelled";

type ApprovalRequest = {
  id: string;
  business_id: string | null;
  employee_id: string;
  employee_name?: string | null;
  employee_number?: string | null;
  department?: string | null;
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
};

export default function EmployerHRApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ApprovalRequest | null>(null);
  const [decisionStatus, setDecisionStatus] = useState<ApprovalStatus>("Approved");
  const [employerNote, setEmployerNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("approval_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setRequests((data || []) as ApprovalRequest[]);
    setLoading(false);
  }

  function openView(request: ApprovalRequest) {
    setSelected(request);
    setEmployerNote(request.employer_note || "");
    setDecisionStatus(request.status === "Declined" ? "Declined" : "Approved");
  }

  function openApprove(request: ApprovalRequest) {
    setSelected(request);
    setDecisionStatus("Approved");
    setEmployerNote(request.employer_note || "");
  }

  function openDecline(request: ApprovalRequest) {
    setSelected(request);
    setDecisionStatus("Declined");
    setEmployerNote(request.employer_note || "");
  }

  async function saveDecision() {
    if (!selected) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("approval_requests")
      .update({
        status: decisionStatus,
        employer_note: employerNote,
        approved_by: "Employer",
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", selected.id);

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setMessage("Decision saved successfully.");
    setSaving(false);
    setSelected(null);
    await loadRequests();
  }

  const pendingCount = useMemo(
    () => requests.filter((item) => item.status === "Pending").length,
    [requests]
  );

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">HR Approvals</h1>
            <p className="mt-1 text-sm text-slate-600">
              Review employee leave, overtime, and other HR requests.
            </p>
          </div>

          <Link
            href="/employer/hr"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
          >
            Back to HR Records
          </Link>
        </div>

        <section className="mb-6 grid gap-4 sm:grid-cols-4">
          <StatCard label="Total requests" value={requests.length} />
          <StatCard label="Pending" value={pendingCount} />
          <StatCard
            label="Approved"
            value={requests.filter((item) => item.status === "Approved").length}
          />
          <StatCard
            label="Declined"
            value={requests.filter((item) => item.status === "Declined").length}
          />
        </section>

        {message && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {message}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Approval inbox
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading approvals...</div>
          ) : requests.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              No approval requests found yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Employee</th>
                    <th className="px-5 py-3">Request type</th>
                    <th className="px-5 py-3">Request details</th>
                    <th className="px-5 py-3">Requested date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {requests.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">
                          {request.employee_name || "Employee"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {request.employee_number || "No employee number"}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {request.request_type}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {getRequestSummary(request)}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(request.created_at)}
                      </td>

                      <td className="px-5 py-4">
                        <StatusPill status={request.status} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openView(request)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            View
                          </button>

                          <button
                            onClick={() => openApprove(request)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            Approve
                          </button>

                          <button
                            onClick={() => openDecline(request)}
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                          >
                            Decline
                          </button>

                          <button
                            onClick={() => openView(request)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Edit note
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Request details
                </h2>
                <p className="text-sm text-slate-500">
                  Review the full employee request and save your decision.
                </p>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Detail label="Employee name" value={selected.employee_name || "Employee"} />
              <Detail label="Employee number" value={selected.employee_number || "Not captured"} />
              <Detail label="Department" value={selected.department || "Not captured"} />
              <Detail label="Request type" value={selected.request_type} />
              <Detail label="Leave type" value={selected.leave_type || "Not applicable"} />
              <Detail label="Start date" value={formatDate(selected.start_date)} />
              <Detail label="End date" value={formatDate(selected.end_date)} />
              <Detail label="Overtime date" value={formatDate(selected.overtime_date)} />
              <Detail label="Start time" value={selected.overtime_start_time || "Not applicable"} />
              <Detail label="End time" value={selected.overtime_end_time || "Not applicable"} />
              <Detail
                label="Total overtime hours"
                value={
                  selected.overtime_hours !== null && selected.overtime_hours !== undefined
                    ? String(selected.overtime_hours)
                    : "Not applicable"
                }
              />
              <Detail label="Status" value={selected.status} />
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Employee reason
              </p>
              <p className="text-sm text-slate-700">
                {selected.reason || selected.employee_note || "No reason captured."}
              </p>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 p-4">
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Decision status
              </label>

              <select
                value={decisionStatus}
                onChange={(event) =>
                  setDecisionStatus(event.target.value as ApprovalStatus)
                }
                className="mb-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                <option value="Approved">Approved</option>
                <option value="Declined">Declined</option>
              </select>

              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Employer note
              </label>

              <textarea
                value={employerNote}
                onChange={(event) => setEmployerNote(event.target.value)}
                rows={4}
                placeholder="Add a note or reason for the employee..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />

              <button
                onClick={saveDecision}
                disabled={saving}
                className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save decision"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-slate-800">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: ApprovalStatus }) {
  const classes =
    status === "Approved"
      ? "bg-emerald-100 text-emerald-700"
      : status === "Declined"
      ? "bg-rose-100 text-rose-700"
      : status === "Cancelled"
      ? "bg-slate-200 text-slate-700"
      : "bg-amber-100 text-amber-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>
      {status}
    </span>
  );
}

function getRequestSummary(request: ApprovalRequest) {
  if (request.request_type === "Leave request") {
    return `${request.leave_type || "Leave"} from ${formatDate(
      request.start_date
    )} to ${formatDate(request.end_date)}`;
  }

  if (request.request_type === "Overtime request") {
    return `${formatDate(request.overtime_date)} from ${
      request.overtime_start_time || "-"
    } to ${request.overtime_end_time || "-"} ${
      request.overtime_hours ? `(${request.overtime_hours} hrs)` : ""
    }`;
  }

  return request.reason || request.employee_note || "Other HR request";
}

function formatDate(value: string | null) {
  if (!value) return "Not captured";

  return new Date(value).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}