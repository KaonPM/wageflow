import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { checkRateLimit, isSameOrigin } from "../_lib/rateLimit";

type ContactPayload = { name?: string; email?: string; company?: string; phone?: string; message?: string };

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  const rate = checkRateLimit(req, "contact", 5, 10 * 60_000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many enquiries. Please try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const body = (await req.json().catch(() => null)) as ContactPayload | null;
  const name = body?.name?.trim() || "";
  const email = body?.email?.trim().toLowerCase() || "";
  const company = body?.company?.trim() || "";
  const phone = body?.phone?.trim() || "";
  const message = body?.message?.trim() || "";

  if (!name || !email || !message || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid name, email and message." }, { status: 400 });
  }
  if ([name, company, phone].some((value) => value.length > 120) || message.length > 3000) {
    return NextResponse.json({ error: "One or more fields are too long." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Enquiry service is temporarily unavailable." }, { status: 503 });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { error: saveError } = await admin.from("contact_enquiries").insert({
    name, business: company || "Not provided", email, phone: phone || "Not provided", message,
  });
  if (saveError) {
    console.error("Contact enquiry persistence failed", saveError.message);
    return NextResponse.json({ error: "We could not record your enquiry. Please try again." }, { status: 500 });
  }

  const brevoKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  const toEmail = process.env.BREVO_TO_EMAIL;
  let notificationSent = false;

  if (brevoKey && fromEmail && toEmail) {
    const sender = { name: "WageFlow", email: fromEmail };
    const internalEmail = await sendBrevoEmail(brevoKey, {
      sender, to: [{ email: toEmail }], replyTo: { email, name }, subject: "New WageFlow enquiry",
      htmlContent: `<div style="font-family:Arial,sans-serif;padding:20px"><h2>New WageFlow enquiry</h2><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Phone:</strong> ${escapeHtml(phone || "Not provided")}</p><p><strong>Company:</strong> ${escapeHtml(company || "Not provided")}</p><p><strong>Message:</strong></p><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p></div>`,
    });
    notificationSent = internalEmail;
    if (!internalEmail) console.error("Brevo internal enquiry notification failed; enquiry remains saved.");

    if (internalEmail) {
      const autoResponse = await sendBrevoEmail(brevoKey, {
        sender, to: [{ email, name }], subject: "We have received your WageFlow enquiry",
        htmlContent: `<div style="font-family:Arial,sans-serif;padding:20px;line-height:1.6"><p>Hi ${escapeHtml(name)},</p><p>Thank you for contacting <strong>WageFlow</strong>. Your enquiry has been received and our team will respond as soon as possible.</p><p>Operating hours: Monday – Friday, 08:00 – 17:00.</p><p>Kind regards,<br><strong>WageFlow</strong><br>A product of Lesedi Smart Solutions</p></div>`,
      });
      if (!autoResponse) console.error("Brevo enquiry acknowledgement failed; enquiry remains saved.");
    }
  } else {
    console.error("Brevo enquiry notification is not configured; enquiry remains saved.");
  }

  return NextResponse.json({ success: true, notificationSent });
}

async function sendBrevoEmail(apiKey: string, payload: Record<string, unknown>) {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "Content-Type": "application/json", "api-key": apiKey }, body: JSON.stringify(payload) });
    if (!response.ok) console.error("Brevo request failed", response.status, await response.text());
    return response.ok;
  } catch (error) {
    console.error("Brevo request failed", error instanceof Error ? error.message : "Unknown error");
    return false;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}
