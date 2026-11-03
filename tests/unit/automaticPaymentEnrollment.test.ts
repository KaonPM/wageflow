import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.fn();
const verifyPaystackTransaction = vi.fn();
const encryptAuthorization = vi.fn();
vi.mock("../../app/api/_lib/authorization", () => ({ requireRole }));
vi.mock("../../app/api/_lib/paystack", () => ({ verifyPaystackTransaction }));
vi.mock("../../app/api/_lib/autoBillingCrypto", () => ({ encryptAuthorization }));

const { GET, POST, DELETE } = await import("../../app/api/employer/billing/automatic/route");

function query(data: unknown) {
  const builder = { select: vi.fn(), eq: vi.fn(), not: vi.fn(), order: vi.fn(), limit: vi.fn(), maybeSingle: vi.fn(), then: vi.fn() };
  for (const name of ["select", "eq", "not", "order", "limit"] as const) builder[name].mockReturnValue(builder);
  builder.maybeSingle.mockResolvedValue({ data, error: null });
  builder.then.mockImplementation((resolve: (value: unknown) => unknown) => resolve({ data, error: null }));
  return builder;
}
function setup(auth: { reusable: boolean; channel: string } = { reusable: true, channel: "card" }) {
  const from = vi.fn((table: string) => {
    if (table === "employer_business_memberships") return query({ business_id: "business-1" });
    if (table === "subscriptions") return query({ id: "subscription-1", business_id: "business-1", plan_name: "Starter", monthly_fee: 199, subscription_status: "active" });
    if (table === "subscription_statements") return query([{ payment_reference: "wf-paid", amount: 199 }]);
    if (table === "application_initial_payments") return query(null);
    if (table === "subscription_auto_payment_methods") return query({ card_brand: "Visa", card_last4: "1234", consented_at: "2026-11-03", revoked_at: null, authorized_plan: "Starter", authorized_amount: 199, paystack_mode: "test" });
    throw new Error(`Unexpected table ${table}`);
  });
  const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
  requireRole.mockResolvedValue({ admin: { from, rpc }, user: { id: "employer-1" }, profile: { role: "employer", business_id: "business-1" } });
  verifyPaystackTransaction.mockResolvedValue({ status: "success", reference: "wf-paid", currency: "ZAR", amount: 19900,
    customer: { email: "payer@example.test" }, authorization: { authorization_code: "AUTH_test", reusable: auth.reusable,
      channel: auth.channel, brand: "Visa", last4: "1234" } });
  encryptAuthorization.mockReturnValue("encrypted");
  return rpc;
}
const request = (method: string, consent?: boolean) => new Request("https://wageflow.test/api/employer/billing/automatic", {
  method, headers: { Authorization: "Bearer test", "Content-Type": "application/json" },
  ...(method === "POST" ? { body: JSON.stringify({ consent }) } : {}),
});

describe("employer automatic payment mandate", () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.PAYSTACK_MODE = "test"; process.env.AUTOMATIC_BILLING_ENABLED = "true"; });

  it("requires explicit consent before verifying or saving a card", async () => {
    const rpc = setup();
    const response = await POST(request("POST", false));
    expect(response.status).toBe(400);
    expect(verifyPaystackTransaction).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("enrolls only a verified reusable card linked to this subscription", async () => {
    const rpc = setup();
    const response = await POST(request("POST", true));
    expect(response.status).toBe(200);
    expect(encryptAuthorization).toHaveBeenCalledWith("AUTH_test");
    expect(rpc).toHaveBeenCalledWith("set_subscription_auto_payment_method", expect.objectContaining({
      business_id_input: "business-1", subscription_id_input: "subscription-1", ciphertext_input: "encrypted",
    }));
  });

  it("rejects non-reusable payment methods", async () => {
    const rpc = setup({ reusable: false, channel: "card" });
    const response = await POST(request("POST", true));
    expect(response.status).toBe(409);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns only masked card details and allows the employer to revoke consent", async () => {
    const rpc = setup();
    const loaded = await GET(request("GET"));
    expect(await loaded.json()).toMatchObject({ enabled: true, last4: "1234" });
    const revoked = await DELETE(request("DELETE"));
    expect(revoked.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("revoke_subscription_auto_payment_method", {
      business_id_input: "business-1", subscription_id_input: "subscription-1",
    });
  });

  it("does not query the new table before automatic billing is enabled", async () => {
    process.env.AUTOMATIC_BILLING_ENABLED = "false";
    setup();
    const response = await GET(request("GET"));
    expect(await response.json()).toMatchObject({ available: false, enabled: false });
    const access = await requireRole.mock.results[0].value;
    expect(access.admin.from).not.toHaveBeenCalledWith("subscription_auto_payment_methods");
  });
});
