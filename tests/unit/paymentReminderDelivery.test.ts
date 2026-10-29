import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseAdmin = vi.fn();
vi.mock("../../app/api/_lib/authorization", () => ({ getSupabaseAdmin }));
vi.mock("../../app/api/_lib/employerOnboarding", () => ({
  EmployerOnboardingError: class EmployerOnboardingError extends Error {},
  createEmployerPasswordSetupLink: vi.fn(),
  employerPasswordSetupHtml: vi.fn(),
  provisionEmployerOnboarding: vi.fn(),
  queueEmployerPasswordSetup: vi.fn(),
}));
vi.mock("../../app/api/_lib/applicationWorkflow", () => ({ queueEmail: vi.fn() }));

const { GET } = await import("../../app/api/cron/application-payment-reminders/route");

describe("payment reminder delivery eligibility", () => {
  const priorCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = priorCronSecret;
  });

  it("cancels a claimed payment reminder that is no longer linked to an eligible attempt", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === "claim_email_outbox") return { data: [{ id: "outbox-1", claim_token: "claim-1", application_id: "application-1", event_type: "initial_payment_reminder", recipient_email: "applicant@example.test", attempt_count: 1, payload: { paymentUrl: "https://wageflow.test/pay/revoked-token" } }], error: null };
      if (name === "can_deliver_application_payment_email") return { data: false, error: null };
      if (name === "cancel_email_outbox") return { data: true, error: null };
      throw new Error(`Unexpected RPC: ${name}`);
    });
    const admin = {
      from: vi.fn(() => ({ select: vi.fn(() => ({ in: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn(() => ({ range: vi.fn().mockResolvedValue({ data: [], error: null }) })) })) })) })) })),
      rpc,
    };
    getSupabaseAdmin.mockReturnValue(admin);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await GET(new Request("https://wageflow.test/api/cron/application-payment-reminders", { headers: { authorization: "Bearer test-cron-secret" } }));

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("cancel_email_outbox", expect.objectContaining({ outbox_id_input: "outbox-1", worker_claim: "claim-1" }));
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
