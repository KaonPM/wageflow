import { beforeEach, describe, expect, it, vi } from "vitest";

const hasValidPaystackSignature = vi.fn();
const completeVerifiedPaystackReference = vi.fn();
const getSupabaseAdmin = vi.fn();
vi.mock("../../app/api/_lib/paystack", () => ({ hasValidPaystackSignature }));
vi.mock("../../app/api/_lib/paystackCompletion", () => ({ completeVerifiedPaystackReference }));
vi.mock("../../app/api/_lib/authorization", () => ({ getSupabaseAdmin }));
const { POST } = await import("../../app/api/billing/paystack/webhook/route");

function request(body: unknown, signature = "valid") { return new Request("https://wageflow.test/api/billing/paystack/webhook", { method: "POST", headers: { "x-paystack-signature": signature }, body: JSON.stringify(body) }); }

describe("Paystack webhook route (mocked provider/database)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a missing or invalid signature before touching the database", async () => {
    hasValidPaystackSignature.mockReturnValue(false);
    const response = await POST(request({ event: "charge.success", data: { reference: "wf-app-123456", id: 1 } }, ""));
    expect(response.status).toBe(401);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("rejects a signed malformed payload before touching the database", async () => {
    hasValidPaystackSignature.mockReturnValue(true);
    const response = await POST(new Request("https://wageflow.test/api/billing/paystack/webhook", {
      method: "POST", headers: { "x-paystack-signature": "valid" }, body: "not-json",
    }));
    expect(response.status).toBe(400);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("persists then server-verifies a signed success event before completion", async () => {
    hasValidPaystackSignature.mockReturnValue(true);
    const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
    getSupabaseAdmin.mockReturnValue({ from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: null }), update })) });
    completeVerifiedPaystackReference.mockResolvedValue({ kind: "initial" });
    const response = await POST(request({ event: "charge.success", data: { reference: "wf-app-123456", id: 9 } }));
    expect(response.status).toBe(200);
    expect(completeVerifiedPaystackReference).toHaveBeenCalledWith(expect.anything(), "wf-app-123456");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ processed_at: expect.any(String) }));
  });

  it("does not reprocess a duplicate event key", async () => {
    hasValidPaystackSignature.mockReturnValue(true);
    getSupabaseAdmin.mockReturnValue({ from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: { code: "23505" } }) })) });
    const response = await POST(request({ event: "charge.success", data: { reference: "wf-app-123456", id: 9 } }));
    expect(await response.json()).toEqual({ received: true, duplicate: true });
    expect(completeVerifiedPaystackReference).not.toHaveBeenCalled();
  });
});
