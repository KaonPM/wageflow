"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

const pathPermissions: Array<[string, string]> = [
  ["/employer/employees", "employees"],
  ["/employer/payroll", "payroll"],
  ["/employer/payslips", "payslips"],
  ["/employer/hr/documents", "hr"],
  ["/employer/hr", "hr"],
  ["/employer/reports", "reports"],
  ["/employer/settings", "settings"],
];

export function EmployerPermissionGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState("Checking access…");

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile, error } = await supabase.from("profiles").select("role,admin_permissions").eq("id", user.id).maybeSingle();
      if (error || !profile) { if (active) setMessage("We could not verify your access."); return; }
      if (String(profile.role).toLowerCase() === "employer") { if (active) setAllowed(true); return; }
      if (pathname === "/employer" || pathname === "/employer/admins") {
        if (pathname === "/employer/admins") router.replace("/employer"); else if (active) setAllowed(true);
        return;
      }
      const permission = pathPermissions.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1];
      const permissions = Array.isArray(profile.admin_permissions) ? profile.admin_permissions.map(String) : [];
      if (!permission || permissions.includes(permission)) { if (active) setAllowed(true); return; }
      if (active) setMessage("Your employer account has not been granted access to this workspace.");
    })();
    return () => { active = false; };
  }, [pathname, router]);

  if (!allowed) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "Arial, sans-serif", color: "#475569", background: "#f8fafc" }}><p>{message}</p></main>;
  return children;
}
