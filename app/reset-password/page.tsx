"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { PasswordField } from "@/components/PasswordField";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function establishRecoverySession() {
      setMessage("Verifying your secure password link...");

      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const code = params.get("code");

      let authError: Error | null = null;

      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        authError = error;
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        authError = error;
      } else if (window.location.hash) {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          authError = error;
        }
      }

      if (!authError) {
        const { data, error } = await supabase.auth.getSession();
        authError = error;
        if (data.session && active) {
          window.history.replaceState({}, document.title, "/reset-password");
          setSessionReady(true);
          setMessage("");
          return;
        }
      }

      if (active) {
        setSessionReady(false);
        setMessage(
          authError?.message ||
            "This password link is invalid or has expired. Please request a new setup email."
        );
      }
    }

    void establishRecoverySession();
    return () => {
      active = false;
    };
  }, []);

  function isStrongPassword(value: string) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(
      value
    );
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();

    if (!sessionReady) {
      setMessage("Please open a new password link from your email.");
      return;
    }

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

    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.id);
    setMessage("Password updated successfully. Redirecting to login...");
    await supabase.auth.signOut();
    setTimeout(() => router.push("/login"), 1000);
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
          <PasswordField
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            inputStyle={input}
          />

          <PasswordField
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            inputStyle={input}
          />

          <button type="submit" style={button} disabled={!sessionReady}>
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
