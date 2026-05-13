"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function isStrongPassword(value: string) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(
      value
    );
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();

    if (!isStrongPassword(password)) {
      setMessage(
        "Password must be at least 8 characters and include uppercase, lowercase, a number and a special character."
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setMessage("Updating password...");

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Password updated successfully. Redirecting to login...");

    setTimeout(() => {
      router.push("/login");
    }, 1500);
  }

  return (
    <main style={page}>
      <section style={card}>
        <h1 style={title}>Create a new password</h1>
        <p style={subtitle}>
          Your new password must include uppercase, lowercase, a number, and a
          special character.
        </p>

        <form onSubmit={handleUpdatePassword} style={form}>
          <input
           type={showPassword ? "text" : "password"}
           placeholder="New password"
          />

        <button type="button" onClick={() => setShowPassword(!showPassword)}>
        {showPassword ? "Hide" : "Show"}
        </button>

          <input
         type={showConfirmPassword ? "text" : "password"}
         placeholder="Confirm password"
        />

        <button
         type="button"
         onClick={() => setShowConfirmPassword(!showConfirmPassword)}
         >
         {showConfirmPassword ? "Hide" : "Show"}
        </button>

          <button type="submit" style={button}>
            Update Password
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