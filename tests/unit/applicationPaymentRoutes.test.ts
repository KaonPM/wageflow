import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseAdmin = vi.fn();
const initializePaystackTransaction = vi.fn();
const verifyPaystackTransaction = vi.fn();
const verifyPaystackPayment = vi.fn();
const completePaystackStatement = vi.fn();
vi.mock("../../app/api/_lib/authorization", () => ({ getSupabaseAdmin }));
vi.mock("../../app/api/_lib/paystack", () => ({ initializePaystackTransaction, verifyPaystackTransaction }));
vi.mock("../../app/api/_lib/billing", () => ({ verifyPaystackPayment, completePaystackStatement }));
vi.mock("../../app/api/_lib/rateLimit", () => ({ isSameOrigin: () => true, checkRateLimit: () => ({ allowed: true }) }));

const { POST: initialize } = await import("../../app/api/application-payment/initialize/route");
const { POST: verify } = await import("../../app/api/billing/paystack/verify/route");

const token = "t".repeat(43);
const reference = "wf-app-reference-123";
const validAttempt = {
  id: "attempt-1", provider_reference: reference, expected_amount: 448, currency: "ZAR",
  expires_at: new Date(Date.now() + 86_400_000).toISOString(), status: "created", initial_payment_id: "payment-1",
  application_initial_payments: {
    application_id: "application-1", status: "awaiting_payment",
    wageflow_setup_requests: { email: "applicant@example.test", lifecycle_status: "awaiting_initial_payment" },
  },
};
const transaction = { id: 22, status: "success", reference, amount: 44800, currency: "ZAR" };
const request = (path: string, body: unknown) => new Request(`https://wageflow.test${path}`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

function initializeAdmin(attempt: typeof validAttempt | null, updateResult: { id: string } | null = { id: "attempt-1" }) {
  const update = vi.fn(() => ({
    eq: vi.fn(() => ({
      in: vi.fn(() => ({
        select: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: updateResult, error: null }) })),
      })),
    })),
  }));
  getSupabaseAdmin.mockReturnValue({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: attempt, error: null }) })),
      })),
      update,
    })),
  });
  return update;
}

function verifyAdmin(attempt: { id: string; initial_payment_id?: string; expected_amount: number; currency: string; status: string } | null, paymentStatus = "verified") {
  const rpc = vi.fn().mockResolvedValue({ data: "verified", error: null });
  const eq = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: attempt, error: null }) })), maybeSingle: vi.fn().mockResolvedValue({ data: attempt, error: null }) }));
  const from = vi.fn((table: string) => table === "application_initial_payments"
    ? { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { status: paymentStatus }, error: null }) })) })) }
    : { select: vi.fn(() => ({ eq })) });
  getSupabaseAdmin.mockReturnValue({ from, rpc });
  return { rpc, eq };
}

