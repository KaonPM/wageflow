import { NextResponse } from "next/server";
import { requireRole } from "../../_lib/authorization";

type DecisionPayload = {
  requestId?: string;
  status?: "Approved" | "Declined";
  employerNote?: string;
};

export async function POST(request: Request) {
  const access = await requireRole(request, ["employer"]);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.profile.business_id) return NextResponse.json({ error: "Business profile not found." }, { status: 400 });

  const body = (await request.json().catch(() => null)) as DecisionPayload | null;
  const requestId = String(body?.requestId || "");
  const status = body?.status;
  const employerNote = String(body?.employerNote || "").trim().slice(0, 2000);

  if (!requestId || !status || !["Approved", "Declined"].includes(status)) {
    return NextResponse.json({ error: "Choose a valid pending request decision." }, { status: 400 });
  }
  if (status === "Declined" && !employerNote) {
    return NextResponse.json({ error: "Enter a reason before declining the request." }, { status: 400 });
  }

  const { data, error } = await access.admin.rpc("decide_approval_request", {
    target_request_id: requestId,
    target_business_id: access.profile.business_id,
    decision_status: status,
    decision_note: employerNote || null,
    decision_by: access.user.email || "Employer admin",
  });

  if (error) {
    const message = error.message.includes("Insufficient annual leave")
      ? error.message
      : error.message.includes("pending")
        ? "Only pending requests can be approved or declined."
        : "The decision could not be saved.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  return NextResponse.json({ success: true, result: data });
}
