"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

const growthOnlyPaths = [
  "/employer/hr",
  "/employer/reports",
  "/employer/payroll/history",
  "/employer/payroll/payments",
  "/employer/payroll/compliance",
  "/employee/leave",
  "/employee/overtime",
  "/employee/hr-records",
];

function requiresGrowth(pathname: string) {
  return growthOnlyPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function hasGrowthAccess(plan: string | null) {
  const normalised = String(plan || "").toLowerCase();
  return normalised.includes("growth") || normalised.includes("pro") || normalised.includes("elite");
}

export function PlanAccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [checking, setChecking] = useState(requiresGrowth(pathname));
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      if (!requiresGrowth(pathname)) {
        if (active) {
          setAllowed(true);
          setChecking(false);
        }
        return;
      }

      setChecking(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        if (active) {
          setAllowed(false);
          setChecking(false);
        }
        return;
      }

      const response = await fetch("/api/subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await response.json().catch(() => null) as { plan?: string | null; active?: boolean } | null;

      if (active) {
        setAllowed(result?.active !== false && hasGrowthAccess(result?.plan || null));
        setChecking(false);
      }
    }

    void checkAccess();
    return () => { active = false; };
  }, [pathname]);

  if (checking) return <main style={statePage}>Checking plan access…</main>;
  if (allowed) return <>{children}</>;

  return (
    <main style={statePage}>
      <section style={card}>
        <p style={eyebrow}>Growth feature</p>
        <h1 style={title}>Upgrade to Growth to use this area</h1>
        <p style={text}>Growth includes HR workflows, reports, compliance tools and team notifications for up to 20 employees.</p>
      </section>
    </main>
  );
}

const statePage = { minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f8fafc", color: "#0f172a", fontFamily: "Arial, sans-serif" };
const card = { width: "min(100%, 560px)", padding: 32, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 18, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)" };
const eyebrow = { margin: 0, color: "#0f766e", fontWeight: 800, fontSize: 13, textTransform: "uppercase" as const, letterSpacing: "0.08em" };
const title = { margin: "12px 0", fontSize: 28, lineHeight: 1.2 };
const text = { margin: 0, color: "#475569", lineHeight: 1.6 };
