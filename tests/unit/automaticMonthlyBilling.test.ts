import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseAdmin = vi.fn();
const createPaystackReference = vi.fn();
const chargePaystackAuthorization = vi.fn();
const verifyPaystackTransaction = vi.fn();
const completeVerifiedPaystackReference = vi.fn();
const decryptAuthorization = vi.fn();
const assertAutomaticBillingKeyConfigured = vi.fn();
const queueEmail = vi.fn();
vi.mock("../../app/api/_lib/authorization", () => ({ getSupabaseAdmin }));
vi.mock("../../app/api/_lib/paystack", () => ({ createPaystackReference, chargePaystackAuthorization, verifyPaystackTransaction }));
vi.mock("../../app/api/_lib/paystackCompletion", () => ({ completeVerifiedPaystackReference }));
vi.mock("../../app/api/_lib/autoBillingCrypto", () => ({ decryptAuthorization, assertAutomaticBillingKeyConfigured }));
vi.mock("../../app/api/_lib/applicationWorkflow", () => ({ queueEmail }));

const { GET } = await import("../../app/api/cron/automatic-monthly-billing/route");
const statement = { id: "statement-1", subscription_id: "subscription-1", business_id: "business-1",
  amount: 199, recipient_email: "billing@example.test", statement_month: "2026-11-01", created_at: "2026-11-01T00:00:00Z" };
const claim = { outcome: "charge", attempt_id: "attempt-1", charge_reference: "wf-auto-1",
  charge_amount: 199, authorization_ciphertext: "encrypted", authorization_email: "payer@example.test",
  attempt_number: 1, attempt_created_at: new Date().toISOString() };
function query(data: unknown) {
  const builder = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), in: vi.fn(), order: vi.fn(), range: vi.fn(),
    limit: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data, error: null }) };
  for (const name of ["select", "eq", "is", "in", "order", "limit"] as const) builder[name].mockReturnValue(builder);
  builder.range.mockResolvedValue({ data, error: null });
  return builder;
}
function setup(claims: unknown[][]) {
  const statementQuery = query([statement]);
  const methodQuery = query({ revoked_at: null, authorized_plan: "Starter", authorized_amount: 199, paystack_mode: "test" });
  const claimQueue = [...claims];
  const rpc = vi.fn((name: string) => {
    if (name === "claim_subscription_auto_charge") return Promise.resolve({ data: claimQueue.shift() || [], error: null });
    if (name === "finish_subscription_auto_charge") return Promise.resolve({ data: true, error: null });
    throw new Error(`Unexpected RPC ${name}`);
  });
  getSupabaseAdmin.mockReturnValue({ rpc, from: vi.fn((table: string) =>
    table === "subscription_statements" ? statementQuery : methodQuery) });
  return rpc;
}
const request = () => new Request("https://wageflow.test/api/cron/automatic-monthly-billing", {
  headers: { Authorization: "Bearer cron-test" },
});

describe("automatic monthly collection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-test";
    process.env.AUTOMATIC_BILLING_ENABLED = "true";
    process.env.PAYSTACK_MODE = "test";
    createPaystackReference.mockReturnValue("wf-auto-1");
    decryptAuthorization.mockReturnValue("AUTH_test");
    chargePaystackAuthorization.mockResolvedValue("success");
    completeVerifiedPaystackReference.mockResolvedValue({ kind: "statement" });
    queueEmail.mockResolvedValue({ queued: true });
  });

  it("charges once, verifies, and completes through the existing payment path", async () => {
    const rpc = setup([[claim]]);
    verifyPaystackTransaction.mockRejectedValueOnce(new Error("not found"))
      .mockResolvedValueOnce({ status: "success", reference: "wf-auto-1" });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(chargePaystackAuthorization).toHaveBeenCalledTimes(1);
    expect(completeVerifiedPaystackReference).toHaveBeenCalledWith(expect.anything(), "wf-auto-1");
    expect(rpc).toHaveBeenCalledWith("finish_subscription_auto_charge", expect.objectContaining({ result_input: "succeeded" }));
  });

  it("does not issue a second charge while the database claim is unavailable", async () => {
    setup([[claim], []]);
    verifyPaystackTransaction.mockResolvedValue({ status: "pending", reference: "wf-auto-1" });
    await GET(request());
    await GET(request());
    expect(chargePaystackAuthorization).not.toHaveBeenCalled();
    expect(completeVerifiedPaystackReference).not.toHaveBeenCalled();
  });

  it("records a confirmed failure for the database-scheduled retry", async () => {
    const rpc = setup([[claim]]);
    verifyPaystackTransaction.mockRejectedValueOnce(new Error("not found"))
      .mockResolvedValueOnce({ status: "failed", reference: "wf-auto-1" });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("finish_subscription_auto_charge", expect.objectContaining({ result_input: "failed" }));
    expect(queueEmail).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ eventType: "monthly_payment_retry" }));
  });

  it("reconciles an earlier reference without charging again", async () => {
    const rpc = setup([[{ ...claim, outcome: "reconcile" }]]);
    verifyPaystackTransaction.mockResolvedValue({ status: "success", reference: "wf-auto-1" });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(chargePaystackAuthorization).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("finish_subscription_auto_charge", expect.objectContaining({ result_input: "succeeded" }));
  });

  it("requires the cron secret and defaults to disabled", async () => {
    expect((await GET(new Request("https://wageflow.test/api/cron/automatic-monthly-billing"))).status).toBe(401);
    process.env.AUTOMATIC_BILLING_ENABLED = "false";
    expect((await GET(request())).status).toBe(200);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });
});
