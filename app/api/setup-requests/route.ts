import { NextResponse } from "next/server";
import { getSupabaseAdmin, requireRole } from "../_lib/authorization";
import { checkRateLimit, isSameOrigin } from "../_lib/rateLimit";

type Payload = { ownerName?: string; businessName?: string; email?: string; phone?: string; employeeCount?: string | number; plan?: string; message?: string; accepted?: boolean; acceptedAt?: string; website?: string };

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
    const { error } = await getSupabaseAdmin().from("wageflow_setup_requests").insert({ business_name: businessName, contact_person: contactPerson, email, phone, selected_package: selectedPackage, number_of_employees: employeeCount, notes, terms_accepted: true, privacy_accepted: true, status: "Pending" });
    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Setup request persistence failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "We could not record the setup request. Please try again." }, { status: 500 });
  }
}

type MasterAction = { action?: "prepare_approval" | "finalize_approval" | "reject"; requestId?: string };

export async function PATCH(request: Request) {
  const access = await requireRole(request, ["master", "master_admin"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = (await request.json().catch(() => null)) as MasterAction | null;
  const requestId = String(body?.requestId || "");
  if (!requestId || !body?.action) return NextResponse.json({ error: "A valid setup request action is required." }, { status: 400 });

  const { data: setupRequest, error: requestError } = await access.admin
    .from("wageflow_setup_requests")
    .select("id,business_name,email,phone,selected_package,number_of_employees,status")
    .eq("id", requestId)
    .maybeSingle();
  if (requestError || !setupRequest) return NextResponse.json({ error: "Setup request was not found." }, { status: 404 });

  if (body.action === "reject") {
    const { error } = await access.admin.from("wageflow_setup_requests").update({ status: "Rejected", rejected_at: new Date().toISOString() }).eq("id", requestId);
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ success: true });
  }

  if (body.action === "finalize_approval") {
    const { error } = await access.admin.from("wageflow_setup_requests").update({ status: "Approved", approved_at: new Date().toISOString() }).eq("id", requestId);
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ success: true });
  }

  const { data: existingBusiness, error: lookupError } = await access.admin
    .from("businesses")
    .select("id")
    .eq("source_request_id", requestId)
    .maybeSingle();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });

  let businessId = existingBusiness?.id as string | undefined;
  if (!businessId) {
    const { data: business, error } = await access.admin.from("businesses").insert({
      business_name: setupRequest.business_name,
      email: setupRequest.email,
      phone: setupRequest.phone,
      status: "active",
      source_request_id: requestId,
      selected_package: setupRequest.selected_package,
      number_of_employees: setupRequest.number_of_employees,
    }).select("id").single();
    if (error || !business) return NextResponse.json({ error: error?.message || "Business could not be created." }, { status: 500 });
    businessId = business.id;
  }

  const { error: settingsError } = await access.admin.from("business_settings").upsert({
    business_id: businessId,
    primary_color: "#0f766e",
    secondary_color: "#d4af37",
    paye_enabled: true,
    uif_enabled: true,
    pension_enabled: false,
    medical_aid_enabled: false,
    show_leave_balances: true,
    default_payment_method: "Bank Transfer",
  }, { onConflict: "business_id" });
  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 });

  const { error: subscriptionError } = await access.admin.from("subscriptions").upsert({
    business_id: businessId,
    plan_name: setupRequest.selected_package || "Starter",
    monthly_fee: monthlyFee(setupRequest.selected_package),
    setup_fee: 499,
    setup_paid: false,
    subscription_status: "active",
  }, { onConflict: "business_id" });
  if (subscriptionError) return NextResponse.json({ error: subscriptionError.message }, { status: 500 });

  return NextResponse.json({ success: true, businessId });
}

function monthlyFee(packageName: string | null) {
  if (packageName?.includes("Growth")) return 249;
  if (packageName?.includes("Elite")) return 499;
  return 149;
}
