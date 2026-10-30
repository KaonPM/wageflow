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

function setup(outcomes: Array<Record<string, unknown>>, finishResults: boolean[] = [true], existingUrl: string | null = "https://checkout.example.test") {
  const claimQueue = [...outcomes];
  const rpc = vi.fn((name: string) => {
    if (name === "claim_subscription_statement_checkout") {
      const result = claimQueue.shift();
      return Promise.resolve({ data: result ? [result] : [], error: null });
    }
    if (name === "finish_subscription_statement_checkout_claim" || name === "finalize_subscription_statement_checkout_url") return Promise.resolve({ data: finishResults.shift() ?? true, error: null });
    throw new Error(`Unexpected RPC ${name}`);
  });
  const existing = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: { payment_authorization_url: existingUrl, payment_reference: claimed.payment_reference, paid_at: null }, error: null }) };
  existing.select.mockReturnValue(existing);
  existing.eq.mockReturnValue(existing);
  requireRole.mockResolvedValue({ admin: { rpc, from: vi.fn(() => existing) }, profile: { role: "master" } });
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

  it("reopens a valid initialized checkout without creating another transaction", async () => {
    const rpc = setup([claimed, { ...claimed, outcome: "already_initialized" }]);
    const first = await POST(request());
    const response = await POST(request());
    expect(first.status).toBe(200);
    expect(response.status).toBe(200);
    expect((await response.json()).authorizationUrl).toBe("https://checkout.example.test");
    expect(initializePaystackTransaction).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("finalize_subscription_statement_checkout_url", expect.objectContaining({ claim_input: expect.any(String), authorization_url_input: "https://checkout.example.test" }));
  });

  it("does not start a second transaction when an older initialized checkout has no saved URL", async () => {
    setup([{ ...claimed, outcome: "already_initialized" }], [true], null);
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
    expect(rpc).toHaveBeenCalledWith("finalize_subscription_statement_checkout_url", expect.objectContaining({ authorization_url_input: "https://checkout.example.test" }));
  });

  it("does not let a stale initializer report success after losing its claim", async () => {
    setup([claimed], [false]);
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(initializePaystackTransaction).toHaveBeenCalledWith(expect.objectContaining({ reference: "wf-statement-1-stable" }));
  });

  it("rejects an employer trying to pay another business's statement", async () => {
    const rpc = vi.fn();
    const query = (data: unknown) => {
      const builder = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data, error: null }) };
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      return builder;
    };
    const statementQuery = query({ business_id: "business-2" });
    const membershipQuery = query({ business_id: "business-1" });
    requireRole.mockResolvedValue({
      admin: { rpc, from: vi.fn((table: string) => table === "subscription_statements" ? statementQuery : membershipQuery) },
      user: { id: "employer-1" },
      profile: { role: "employer", business_id: "business-1" },
    });

    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
    expect(initializePaystackTransaction).not.toHaveBeenCalled();
  });

  it("allows an employer to pay a statement belonging to the active business", async () => {
    const claimQueue = [claimed];
    const rpc = vi.fn((name: string) => name === "claim_subscription_statement_checkout"
      ? Promise.resolve({ data: [claimQueue.shift()], error: null })
      : Promise.resolve({ data: true, error: null }));
    const query = (data: unknown) => {
      const builder = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data, error: null }) };
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      return builder;
    };
    requireRole.mockResolvedValue({
      admin: { rpc, from: vi.fn((table: string) => query(table === "subscription_statements" ? { business_id: "business-1" } : { business_id: "business-1" })) },
      user: { id: "employer-1" },
      profile: { role: "employer", business_id: "business-1" },
    });

    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(initializePaystackTransaction).toHaveBeenCalledTimes(1);
  });

  it("rejects an employer admin without billing permission before claiming checkout", async () => {
    const rpc = vi.fn();
    const from = vi.fn();
    requireRole.mockResolvedValue({
      admin: { rpc, from },
      user: { id: "admin-1" },
      profile: { role: "employer_admin", business_id: "business-1", admin_permissions: ["payroll"] },
    });

    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
    expect(initializePaystackTransaction).not.toHaveBeenCalled();
  });
});
