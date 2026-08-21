import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Server authentication is not configured.");
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function requireRole(request: Request, allowedRoles: string[]) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: "Authentication required.", status: 401 } as const;
  const admin = getSupabaseAdmin();
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return { error: "Invalid or expired session.", status: 401 } as const;
  const { data: profile, error: profileError } = await admin.from("profiles").select("role, business_id, access_status, admin_permissions").eq("id", user.id).single();
  if (profileError || !profile || !allowedRoles.includes(String(profile.role).toLowerCase())) return { error: "You are not authorised to perform this action.", status: 403 } as const;
  if (profile.access_status && !["active", "approved"].includes(String(profile.access_status).toLowerCase())) return { error: "This account is not active.", status: 403 } as const;
  return { admin, user, profile } as const;
}
