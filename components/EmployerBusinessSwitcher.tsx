"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type BusinessOption = { id: string; business_name: string | null; trading_name: string | null; membershipRole: string };

export function EmployerBusinessSwitcher() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState("");
  const [switching, setSwitching] = useState(false);
  const [message, setMessage] = useState("");

  const authenticatedRequest = useCallback(async (body?: { businessId: string }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: "Your session has expired." };
    const response = await fetch("/api/employer/businesses", {
      method: body ? "PATCH" : "GET",
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${session.access_token}` },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    return response.ok ? result : { error: result.error || "Business access could not be loaded." };
  }, []);

  const loadBusinesses = useCallback(async () => {
    const result = await authenticatedRequest();
    if (result.error) { setMessage(result.error); return; }
    setBusinesses(result.businesses || []);
    setActiveBusinessId(result.activeBusinessId || result.businesses?.[0]?.id || "");
  }, [authenticatedRequest]);

  useEffect(() => { loadBusinesses(); }, [loadBusinesses]);

  async function switchBusiness(businessId: string) {
    if (!businessId || businessId === activeBusinessId) return;
    setSwitching(true);
    setMessage("");
    const result = await authenticatedRequest({ businessId });
    if (result.error) { setMessage(result.error); setSwitching(false); return; }
    setActiveBusinessId(businessId);
    router.replace("/employer");
    router.refresh();
  }

  if (businesses.length === 0 && !message) return null;
  return <div className="employer-business-bar">
    <div><strong>Active business</strong><span>Payroll and HR data are isolated to this selection.</span></div>
    {businesses.length > 0 && <select aria-label="Active business" value={activeBusinessId} disabled={switching} onChange={(event) => switchBusiness(event.target.value)}>
      {businesses.map((business) => <option key={business.id} value={business.id}>{business.trading_name || business.business_name || "Unnamed business"}</option>)}
    </select>}
    {message && <span className="employer-business-error">{message}</span>}
  </div>;
}
