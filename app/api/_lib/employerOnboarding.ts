import "server-only";
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { queueEmail } from "./applicationWorkflow";

type OnboardingContext = { applicationId: string; businessId: string; email: string; contactName: string; businessName: string; initialPaymentId: string | null };

export class EmployerOnboardingError extends Error {
  constructor(message: string, readonly requiresManualRecovery = false) { super(message); }
}

async function findUserByEmail(admin: SupabaseClient, email: string) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new EmployerOnboardingError("Employer account lookup failed.");
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 1000) break;
  }
  return null;
}

async function getContext(admin: SupabaseClient, applicationId: string, businessId: string): Promise<OnboardingContext> {
  const { data: application, error: applicationError } = await admin.from("wageflow_setup_requests").select("id,email,contact_person,business_name,lifecycle_status").eq("id", applicationId).maybeSingle();
  const { data: payment, error: paymentError } = await admin.from("application_initial_payments").select("id,business_id,subscription_id,status").eq("application_id", applicationId).maybeSingle();
  if (applicationError || paymentError || !application || !payment || payment.business_id !== businessId || application.lifecycle_status !== "activated" || payment.status !== "verified") throw new EmployerOnboardingError("Employer onboarding is no longer eligible.", true);
  const { data: business, error: businessError } = await admin.from("businesses").select("id,status,employer_id").eq("id", businessId).maybeSingle();
  const { data: subscription, error: subscriptionError } = await admin.from("subscriptions").select("subscription_status").eq("id", payment.subscription_id).maybeSingle();
  if (businessError || subscriptionError || !business || !subscription || String(business.status).toLowerCase() !== "active" || String(subscription.subscription_status).toLowerCase() !== "active") throw new EmployerOnboardingError("Employer onboarding is no longer eligible.", true);
  return { applicationId, businessId, email: String(application.email).toLowerCase(), contactName: String(application.contact_person || "there"), businessName: String(application.business_name || "WageFlow employer"), initialPaymentId: payment.id };
}

export async function provisionEmployerOnboarding(admin: SupabaseClient, input: { applicationId: string; businessId: string; claimToken?: string }) {
  const claimToken = input.claimToken || randomUUID();
  const { data: claimed, error: claimError } = await admin.rpc("claim_application_employer_onboarding", { application_id_input: input.applicationId, business_id_input: input.businessId, worker_claim: claimToken, lease_seconds: 300 });
  if (claimError || !claimed) throw new EmployerOnboardingError("Employer provisioning could not be claimed.");
  if (claimed.status === "ineligible") throw new EmployerOnboardingError("Employer onboarding is no longer eligible.", true);
  if (claimed.status === "manual_recovery_required") throw new EmployerOnboardingError("Employer onboarding requires Master/Admin recovery.", true);
  if (claimed.status === "password_setup_delivered") return { context: await getContext(admin, input.applicationId, input.businessId), employerId: String(claimed.employer_id), alreadyProvisioned: true };
  if (claimed.provisioning_claim !== claimToken) throw new EmployerOnboardingError("Employer provisioning is currently leased by another worker.");

  try {
    const context = await getContext(admin, input.applicationId, input.businessId);
    let user = await findUserByEmail(admin, context.email);
    if (user && String(user.user_metadata?.wageflow_onboarding_application_id || "") !== context.applicationId) {
      const { data: profile } = await admin.from("profiles").select("business_id,role").eq("id", user.id).maybeSingle();
      const { data: membership } = await admin.from("employer_business_memberships").select("membership_role,is_active").eq("employer_id", user.id).eq("business_id", context.businessId).maybeSingle();
      if (!profile || String(profile.role).toLowerCase() !== "employer" || !membership?.is_active || String(membership.membership_role).toLowerCase() !== "owner") throw new EmployerOnboardingError("The contact email belongs to an unrelated identity.", true);
    }
    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({ email: context.email, email_confirm: true, user_metadata: { wageflow_onboarding_application_id: context.applicationId } });
      if (error || !data.user) {
        user = await findUserByEmail(admin, context.email);
        if (!user || String(user.user_metadata?.wageflow_onboarding_application_id || "") !== context.applicationId) throw new EmployerOnboardingError("Employer account creation could not be confirmed.", true);
      } else user = data.user;
    }
    const { data: business, error: businessError } = await admin.from("businesses").select("employer_id").eq("id", context.businessId).single();
    if (businessError) throw new EmployerOnboardingError("Business ownership could not be checked.");
    if (business.employer_id && business.employer_id !== user.id) throw new EmployerOnboardingError("The business already has a different employer identity.", true);
    const { data: profile, error: profileLookupError } = await admin.from("profiles").select("business_id,role").eq("id", user.id).maybeSingle();
    if (profileLookupError) throw new EmployerOnboardingError("Employer profile could not be checked.");
    if (profile && String(profile.role).toLowerCase() !== "employer") throw new EmployerOnboardingError("The contact identity cannot be converted to an employer account.", true);
    if (profile?.business_id && profile.business_id !== context.businessId) {
      const { data: membership } = await admin.from("employer_business_memberships").select("is_active").eq("employer_id", user.id).eq("business_id", context.businessId).maybeSingle();
      if (!membership?.is_active) throw new EmployerOnboardingError("The contact identity is not authorised for this business.", true);
    }
    const { error: profileError } = await admin.from("profiles").upsert({ id: user.id, email: context.email, full_name: context.contactName, role: "employer", access_status: "active", business_id: profile?.business_id || context.businessId, must_change_password: true });
    if (profileError) throw new EmployerOnboardingError("Employer profile setup failed.");
    const { error: membershipError } = await admin.from("employer_business_memberships").upsert({ employer_id: user.id, business_id: context.businessId, membership_role: "owner", is_active: true }, { onConflict: "employer_id,business_id" });
    if (membershipError) throw new EmployerOnboardingError("Employer membership setup failed.");
    const { error: ownerError } = await admin.from("businesses").update({ employer_id: user.id }).eq("id", context.businessId).is("employer_id", null);
    if (ownerError) throw new EmployerOnboardingError("Employer ownership setup failed.");
    const { data: completed, error: completeError } = await admin.rpc("complete_application_employer_onboarding", { application_id_input: context.applicationId, worker_claim: claimToken, employer_id_input: user.id });
    if (completeError || !completed) throw new EmployerOnboardingError("Employer provisioning completion could not be recorded.");
    return { context, employerId: user.id, alreadyProvisioned: false };
  } catch (error) {
    const onboardingError = error instanceof EmployerOnboardingError ? error : new EmployerOnboardingError("Employer provisioning failed.");
    await admin.rpc("fail_application_employer_onboarding", { application_id_input: input.applicationId, worker_claim: claimToken, error_detail: onboardingError.message, requires_manual_recovery: onboardingError.requiresManualRecovery });
    throw onboardingError;
  }
}

