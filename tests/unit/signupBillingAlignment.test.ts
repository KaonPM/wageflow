import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.fn();
const issueStatement = vi.fn();
vi.mock("../../app/api/_lib/authorization", () => ({ requireRole }));
vi.mock("../../app/api/_lib/billing", () => ({ issueStatement }));

const { GET } = await import("../../app/api/master/billing/initial-payments/route");
const { POST } = await import("../../app/api/billing/statements/issue/route");

function query(data: unknown) {
  const builder = {
    select: vi.fn(), eq: vi.fn(), gt: vi.fn(), limit: vi.fn(), order: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
    range: vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data : [], error: null }),
  };
  for (const key of ["select", "eq", "gt", "limit", "order"] as const) builder[key].mockReturnValue(builder);
  return builder;
}

describe("signup billing alignment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires master access before returning verified signup payments", async () => {
    const payments = query([{ id: "payment-1", business_id: "business-1", total_amount: 448 }]);
    const from = vi.fn(() => payments);
    requireRole.mockResolvedValueOnce({ error: "Forbidden", status: 403 });
    expect((await GET(new Request("https://wageflow.test/api/master/billing/initial-payments"))).status).toBe(403);
    expect(from).not.toHaveBeenCalled();

    requireRole.mockResolvedValueOnce({ admin: { from }, user: { id: "master-1" }, profile: { role: "master" } });
    const response = await GET(new Request("https://wageflow.test/api/master/billing/initial-payments"));
    expect(response.status).toBe(200);
    expect((await response.json()).payments).toHaveLength(1);
    expect(payments.eq).toHaveBeenCalledWith("status", "verified");
  });

  it("blocks another setup charge after a verified signup payment", async () => {
    const subscription = query({ id: "subscription-1", business_id: "business-1", plan_name: "Starter", setup_fee: 249, setup_paid: false });
    const signupPayment = query({ id: "payment-1" });
    const from = vi.fn((table: string) => {
      if (table === "subscriptions") return subscription;
      if (table === "application_initial_payments") return signupPayment;
      throw new Error(`Unexpected table ${table}`);
    });
    requireRole.mockResolvedValue({ admin: { from }, user: { id: "master-1" }, profile: { role: "master" } });
    const response = await POST(new Request("https://wageflow.test/api/billing/statements/issue", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscriptionId: "subscription-1" }),
    }));
    expect(response.status).toBe(409);
    expect(signupPayment.eq).toHaveBeenCalledWith("subscription_id", "subscription-1");
    expect(signupPayment.eq).toHaveBeenCalledWith("status", "verified");
    expect(signupPayment.gt).toHaveBeenCalledWith("setup_amount", 0);
    expect(issueStatement).not.toHaveBeenCalled();
  });
});
