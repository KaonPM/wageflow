import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.fn();
vi.mock("../../app/api/_lib/authorization", () => ({ requireRole }));

const { GET, PATCH } = await import("../../app/api/employer/billing/route");
const request = (method = "GET") => new Request("https://wageflow.test/api/employer/billing", {
  method,
  headers: { Authorization: "Bearer test", ...(method === "PATCH" ? { "Content-Type": "application/json" } : {}) },
  ...(method === "PATCH" ? { body: JSON.stringify({ email: "billing@example.test", address: "Test address" }) } : {}),
});

function query(result: { data?: unknown; error?: unknown; count?: number } = {}) {
  const builder = {
    select: vi.fn(), eq: vi.fn(), neq: vi.fn(), is: vi.fn(), order: vi.fn(), limit: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null }),
    range: vi.fn().mockResolvedValue({ data: result.data ?? [], error: result.error ?? null }),
    then: (resolve: (value: unknown) => unknown) => resolve({ data: result.data ?? [], error: result.error ?? null, count: result.count ?? null }),
  };
  for (const method of ["select", "eq", "neq", "is", "order", "limit"] as const) builder[method].mockReturnValue(builder);
  return builder;
}

describe("employer billing API", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it("denies employer admins without settings permission for reads and writes", async () => {
    const from = vi.fn();
    requireRole.mockResolvedValue({
      admin: { from }, user: { id: "admin-1" },
      profile: { role: "employer_admin", business_id: "business-1", admin_permissions: ["payroll"] },
    });
    expect((await GET(request())).status).toBe(403);
    expect((await PATCH(request("PATCH"))).status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it("includes open statements beyond recent history and calculates the next month across years", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T10:00:00Z"));
    const open = Array.from({ length: 501 }, (_, index) => ({
      id: `statement-${index}`, statement_type: "monthly", statement_month: "2025-12-01", amount: 1,
      status: "pending", recipient_email: null, paid_at: null, emailed_at: null, payment_reference: null,
      created_at: new Date(Date.UTC(2025, 11, 31) - index * 1000).toISOString(), payment_provider: null,
    }));
    const membership = query({ data: { membership_role: "admin" } });
    const business = query({ data: { id: "business-1", business_name: "Test business" } });
    const subscription = query({ data: { id: "subscription-1", created_at: "2025-01-01T00:00:00Z", plan_name: "Starter" } });
    const recent = query({ data: [open[0]] });
    const latest = query({ data: { statement_month: "2025-12-01" } });
    const employees = query({ count: 0 });
    const signupPayments = query({ data: [{ id: "payment-1", subscription_id: "subscription-1", setup_amount: 249, first_month_amount: 199, total_amount: 448, covered_month: "2025-01-01", status: "verified", verified_at: "2025-01-02T00:00:00Z", created_at: "2025-01-01T00:00:00Z" }] });
    const openPage = query();
    openPage.range.mockImplementation(async (start: number) => ({ data: open.slice(start, start + 500), error: null }));
    let statementQueries = 0;
    const from = vi.fn((table: string) => {
      if (table === "employer_business_memberships") return membership;
      if (table === "businesses") return business;
      if (table === "subscriptions") return subscription;
      if (table === "employees") return employees;
      if (table === "application_initial_payments") return signupPayments;
      if (table === "subscription_statements") return [recent, latest][statementQueries++] || openPage;
      throw new Error(`Unexpected table ${table}`);
    });
    requireRole.mockResolvedValue({
      admin: { from }, user: { id: "admin-1" },
      profile: { role: "employer_admin", business_id: "business-1", admin_permissions: ["settings"] },
    });

    const response = await GET(request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.openBalance).toBe(501);
    expect(body.statements).toHaveLength(501);
    expect(body.nextInvoiceDate).toBe("2026-11-01");
    expect(body.initialPayments).toHaveLength(1);
    expect(signupPayments.eq).toHaveBeenCalledWith("business_id", "business-1");
    expect(signupPayments.eq).toHaveBeenCalledWith("status", "verified");
    expect(openPage.range).toHaveBeenCalledTimes(2);
  });
});