export async function queueEmployerPasswordSetup(admin: SupabaseClient, context: OnboardingContext, recovery = false) {
  const suffix = recovery ? `:recovery:${randomUUID()}` : "";
  const queued = await queueEmail(admin, { idempotencyKey: `employer-password-setup:${context.applicationId}${suffix}`, eventType: "employer_password_setup", recipient: context.email, applicationId: context.applicationId, initialPaymentId: context.initialPaymentId || undefined, payload: { businessName: context.businessName, contactName: context.contactName } });
  if (queued.duplicate) return;
  const { error } = await admin.rpc("queue_application_employer_password_setup", { application_id_input: context.applicationId });
  if (error) throw new EmployerOnboardingError("Password setup delivery could not be queued.");
}

export async function createEmployerPasswordSetupLink(admin: SupabaseClient, input: { applicationId: string; origin: string }) {
  const { data: onboarding, error } = await admin.from("application_employer_onboarding").select("business_id,status,employer_id").eq("application_id", input.applicationId).maybeSingle();
  if (error || !onboarding || !onboarding.employer_id || !["password_setup_queued", "provisioned"].includes(String(onboarding.status))) throw new EmployerOnboardingError("Employer password setup is not ready.", true);
  const context = await getContext(admin, input.applicationId, onboarding.business_id);
  const redirectTo = `${input.origin}/reset-password`;
  const { data, error: linkError } = await admin.auth.admin.generateLink({ type: "recovery", email: context.email, options: { redirectTo } });
  if (linkError || !data.properties?.hashed_token) throw new EmployerOnboardingError("A secure password setup link could not be created.");
  const setupUrl = new URL("/reset-password", input.origin);
  setupUrl.searchParams.set("token_hash", data.properties.hashed_token);
  setupUrl.searchParams.set("type", "recovery");
  return { context, setupUrl: setupUrl.toString() };
}

export function employerPasswordSetupHtml(name: string, email: string, setupUrl: string) {
  const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
  return `<div style="font-family:Arial,sans-serif;padding:20px;line-height:1.6;color:#111827"><p>Hi ${escape(name)},</p><p>Your WageFlow employer account is ready.</p><p>Your login email is <strong>${escape(email)}</strong>.</p><p><a href="${escape(setupUrl)}" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Set your secure password</a></p><p>This one-time security link expires. Contact WageFlow if you need Master/Admin recovery.</p><p>Kind regards,<br><strong>WageFlow</strong></p></div>`;
}
