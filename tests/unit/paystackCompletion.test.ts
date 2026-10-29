import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyPaystackTransaction = vi.fn();
const verifyPaystackPayment = vi.fn();
const completePaystackStatement = vi.fn();
vi.mock("../../app/api/_lib/paystack", () => ({ verifyPaystackTransaction }));
vi.mock("../../app/api/_lib/billing", () => ({ verifyPaystackPayment, completePaystackStatement }));

const { completeVerifiedPaystackReference } = await import("../../app/api/_lib/paystackCompletion");

describe("Paystack completion (mocked provider and database)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("only completes an initial payment after server verification matches amount and currency", async () => {
    verifyPaystackTransaction.mockResolvedValue({ id: 44, status: "success", reference: "wf-app-test", amount: 44800, currency: "ZAR", paid_at: "2026-01-01T00:00:00Z" });
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const admin = { from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: "attempt", expected_amount: 448, currency: "ZAR" }, error: null }) })) })) })), rpc };
    await expect(completeVerifiedPaystackReference(admin as never, "wf-app-test")).resolves.toEqual({ kind: "initial" });
    expect(rpc).toHaveBeenCalledWith("complete_application_payment", expect.objectContaining({ payment_attempt_id: "attempt", provider_transaction: "44", paid_amount_minor: 44800 }));
  });

  it("rejects mismatched provider amount before invoking completion", async () => {
    verifyPaystackTransaction.mockResolvedValue({ id: 44, status: "success", reference: "wf-app-test", amount: 1, currency: "ZAR" });
    const rpc = vi.fn();
    const admin = { from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: "attempt", expected_amount: 448, currency: "ZAR" }, error: null }) })) })) })), rpc };
    await expect(completeVerifiedPaystackReference(admin as never, "wf-app-test")).rejects.toThrow("Payment could not be verified.");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a provider response for a different reference before looking up an attempt", async () => {
    verifyPaystackTransaction.mockResolvedValue({ id: 44, status: "success", reference: "wf-app-other", amount: 44800, currency: "ZAR" });
    const admin = { from: vi.fn(), rpc: vi.fn() };
    await expect(completeVerifiedPaystackReference(admin as never, "wf-app-test")).rejects.toThrow("Payment could not be verified.");
    expect(admin.from).not.toHaveBeenCalled();
    expect(admin.rpc).not.toHaveBeenCalled();
  });

  it("uses the distinct recurring-statement completion path when no application attempt exists", async () => {
    verifyPaystackTransaction.mockResolvedValue({ id: 77, status: "success", reference: "wf-statement", amount: 19900, currency: "ZAR" });
    verifyPaystackPayment.mockResolvedValue({ id: "statement" });
    completePaystackStatement.mockResolvedValue({ alreadyPaid: false });
    const admin = { from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })) })) })) };
    await expect(completeVerifiedPaystackReference(admin as never, "wf-statement")).resolves.toEqual({ kind: "statement" });
    expect(completePaystackStatement).toHaveBeenCalledWith(admin, "statement", "wf-statement", "77");
  });
});
