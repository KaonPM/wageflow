import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../_lib/authorization";
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
