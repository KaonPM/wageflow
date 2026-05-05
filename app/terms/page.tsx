"use client";

import { useState } from "react";
import Link from "next/link";

export default function TermsPage() {
  const [accepted, setAccepted] = useState(false);

  function handleContinue() {
    if (!accepted) return;

    localStorage.setItem("wageflow_terms_accepted", "true");
    localStorage.setItem("wageflow_terms_accepted_at", new Date().toISOString());

    window.location.href = "/signup";
  }

  return (
    <main style={page}>
      <div style={card}>
        <Link href="/" style={homeButton}>← Home</Link>

        <h1>WageFlow Terms & Conditions</h1>
        <p><strong>Last updated:</strong> 05 May 2026</p>

        <h3>1. Agreement</h3>
        <p>
          These Terms & Conditions constitute a binding agreement between
          WageFlow, a product of Lesedi Smart Solutions (Pty) Ltd and the
          subscribing employer ("the Client").
        </p>

        <h3>2. Nature of Service</h3>
        <p>
          WageFlow provides a digital platform for generating payslips and
          maintaining employee records. WageFlow does not act as a payroll
          bureau, accountant or registered tax practitioner.
        </p>

        <h3>3. Client Responsibilities</h3>
        <p>
          The Client is solely responsible for the accuracy of all employee,
          payroll and statutory information captured on the platform,
          including but not limited to salaries, deductions, UIF and tax data.
        </p>

        <h3>4. Compliance Disclaimer</h3>
        <p>
          WageFlow does not submit statutory returns to SARS, UIF or any
          regulatory authority. The Client remains fully responsible for all
          legal and regulatory compliance.
        </p>

        <h3>5. Fees and Payment</h3>
        <p>
          A once-off setup fee is payable upon onboarding. Monthly subscription
          fees are payable in advance. Services may be suspended if payment is
          not received within 14 days of the due date.
        </p>

        <h3>6. Limitation of Liability</h3>
        <p>
          WageFlow shall not be held liable for any loss, penalties, damages or
          compliance issues arising from incorrect data entered by the Client or
          misuse of the platform.
        </p>

        <h3>7. Data Usage</h3>
        <p>
          WageFlow processes employee and business data strictly for the purpose
          of providing the service and in accordance with applicable data
          protection laws.
        </p>

        <h3>8. Termination</h3>
        <p>
          Either party may terminate the service with 30 days written notice.
          Access may be revoked immediately in cases of non-payment or misuse.
        </p>

        <h3>9. Governing Law</h3>
        <p>
          This agreement is governed by the laws of the Republic of South Africa.
        </p>

        <h3>10. Acceptance</h3>
        <p>
          By proceeding to submit a WageFlow setup request and use WageFlow, the
          Client confirms that they have read, understood and agreed to these
          Terms & Conditions and the WageFlow Privacy Policy.
        </p>

        <div style={acceptBox}>
          <label style={checkWrap}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={() => setAccepted(!accepted)}
            />
            <span>
              I have read and agree to the WageFlow Privacy Policy and Terms & Conditions.
            </span>
          </label>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!accepted}
            style={accepted ? continueButton : disabledButton}
          >
            Continue to Setup Request
          </button>
        </div>

        <div style={actionRow}>
          <Link href="/privacy" style={secondaryButton}>
            ← Back to Privacy Policy
          </Link>
        </div>
      </div>
    </main>
  );
}

const page = {
  padding: 40,
  background: "#f7fafc",
  minHeight: "100vh",
  fontFamily: "Arial, sans-serif",
  color: "#102a43",
};

const card = {
  maxWidth: 800,
  margin: "0 auto",
  background: "#ffffff",
  padding: 34,
  borderRadius: 24,
  border: "1px solid #d9e2ec",
  boxShadow: "0 18px 45px rgba(15, 118, 110, 0.10)",
};

const homeButton = {
  display: "inline-block",
  background: "#0f766e",
  color: "#ffffff",
  padding: "10px 18px",
  borderRadius: 999,
  textDecoration: "none",
  fontWeight: 800,
  marginBottom: 22,
};

const acceptBox = {
  marginTop: 30,
  padding: 20,
  borderRadius: 18,
  background: "#ecfdf5",
  border: "1px solid #99f6e4",
};

const checkWrap = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  color: "#334e68",
  lineHeight: 1.5,
  marginBottom: 18,
};

const continueButton = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "14px 24px",
  borderRadius: 999,
  border: "none",
  fontWeight: 800,
  cursor: "pointer",
};

const disabledButton = {
  ...continueButton,
  background: "#bcccdc",
  cursor: "not-allowed",
};

const actionRow = {
  display: "flex",
  justifyContent: "flex-start",
  marginTop: 22,
};

const secondaryButton = {
  display: "inline-block",
  background: "#ffffff",
  color: "#0f766e",
  padding: "12px 20px",
  borderRadius: 999,
  border: "1px solid #0f766e",
  textDecoration: "none",
  fontWeight: 800,
};