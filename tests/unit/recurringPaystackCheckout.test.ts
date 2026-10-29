import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.fn();
const createPaystackReference = vi.fn();
const initializePaystackTransaction = vi.fn();
vi.mock("../../app/api/_lib/authorization", () => ({ requireRole }));
vi.mock("../../app/api/_lib/paystack", () => ({ createPaystackReference, initializePaystackTransaction }));

const { POST } = await import("../../app/api/billing/paystack/initialize/route");

const request = () => new Request("https://wageflow.test/api/billing/paystack/initialize", {
  method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test" }, body: JSON.stringify({ statementId: "statement-1" }),
});

const claimed = {
  outcome: "claimed", id: "statement-1", business_id: "business-1", amount: 199,
  recipient_email: "billing@example.test", payment_reference: "wf-statement-1-stable",
};

function setup(outcomes: Array<Record<string, unknown>>, finishResults: boolean[] = [true]) {
  const claimQueue = [...outcomes];
  const rpc = vi.fn((name: string) => {
    if (name === "claim_subscription_statement_checkout") {
      const result = claimQueue.shift();
      return Promise.resolve({ data: result ? [result] : [], error: null });
    }
    if (name === "finish_subscription_statement_checkout_claim") return Promise.resolve({ data: finishResults.shift() ?? true, error: null });
    throw new Error(`Unexpected RPC ${name}`);
  });
  requireRole.mockResolvedValue({ admin: { rpc } });
  return rpc;
}

describe("recurring Paystack checkout reservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createPaystackReference.mockReturnValue("wf-new-reference");
    initializePaystackTransaction.mockResolvedValue("https://checkout.example.test");
  });

  it("allows only the atomic claimant to call Paystack when requests race", async () => {
    const rpc = setup([claimed, { ...claimed, outcome: "initializing" }]);
    const [first, second] = await Promise.all([POST(request()), POST(request())]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
    expect(initializePaystackTransaction).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("claim_subscription_statement_checkout", expect.objectContaining({ statement_id_input: "statement-1" }));
  });

  it("does not overwrite a valid initialized reference on a repeated request", async () => {
    setup([{ ...claimed, outcome: "already_initialized" }]);
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(initializePaystackTransaction).not.toHaveBeenCalled();
  });

  it("releases a failed claim while retaining its reference for a safe retry", async () => {
    const rpc = setup([claimed, claimed]);
    initializePaystackTransaction.mockRejectedValueOnce(new Error("Provider rejected checkout"));
    expect((await POST(request())).status).toBe(502);
    expect(rpc).toHaveBeenCalledWith("finish_subscription_statement_checkout_claim", expect.objectContaining({ initialized: false }));

    expect((await POST(request())).status).toBe(200);
    expect(initializePaystackTransaction).toHaveBeenLastCalledWith(expect.objectContaining({ reference: "wf-statement-1-stable" }));
  });

  it("does not let a stale initializer report success after losing its claim", async () => {
    setup([claimed], [false]);
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(initializePaystackTransaction).toHaveBeenCalledWith(expect.objectContaining({ reference: "wf-statement-1-stable" }));
  });
});
