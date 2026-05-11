"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  function isStrongPassword(value: string) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (!isStrongPassword(password)) {
      setMessage(
        "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character."
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setMessage("Updating password...");

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      setMessage("Session expired. Please log in again.");
      router.push("/login");
      return;
    }

    const { error: passwordError } = await supabase.auth.updateUser({
      password,
    });

    if (passwordError) {
      setMessage(passwordError.message);
      return;
    }

    const { data: profile, error: profileFetchError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profileFetchError || !profile) {
      setMessage("Password updated, but your profile could not be loaded.");
      return;
    }

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", userId);

    if (profileUpdateError) {
      setMessage(profileUpdateError.message);
      return;
    }

    setMessage("Password updated successfully.");

    if (profile.role === "employer") {
      router.push("/employer");
    } else if (profile.role === "employee") {
      router.push("/employee");
    } else if (profile.role === "master_admin") {
      router.push("/master");
    } else {
      router.push("/login");
    }
  }

  return (
    <main style={page}>
      <section style={card}>
        <h1 style={title}>Change your password</h1>
        <p style={subtitle}>
          For security, please create a new password before continuing.
        </p>

        <form onSubmit={handleChangePassword} style={form}>
          <input
            style={input}
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            style={input}
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

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