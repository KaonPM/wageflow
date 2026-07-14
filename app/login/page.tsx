"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage("Signing in...");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    const userId = data.user?.id;

    if (!userId) {
      setMessage("Login failed. Please try again.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, must_change_password")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      setMessage("Your account profile is not set up yet.");
      return;
    }

    if (profile.must_change_password) {
      router.push("/change-password");
      return;
    }

    if (profile.role === "master_admin") {
      router.push("/master");
    } else if (profile.role === "employer") {
      router.push("/employer");
    } else if (profile.role === "employee") {
      router.push("/employee");
    } else {
      setMessage("Unknown user role.");
    }
  }

  return (
    <main style={page}>
      <section style={card}>
        <Link href="/" style={homeButton}>
           ← Back to Home
        </Link>

        <h1 style={title}>Log in to WageFlow</h1>
        <p style={subtitle}>Access your payroll and staff records.</p>

        <form onSubmit={handleLogin} style={form}>
          <input
            style={input}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            style={input}
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          <button
           type="button"
           onClick={() => setShowPassword(!showPassword)}
          >
          {showPassword ? "Hide" : "Show"}
          </button>

          <button type="submit" style={button}>
            Log In
          </button>
        </form>

        <Link href="/forgot-password" style={forgotLink}>
          Forgot password?
        </Link>

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

const homeButton = {
  display: "inline-block",
  marginBottom: "20px",
  fontSize: "13px",
  color: "#0f766e",
  textDecoration: "none",
  fontWeight: "600",
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

const forgotLink = {
  display: "inline-block",
  marginTop: "14px",
  fontSize: "13px",
  color: "#0f766e",
  textDecoration: "none",
};

const messageStyle = {
  marginTop: "16px",
  fontSize: "13px",
  color: "#666",
};