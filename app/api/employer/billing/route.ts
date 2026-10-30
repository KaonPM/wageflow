import { NextResponse } from "next/server";
import { requireRole } from "../../_lib/authorization";
import { hasEmployerBillingPermission } from "../../_lib/employerBillingAccess";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isBillablePlan } from "../../_lib/subscription";

const BILLING_ROLES = ["employer", "employer_admin"];

async function requireActiveBusiness(request: Request) {
  const access = await requireRole(request, BILLING_ROLES);
  if ("error" in access) return { ok: false as const, error: access.error, status: access.status };
  if (!hasEmployerBillingPermission(access.profile)) return { ok: false as const, error: "Your employer administrator account has not been granted billing access.", status: 403 };

  const businessId = String(access.profile.business_id || "");
  if (!businessId) return { ok: false as const, error: "Select an active business before opening billing.", status: 400 };

  const { data: membership, error } = await access.admin
    .from("employer_business_memberships")
    .select("membership_role")
    .eq("employer_id", access.user.id)
    .eq("business_id", businessId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !membership) return { ok: false as const, error: "You do not have access to this business billing account.", status: 403 };
  return { ok: true as const, ...access, businessId, membership };
}

export async function GET(request: Request) {
  const access = await requireActiveBusiness(request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const [businessResult, subscriptionResult, statementsResult, latestStatementResult, employeeResult, openStatementResult, initialPaymentResult] = await Promise.all([
    access.admin.from("businesses").select("id,business_name,trading_name,email,address,registration_number,status").eq("id", access.businessId).maybeSingle(),
    access.admin.from("subscriptions").select("id,plan_name,monthly_fee,setup_fee,setup_paid,subscription_status,created_at").eq("business_id", access.businessId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    access.admin.from("subscription_statements").select("id,statement_type,statement_month,amount,status,recipient_email,paid_at,emailed_at,payment_reference,created_at,payment_provider").eq("business_id", access.businessId).order("created_at", { ascending: false }).limit(60),
    access.admin.from("subscription_statements").select("statement_month").eq("business_id", access.businessId).order("statement_month", { ascending: false }).limit(1).maybeSingle(),
    access.admin.from("employees").select("id", { count: "exact", head: true }).eq("business_id", access.businessId).neq("status", "deleted"),
    loadOpenStatements(access.admin, access.businessId),
    access.admin.from("application_initial_payments").select("id,subscription_id,setup_amount,first_month_amount,total_amount,currency,covered_month,status,verified_at,created_at").eq("business_id", access.businessId).eq("status", "verified").order("verified_at", { ascending: false }).limit(60),
  ]);

  const error = businessResult.error || subscriptionResult.error || statementsResult.error || latestStatementResult.error || employeeResult.error || openStatementResult.error || initialPaymentResult.error;
  if (error || !businessResult.data) return NextResponse.json({ error: "Billing details could not be loaded." }, { status: 500 });

  const subscription = subscriptionResult.data;
  const recentStatements = statementsResult.data || [];
  const openStatements = (openStatementResult.data || []).filter((statement) => Number(statement.amount) > 0);
  const statements = [...openStatements, ...recentStatements.filter((statement) => !openStatements.some((open) => open.id === statement.id))]
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const nextInvoiceDate = subscription && subscription.subscription_status === "active" && isBillablePlan(subscription.plan_name) && Number(subscription.monthly_fee) > 0
    ? getNextInvoiceDate(subscription.created_at, latestStatementResult.data?.statement_month || null)
    : null;

  return NextResponse.json({
    business: businessResult.data,
    subscription,
    initialPayments: initialPaymentResult.data || [],
    statements,
    employeeCount: employeeResult.count || 0,
    openBalance: openStatements.reduce((total, statement) => total + Number(statement.amount || 0), 0),
    nextInvoiceDate,
    membershipRole: access.membership.membership_role,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const access = await requireActiveBusiness(request);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json().catch(() => null) as { email?: string; address?: string } | null;
  const email = String(body?.email || "").trim().toLowerCase();
  const address = String(body?.address || "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid billing email address." }, { status: 400 });
  if (email.length > 320 || address.length > 500) return NextResponse.json({ error: "Billing details are too long." }, { status: 400 });

  const { data, error } = await access.admin
    .from("businesses")
    .update({ email, address: address || null })
    .eq("id", access.businessId)
    .select("id,email,address")
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Billing details could not be saved." }, { status: 500 });
  return NextResponse.json({ business: data });
}

async function loadOpenStatements(admin: SupabaseClient, businessId: string) {
  const statements: Array<{ id: string; statement_type: "setup" | "monthly"; statement_month: string; amount: number; status: string; recipient_email: string | null; paid_at: string | null; emailed_at: string | null; payment_reference: string | null; created_at: string; payment_provider: string | null }> = [];
  const pageSize = 500;
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await admin.from("subscription_statements")
      .select("id,statement_type,statement_month,amount,status,recipient_email,paid_at,emailed_at,payment_reference,created_at,payment_provider")
      .eq("business_id", businessId).is("paid_at", null)
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(start, start + pageSize - 1);
    if (error) return { data: null, error };
    statements.push(...(data || []) as typeof statements);
    if (!data || data.length < pageSize) return { data: statements, error: null };
  }
}

function getNextInvoiceDate(createdAt: string | null, latestStatementMonth: string | null) {
  const today = new Date();
  const latest = latestStatementMonth ? new Date(`${latestStatementMonth}T00:00:00Z`) : null;
  const created = createdAt ? new Date(createdAt) : null;
  const basis = [today, latest, created].filter((date): date is Date => date instanceof Date && !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const next = new Date(Date.UTC(basis.getUTCFullYear(), basis.getUTCMonth() + 1, 1));
  return next.toISOString().slice(0, 10);
}
