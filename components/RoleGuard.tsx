"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

export function RoleGuard({ allowedRoles, children }: { allowedRoles:string[]; children:ReactNode }) {
  const router = useRouter();
  const rolesKey = allowedRoles.join("|");
  const [authorised, setAuthorised] = useState(false);
  const [message, setMessage] = useState("Checking your access…");

  useEffect(() => {
    let active = true;

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, access_status")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !profile) {
        if (active) setMessage("We could not verify this account profile.");
        return;
      }

      const role = String(profile.role || "").trim().toLowerCase();
      const status = String(profile.access_status || "active").trim().toLowerCase();
      const portalByRole: Record<string, string> = {
        master: "/master",
        master_admin: "/master",
        employer: "/employer",
        employee: "/employee",
      };

      if (!["active", "approved"].includes(status)) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (!rolesKey.split("|").includes(role)) {
        // A wrong portal must never clear the valid session used by another tab.
        router.replace(portalByRole[role] || "/login");
        return;
      }

      if (active) setAuthorised(true);
    })();

    return () => {
      active = false;
    };
  }, [rolesKey, router]);
  if(!authorised)return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",fontFamily:"Arial,sans-serif",background:"#f8fafc",color:"#475569"}}><p>{message}</p></main>;
  return children;
}
