"use client";

import { useState } from "react";
import Link from "next/link";

export default function GetStartedPage() {
  const [accepted, setAccepted] = useState(false);

  function handleContinue() {
    if (!accepted) return;

    localStorage.setItem("wageflow_terms_accepted", "true");
    localStorage.setItem("wageflow_terms_accepted_at", new Date().toISOString());

    window.location.href = "/signup";
  }

  return (
    <main style={page}>
      <section style={card}>
        <Link href="/" style={homeButton}>← Home</Link>

        <img src="/wageflow-logo.png" alt="WageFlow Logo" style={logo} />

        <h1 style={title}>Before we start your WageFlow setup</h1>

        <p style={text}>
          WageFlow setup is completed by the WageFlow team after your request is submitted.
          Please review and accept the Privacy Policy and Terms & Conditions before continuing.
        </p>

        <div style={linkRow}>
          <Link href="/privacy" style={docLink}>Privacy Policy</Link>
          <Link href="/terms" style={docLink}>Terms & Conditions</Link>
        </div>

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
          style={accepted ? button : disabledButton}
        >
          Continue to Setup Request
        </button>
      </section>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #ecfdf5 0%, #f7fafc 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  fontFamily: "Arial, sans-serif",
};

const card = {
  width: "100%",
  maxWidth: 620,
  background: "#ffffff",
  padding: 34,
  borderRadius: 24,
  border: "1px solid #d9e2ec",
  boxShadow: "0 18px 45px rgba(15, 118, 110, 0.12)",
  textAlign: "center" as const,
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

const logo = {
  width: 220,
  height: "auto",
  display: "block",
  margin: "0 auto 18px",
};

const title = {
  color: "#102a43",
  marginBottom: 12,
};

const text = {
  color: "#486581",
  lineHeight: 1.7,
};

const linkRow = {
  display: "flex",
  justifyContent: "center",
  gap: 16,
  flexWrap: "wrap" as const,
  margin: "24px 0",
};

const docLink = {
  color: "#0f766e",
  fontWeight: 800,
};

const checkWrap = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  textAlign: "left" as const,
  color: "#334e68",
  marginBottom: 24,
  lineHeight: 1.5,
};

const button = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "14px 24px",
  borderRadius: 999,
  border: "none",
  fontWeight: 800,
  cursor: "pointer",
};

const disabledButton = {
  ...button,
  background: "#bcccdc",
  cursor: "not-allowed",
};