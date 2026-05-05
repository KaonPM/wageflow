"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

export default function SetupRequestPage() {
  const [accepted, setAccepted] = useState(false);
  const [acceptedAt, setAcceptedAt] = useState("");

  const [form, setForm] = useState({
    ownerName: "",
    businessName: "",
    email: "",
    phone: "",
    employeeCount: "",
    plan: "Starter - R149/month",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const storedAccepted = localStorage.getItem("wageflow_terms_accepted");
    const storedAcceptedAt = localStorage.getItem("wageflow_terms_accepted_at");

    if (storedAccepted === "true" && storedAcceptedAt) {
      setAccepted(true);
      setAcceptedAt(storedAcceptedAt);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");

    if (!accepted) {
      setError("Please accept the Privacy Policy and Terms & Conditions first.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("setup_requests").insert({
      owner_name: form.ownerName,
      business_name: form.businessName,
      email: form.email,
      phone: form.phone,
      employee_count: Number(form.employeeCount),
      selected_plan: form.plan,
      message: form.message,
      status: "pending_setup",
      setup_fee_required: true,
      setup_fee_amount: 499,
      accepted_terms: true,
      accepted_privacy: true,
      accepted_at: acceptedAt,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(
      "Your WageFlow setup request has been submitted. We will review your details and contact you for onboarding and setup."
    );

    setForm({
      ownerName: "",
      businessName: "",
      email: "",
      phone: "",
      employeeCount: "",
      plan: "Starter - R149/month",
      message: "",
    });

    setLoading(false);
  }

  return (
    <main style={page}>
      <section style={card}>
        <Link href="/" style={homeButton}>← Home</Link>

        <img src="/wageflow-logo.png" alt="WageFlow Logo" style={logo} />

        <h1 style={title}>Request WageFlow Setup</h1>

        <p style={subtitle}>
          Submit your details so the WageFlow team can prepare your business profile,
          employer access, payslip setup, and staff record structure.
        </p>

        {!accepted && (
          <div style={warningBox}>
            Please accept the Privacy Policy and Terms & Conditions first.
            <br />
            <Link href="/get-started" style={warningLink}>
              Go to acceptance page
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} style={formStyle}>
          <input
            style={input}
            placeholder="Owner / responsible person name"
            value={form.ownerName}
            onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
            required
          />

          <input
            style={input}
            placeholder="Business name"
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            required
          />

          <input
            style={input}
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />

          <input
            style={input}
            placeholder="Phone / WhatsApp number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />

          <input
            style={input}
            type="number"
            placeholder="Number of employees"
            value={form.employeeCount}
            onChange={(e) => setForm({ ...form, employeeCount: e.target.value })}
            required
            min={1}
          />

          <select
            style={input}
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value })}
            required
          >
            <option>Starter - R149/month</option>
            <option>Growth - R249/month</option>
          </select>

          <textarea
            style={textarea}
            placeholder="Anything we should know before setup?"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />

          <div style={setupNotice}>
            <strong>Once-off setup fee: R499</strong>
            <br />
            Setup includes business profile setup, employer account setup, company logo
            upload for payslip watermark, initial employee structure, payslip template
            configuration, and guided onboarding support.
          </div>

          <p style={termsText}>
            Terms accepted: {accepted ? "Yes" : "No"}
            {acceptedAt && <><br />Accepted on: {new Date(acceptedAt).toLocaleString()}</>}
          </p>

          {error && <p style={errorText}>{error}</p>}
          {success && <p style={successText}>{success}</p>}

          <button type="submit" style={submitButton} disabled={loading || !accepted}>
            {loading ? "Submitting..." : "Submit Setup Request"}
          </button>
        </form>
      </section>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #ecfdf5 0%, #f7fafc 100%)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "40px 20px",
  fontFamily: "Arial, sans-serif",
};

const card = {
  width: "100%",
  maxWidth: 640,
  background: "#ffffff",
  padding: 34,
  borderRadius: 24,
  border: "1px solid #d9e2ec",
  boxShadow: "0 18px 45px rgba(15, 118, 110, 0.12)",
};

const homeButton = {
  display: "inline-block",
  background: "#0f766e",
  color: "#ffffff",
  padding: "10px 18px",
  borderRadius: 999,
  textDecoration: "none",
  fontWeight: 800,
  marginBottom: 20,
};

const logo = {
  width: 220,
  height: "auto",
  display: "block",
  margin: "0 auto 20px",
};

const title = {
  textAlign: "center" as const,
  color: "#102a43",
  marginBottom: 10,
};

const subtitle = {
  textAlign: "center" as const,
  color: "#486581",
  lineHeight: 1.6,
  marginBottom: 24,
};

const formStyle = {
  display: "grid",
  gap: 14,
};

const input = {
  padding: 14,
  borderRadius: 12,
  border: "1px solid #bcccdc",
  fontSize: 15,
};

const textarea = {
  padding: 14,
  borderRadius: 12,
  border: "1px solid #bcccdc",
  fontSize: 15,
  minHeight: 120,
};

const setupNotice = {
  background: "#ecfdf5",
  border: "1px solid #99f6e4",
  borderRadius: 14,
  padding: 16,
  color: "#334e68",
  lineHeight: 1.6,
};

const warningBox = {
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  padding: 16,
  borderRadius: 14,
  color: "#9a3412",
  marginBottom: 20,
  textAlign: "center" as const,
};

const warningLink = {
  color: "#0f766e",
  fontWeight: 800,
};

const termsText = {
  fontSize: 13,
  color: "#486581",
  lineHeight: 1.5,
};

const submitButton = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "14px 22px",
  borderRadius: 999,
  border: "none",
  fontWeight: 800,
  cursor: "pointer",
};

const errorText = {
  color: "#b91c1c",
  fontSize: 14,
};

const successText = {
  color: "#047857",
  fontSize: 14,
};