describe("public payment-page initialization and callback verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initializePaystackTransaction.mockResolvedValue("https://checkout.example.test");
    verifyPaystackTransaction.mockResolvedValue(transaction);
  });

  it.each([
    ["revoked", { status: "revoked" }],
    ["expired", { expires_at: new Date(Date.now() - 1000).toISOString() }],
    ["paid", { application_initial_payments: { ...validAttempt.application_initial_payments, status: "verified" } }],
    ["archived", { application_initial_payments: { ...validAttempt.application_initial_payments, wageflow_setup_requests: { ...validAttempt.application_initial_payments.wageflow_setup_requests, lifecycle_status: "archived" } } }],
  ])("rejects a %s payment-page token before Paystack initialization", async (_case, changes) => {
    initializeAdmin({ ...validAttempt, ...changes });
    const response = await initialize(request("/api/application-payment/initialize", { token }));
    expect(response.status).toBe(404);
    expect(initializePaystackTransaction).not.toHaveBeenCalled();
  });

  it("rejects a revoked attempt that disappears during checkout initialization", async () => {
    initializeAdmin(validAttempt, null);
    const response = await initialize(request("/api/application-payment/initialize", { token }));
    expect(response.status).toBe(404);
  });

  it("initializes an eligible token and confirms the guarded attempt update", async () => {
    const update = initializeAdmin(validAttempt);
    const response = await initialize(request("/api/application-payment/initialize", { token }));
    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalled();
  });

  it("rejects a Paystack reference that differs from the requested reference", async () => {
    verifyPaystackTransaction.mockResolvedValue({ ...transaction, reference: "wf-app-different" });
    const { rpc } = verifyAdmin({ id: "attempt-1", expected_amount: 448, currency: "ZAR", status: "created" });
    const response = await verify(request("/api/billing/paystack/verify", { reference, token }));
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a callback whose token does not belong to the verified reference", async () => {
    const { rpc } = verifyAdmin(null);
    const response = await verify(request("/api/billing/paystack/verify", { reference, token }));
    expect(response.status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
    expect(verifyPaystackPayment).not.toHaveBeenCalled();
  });

  it("requires the payment token for an initial-payment callback", async () => {
    const { rpc } = verifyAdmin({ id: "attempt-1", expected_amount: 448, currency: "ZAR", status: "created" });
    const response = await verify(request("/api/billing/paystack/verify", { reference }));
    expect(response.status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("does not present a late success on a revoked link as activation-ready", async () => {
    const { rpc } = verifyAdmin({ id: "attempt-1", expected_amount: 448, currency: "ZAR", status: "revoked" });
    rpc.mockResolvedValue({ data: "financial_resolution_required", error: null });
    const response = await verify(request("/api/billing/paystack/verify", { reference, token }));
    expect(response.status).toBe(409);
    expect((await response.json()).result).toBe("financial_resolution_required");
  });

  it("does not present an already-recorded late payment as activated", async () => {
    const { rpc } = verifyAdmin({ id: "attempt-1", initial_payment_id: "payment-1", expected_amount: 448, currency: "ZAR", status: "revoked" }, "financial_resolution_required");
    rpc.mockResolvedValue({ data: "already_verified", error: null });
    const response = await verify(request("/api/billing/paystack/verify", { reference, token }));
    expect(response.status).toBe(409);
  });

  it("rejects a provider amount mismatch before payment completion", async () => {
    verifyPaystackTransaction.mockResolvedValue({ ...transaction, amount: 1 });
    const { rpc } = verifyAdmin({ id: "attempt-1", expected_amount: 448, currency: "ZAR", status: "created" });
    const response = await verify(request("/api/billing/paystack/verify", { reference, token }));
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["pending", "pending"],
    ["failed", "failed"],
    ["abandoned", "failed"],
  ])("reports a %s statement checkout without marking it paid", async (providerStatus, paymentState) => {
    verifyPaystackTransaction.mockResolvedValue({ ...transaction, status: providerStatus });
    verifyAdmin(null);
    const response = await verify(request("/api/billing/paystack/verify", { reference }));
    expect(response.status).toBe(409);
    expect((await response.json()).paymentState).toBe(paymentState);
    expect(verifyPaystackPayment).not.toHaveBeenCalled();
    expect(completePaystackStatement).not.toHaveBeenCalled();
  });

  it("still completes a successful statement through verified payment", async () => {
    verifyAdmin(null);
    verifyPaystackPayment.mockResolvedValue({ id: "statement-1" });
    completePaystackStatement.mockResolvedValue({ alreadyPaid: false });
    const response = await verify(request("/api/billing/paystack/verify", { reference }));
    expect(response.status).toBe(200);
    expect((await response.json()).success).toBe(true);
    expect(verifyPaystackPayment).toHaveBeenCalledWith(expect.anything(), transaction);
    expect(completePaystackStatement).toHaveBeenCalledWith(expect.anything(), "statement-1", reference, String(transaction.id));
  });
});
