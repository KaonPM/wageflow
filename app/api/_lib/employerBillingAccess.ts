export function hasEmployerBillingPermission(profile: { role?: string | null; admin_permissions?: unknown }) {
  if (String(profile.role || "").toLowerCase() !== "employer_admin") return true;
  return Array.isArray(profile.admin_permissions) && profile.admin_permissions.map(String).includes("settings");
}
