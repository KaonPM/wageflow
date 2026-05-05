"use client";

import { useState } from "react";
import Link from "next/link";

export default function GetStartedGate() {
  const [accepted, setAccepted] = useState(false);

  return (
    <main style={page}>
      <div style={card}>
        <h1 style={title}>Before you get started</h1>

        <p style={text}>
          Please review and accept our Privacy Policy and Terms & Conditions before creating your account.
        </p>

        <div style={links}>
          <Link href="/privacy" style={link}>Privacy Policy</Link>
          <Link href="/terms" style={link}>Terms & Conditions</Link>
        </div>

        <label style={checkboxWrap}>
          <input
            type="checkbox"
            checked={accepted}
            onChange={() => setAccepted(!accepted)}
          />
          <span style={checkboxText}>
            I have read and agree to the Privacy Policy and Terms & Conditions
          </span>
        </label>

        <Link
          href={accepted ? "/signup" : "#"}
          style={accepted ? button : buttonDisabled}
        >
          Continue to Sign Up
        </Link>
      </div>
    </main>
  );
}

/* styles */
const page = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#f7fafc",
};

const card = {
  background: "#fff",
  padding: 40,
  borderRadius: 16,
  maxWidth: 500,
  width: "100%",
  textAlign: "center" as const,
};

const title = { marginBottom: 10 };

const text = {
  color: "#486581",
  marginBottom: 20,
};

const links = {
  display: "flex",
  justifyContent: "center",
  gap: 20,
  marginBottom: 20,
};

const link = {
  color: "#0f766e",
  fontWeight: 700,
  textDecoration: "none",
};

const checkboxWrap = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 20,
};

const checkboxText = { fontSize: 14 };

const button = {
  background: "#0f766e",
  color: "#fff",
  padding: "12px 20px",
  borderRadius: 999,
  textDecoration: "none",
  display: "inline-block",
};

const buttonDisabled = {
  ...button,
  background: "#bcccdc",
  pointerEvents: "none" as const,
};