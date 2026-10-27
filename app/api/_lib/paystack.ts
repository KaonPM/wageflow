import { createHmac, randomUUID, timingSafeEqual } from "crypto";

const PAYSTACK_API = "https://api.paystack.co";

type PaystackTransaction = {
  id: number | string;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at?: string;
};

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("Paystack is not configured. Set PAYSTACK_SECRET_KEY on the server.");
  return key;
}

export function createPaystackReference(statementId: string) {
  return `wf-${statementId}-${randomUUID()}`;
}

export async function initializePaystackTransaction(input: {
  email: string;
  amount: number;
  reference: string;
  callbackUrl: string;
  statementId: string;
  businessId: string;
}) {
  const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      amount: String(Math.round(input.amount * 100)),
      currency: "ZAR",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: JSON.stringify({ statementId: input.statementId, businessId: input.businessId, paymentProvider: "paystack" }),
    }),
  });
  const result = await response.json().catch(() => null) as { status?: boolean; message?: string; data?: { authorization_url?: string } } | null;
  if (!response.ok || !result?.status || !result.data?.authorization_url) throw new Error(result?.message || "Paystack could not start the checkout.");
  return result.data.authorization_url;
}

export async function verifyPaystackTransaction(reference: string) {
  const response = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  const result = await response.json().catch(() => null) as { status?: boolean; message?: string; data?: PaystackTransaction } | null;
  if (!response.ok || !result?.status || !result.data) throw new Error(result?.message || "Paystack could not verify the payment.");
  return result.data;
}

export function hasValidPaystackSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const expected = createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
