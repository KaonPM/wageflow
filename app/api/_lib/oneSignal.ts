import type { SupabaseClient } from "@supabase/supabase-js";

type PushMessage = { externalIds: string[]; title: string; message: string; url?: string };

export async function sendOneSignalPush({ externalIds, title, message, url }: PushMessage) {
  const appId = process.env.ONESIGNAL_APP_ID || process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "3a95bd72-096e-4295-b39b-cdd0ef5814d3";
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  const recipients = [...new Set(externalIds.filter(Boolean))];

  if (!appId || !apiKey || recipients.length === 0) {
    return { sent: false, configured: Boolean(appId && apiKey), reason: recipients.length === 0 ? "no_recipients" : "not_configured" };
  }

  const response = await fetch("https://api.onesignal.com/notifications?c=push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Key ${apiKey}` },
    body: JSON.stringify({
      app_id: appId,
      target_channel: "push",
      include_aliases: { external_id: recipients },
      headings: { en: title },
      contents: { en: message },
      url,
    }),
  });

  if (!response.ok) {
    console.error("OneSignal push failed", response.status, (await response.text()).slice(0, 500));
    return { sent: false, configured: true, reason: "provider_error" };
  }

  return { sent: true, configured: true };
}

export async function employeePushRecipients(admin: SupabaseClient, businessId: string) {
  const { data: employees } = await admin.from("employees").select("id").eq("business_id", businessId).in("employment_status", ["active", "on leave"]);
  const ids = (employees || []).map((employee) => employee.id);
  if (ids.length === 0) return [] as string[];
  const { data: accounts } = await admin.from("employee_accounts").select("auth_user_id").in("employee_id", ids).eq("portal_enabled", true);
  return (accounts || []).map((account) => account.auth_user_id).filter((id): id is string => Boolean(id));
}
