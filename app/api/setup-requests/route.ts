import { NextResponse } from "next/server";
import { getSupabaseAdmin, requireRole } from "../_lib/authorization";
import { checkRateLimit, isSameOrigin } from "../_lib/rateLimit";
import { prepareInitialPayment, queueEmail } from "../_lib/applicationWorkflow";

type Payload = { ownerName?: string; businessName?: string; email?: string; phone?: string; employeeCount?: string | number; plan?: string; message?: string; accepted?: boolean; acceptedAt?: string; website?: string; defaultEmployeePortalEnabled?: boolean };

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  const rate = checkRateLimit(request, "setup", 3, 30 * 60_000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const body = (await request.json().catch(() => null)) as Payload | null;
  if (!body || body.website) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const businessName = body.businessName?.trim() || "";
  const contactPerson = body.ownerName?.trim() || "";
  const email = body.email?.trim().toLowerCase() || "";
  const phone = body.phone?.trim() || "";
  const selectedPackage = body.plan?.trim() || "";
  const notes = body.message?.trim() || "";
  const employeeCount = Number(body.employeeCount);
  if (!body.accepted || !body.acceptedAt || !businessName || !contactPerson || !/^\S+@\S+\.\S+$/.test(email) || !Number.isInteger(employeeCount) || employeeCount < 1 || employeeCount > 100000) {
    return NextResponse.json({ error: "Complete all required fields and accept the legal terms." }, { status: 400 });
  }
  if ([businessName, contactPerson, email, phone, selectedPackage].some((value) => value.length > 160) || notes.length > 3000) return NextResponse.json({ error: "One or more fields are too long." }, { status: 400 });
  const acceptedAt = new Date(body.acceptedAt);
  if (Number.isNaN(acceptedAt.getTime())) return NextResponse.json({ error: "Terms acceptance is invalid." }, { status: 400 });

  try {
    const admin = getSupabaseAdmin();
    const { data: application, error } = await admin.from("wageflow_setup_requests").insert({ business_name: businessName, contact_person: contactPerson, email, phone, selected_package: selectedPackage, number_of_employees: employeeCount, notes, default_employee_portal_enabled: body.defaultEmployeePortalEnabled === true, terms_accepted: true, privacy_accepted: true, status: "Pending", lifecycle_status: "submitted" }).select("id").single();
    if (error || !application) throw error || new Error("Application could not be saved.");
    await queueEmail(admin, { idempotencyKey: `application-acknowledgement:${application.id}`, eventType: "application_acknowledgement", recipient: email, applicationId: application.id, payload: { businessName } });
    const alertRecipient = String(process.env.WAGEFLOW_MASTER_ALERT_EMAIL || "").trim().toLowerCase();
    if (/^\S+@\S+\.\S+$/.test(alertRecipient)) await queueEmail(admin, { idempotencyKey: `application-alert:${application.id}`, eventType: "application_admin_alert", recipient: alertRecipient, applicationId: application.id, payload: { businessName, contactPerson } });
    return NextResponse.json({ success: true, applicationSaved: true, emailsQueued: true }, { status: 201 });
  } catch (error) {
    console.error("Setup request persistence failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "We could not record the setup request. Please try again." }, { status: 500 });
  }
}

type MasterAction = { action?: "prepare_approval" | "finalize_approval" | "decline_activation" | "reject"; requestId?: string; reason?: string };

export async function PATCH(request: Request) {
  const access = await requireRole(request, ["master", "master_admin"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = (await request.json().catch(() => null)) as MasterAction | null;
  const requestId = String(body?.requestId || "");
  if (!requestId || !body?.action) return NextResponse.json({ error: "A valid setup request action is required." }, { status: 400 });

  const { data: setupRequest, error: requestError } = await access.admin
    .from("wageflow_setup_requests")
    .select("id,business_name,email,phone,selected_package,number_of_employees,status,lifecycle_status,default_employee_portal_enabled")
    .eq("id", requestId)
    .maybeSingle();
  if (requestError || !setupRequest) return NextResponse.json({ error: "Setup request was not found." }, { status: 404 });

  if (body.action === "reject") {
    const { error } = await access.admin.from("wageflow_setup_requests").update({ status: "Rejected", lifecycle_status: "rejected", rejected_at: new Date().toISOString(), initial_reviewed_at: new Date().toISOString(), initial_reviewed_by: access.user.id }).eq("id", requestId);
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ success: true });
  }

  if (body.action === "finalize_approval") {
    const { data: businessId, error } = await access.admin.rpc("activate_verified_application", { application_id_input: requestId, actor: access.user.id, decision_reason: body.reason?.trim().slice(0, 500) || null });
    return error ? NextResponse.json({ error: error.message }, { status: 409 }) : NextResponse.json({ success: true, businessId, activationReady: true });
  }
  if (body.action === "decline_activation") {
    const { error } = await access.admin.from("wageflow_setup_requests").update({ lifecycle_status: "activation_declined", status: "Activation Declined", final_reviewed_at: new Date().toISOString(), final_reviewed_by: access.user.id, activation_decision_reason: body.reason?.trim().slice(0, 500) || "Financial resolution required." }).eq("id", requestId);
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ success: true });
  }
  if (setupRequest.lifecycle_status !== "submitted") return NextResponse.json({ error: "This application has already been reviewed." }, { status: 409 });
  try {
    const result = await prepareInitialPayment(access.admin, { application: setupRequest, actorId: access.user.id, origin: new URL(request.url).origin });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Initial payment could not be prepared." }, { status: 500 });
  }
}
