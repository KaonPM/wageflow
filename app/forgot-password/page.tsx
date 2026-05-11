"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setMessage("Sending reset email...");

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Password reset email sent. Please check your inbox.");
  }

  return (
    <main style={page}>
      <section style={card}>
        <Link href="/login" style={backLink}>
          ← Back to login
        </Link>

        <h1 style={title}>Reset your password</h1>
        <p style={subtitle}>
          Enter your email address and we will send you a password reset link.
        </p>

        <form onSubmit={handleReset} style={form}>
          <input
            style={input}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit" style={button}>
            Send Reset Link
          </button>
        </form>

        {message && <p style={messageStyle}>{message}</p>}
      </section>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f8faf9",
  fontFamily: "Arial, sans-serif",
  padding: "20px",
};

const card = {
  width: "100%",
  maxWidth: "420px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "34px",
  boxShadow: "0 12px 30px rgba(0,0,0,0.06)",
};

const backLink = {
  display: "inline-block",
  marginBottom: "20px",
  fontSize: "13px",
  color: "#0f766e",
  textDecoration: "none",
};

const title = {
  fontSize: "24px",
  color: "#0f766e",
  marginBottom: "8px",
};

const subtitle = {
  fontSize: "14px",
  color: "#666",
  marginBottom: "24px",
  lineHeight: 1.5,
};

const form = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "14px",
};

const input = {
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  fontSize: "14px",
};

const button = {
  background: "#0f766e",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  padding: "12px",
  fontSize: "14px",
  cursor: "pointer",
};

const messageStyle = {
  marginTop: "16px",
  fontSize: "13px",
  color: "#666",
};