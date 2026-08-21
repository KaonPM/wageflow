import type { SupabaseClient } from "@supabase/supabase-js";

export function isBillablePlan(plan: string | null | undefined) {
  return ["starter", "growth"].includes(String(plan || "").trim().toLowerCase());
}

export function isGrowthPlan(plan: string | null | undefined) {
  return /growth|pro|elite/i.test(plan || "");
}

export async function hasGrowthSubscription(admin: SupabaseClient, businessId: string) {
  const { data } = await admin
    .from("subscriptions")
    .select("plan_name, subscription_status")
    .eq("business_id", businessId)
    .maybeSingle();

  return Boolean(data && String(data.subscription_status || "active").toLowerCase() === "active" && isGrowthPlan(data.plan_name));
}
