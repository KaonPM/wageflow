import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseAdmin = vi.fn();
const queueEmail = vi.fn();
vi.mock("../../app/api/_lib/authorization", () => ({ getSupabaseAdmin }));
vi.mock("../../app/api/_lib/applicationWorkflow", () => ({ queueEmail }));
vi.mock("../../app/api/_lib/employerOnboarding", () => ({
  EmployerOnboardingError: class EmployerOnboardingError extends Error {},
  createEmployerPasswordSetupLink: vi.fn(),
  employerPasswordSetupHtml: vi.fn(),
  provisionEmployerOnboarding: vi.fn(),
  queueEmployerPasswordSetup: vi.fn(),
}));
const { GET } = await import("../../app/api/cron/application-payment-reminders/route");

const payment = {
  id: "payment-1", application_id: "application-1",
  created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  wageflow_setup_requests: { email: "applicant@example.test", business_name: "Example", lifecycle_status: "awaiting_initial_payment" },
};
const item = {
  id: "outbox-1", claim_token: "claim-1", application_id: "application-1",
  event_type: "initial_payment_reminder", recipient_email: "applicant@example.test",
  attempt_count: 1, payload: { paymentUrl: "https://example.test/pay/test-token" },
};
const ok = (data: unknown) => ({ data, error: null });
const failure = () => ({ data: null, error: { message: "Database unavailable" } });

function harness(input: {
  active?: typeof payment[];
  archived?: typeof payment[];
  outbox?: typeof item[];
  overrides?: Record<string, (...args: unknown[]) => unknown>;
  quarantine?: unknown;
} = {}) {
  const rpc = vi.fn(async (name: string, args?: unknown) => {
    const override = input.overrides?.[name];
    if (override) return override(args);
    if (name === "claim_email_outbox") return ok(input.outbox || []);
    if (name === "can_deliver_application_payment_email") return ok(true);
    if (name === "cancel_email_outbox" || name === "finish_email_outbox") return ok(true);
    if (name === "schedule_application_payment_reminder") return ok(true);
    if (name === "archive_unpaid_application") return ok("archived");
    throw new Error("Unexpected RPC");
  });
  const quarantine = vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue(ok(input.quarantine === undefined ? { id: item.id } : input.quarantine)) })),
        })),
      })),
    })),
  }));
  const from = vi.fn((table: string) => {
    if (table === "email_outbox") return { update: quarantine };
    if (table !== "application_initial_payments") throw new Error("Unexpected table");
    return { select: vi.fn(() => ({
      in: vi.fn(() => ({
        eq: vi.fn((_column: string, lifecycle: string) => ({
          order: vi.fn(() => ({
            range: vi.fn().mockResolvedValue(ok(lifecycle === "archived" ? (input.archived || []) : (input.active || []))),
          })),
        })),
      })),
    })) };
  });
  getSupabaseAdmin.mockReturnValue({ rpc, from });
  return { rpc, from, quarantine };
}

async function run() {
  const response = await GET(new Request("https://example.test/api/cron/application-payment-reminders", {
    headers: { authorization: "Bearer test-cron-secret" },
  }));
  return { status: response.status, body: await response.json() as { issues: string[]; scheduled: number; closureQueued: number; cancelled: number; delivered: number } };
}

describe("reminder worker reliability (mocked database and Brevo)", () => {
  const oldCron = process.env.CRON_SECRET;
  const oldBrevo = process.env.BREVO_API_KEY;
  const oldSender = process.env.BREVO_FROM_EMAIL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
    process.env.BREVO_API_KEY = "test-key";
    process.env.BREVO_FROM_EMAIL = "sender@example.test";
    queueEmail.mockResolvedValue({ queued: true, duplicate: false });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    process.env.CRON_SECRET = oldCron;
    process.env.BREVO_API_KEY = oldBrevo;
    process.env.BREVO_FROM_EMAIL = oldSender;
  });

  it("does not cancel on an eligibility RPC error and retains a retry", async () => {
    const { rpc } = harness({ outbox: [item], overrides: { can_deliver_application_payment_email: failure } });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await run();
    expect(result.status).toBe(500);
    expect(result.body.issues).toContain("payment_email_eligibility_failed");
    expect(rpc).not.toHaveBeenCalledWith("cancel_email_outbox", expect.anything());
    expect(rpc).toHaveBeenCalledWith("finish_email_outbox", expect.objectContaining({ claim: item.claim_token, delivered: false }));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("cancels confirmed ineligibility only when the claim-aware RPC succeeds", async () => {
    const { rpc } = harness({ outbox: [item], overrides: { can_deliver_application_payment_email: () => ok(false) } });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await run();
    expect(result.status).toBe(200);
    expect(result.body.cancelled).toBe(1);
    expect(rpc).toHaveBeenCalledWith("cancel_email_outbox", expect.objectContaining({ worker_claim: item.claim_token }));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([["error", failure], ["lost claim", () => ok(false)]])("surfaces cancellation %s and leaves a retry path", async (_label, cancelled) => {
    const { rpc } = harness({ outbox: [item], overrides: { can_deliver_application_payment_email: () => ok(false), cancel_email_outbox: cancelled } });
    const result = await run();
    expect(result.status).toBe(500);
    expect(result.body.issues).toContain("payment_email_cancel_failed");
    expect(rpc).toHaveBeenCalledWith("finish_email_outbox", expect.objectContaining({ delivered: false }));
  });

  it("reports a scheduling RPC failure", async () => {
    harness({ active: [payment], overrides: { schedule_application_payment_reminder: failure } });
    const result = await run();
    expect(result.status).toBe(500);
    expect(result.body.issues).toContain("reminder_schedule_failed");
  });

  it.each([["error", failure, "archive_rpc_failed"], ["unexpected", () => ok("unknown"), "archive_result_unexpected"]])("reports archival %s", async (_label, archived, code) => {
    harness({ active: [{ ...payment, created_at: new Date(Date.now() - 15 * 86_400_000).toISOString() }], overrides: { archive_unpaid_application: archived } });
    const result = await run();
    expect(result.status).toBe(500);
    expect(result.body.issues).toContain(code);
    expect(queueEmail).not.toHaveBeenCalled();
  });

  it("recovers closure queuing on the next run and suppresses duplicate logical jobs", async () => {
    const overdue = { ...payment, created_at: new Date(Date.now() - 15 * 86_400_000).toISOString() };
    harness({ active: [overdue] });
    queueEmail.mockRejectedValueOnce(new Error("Database unavailable"));
    const first = await run();
    expect(first.status).toBe(500);
    expect(first.body.issues).toContain("closure_queue_failed");
    harness({ archived: [{ ...overdue, wageflow_setup_requests: { ...payment.wageflow_setup_requests, lifecycle_status: "archived" } }] });
    const second = await run();
    expect(second.status).toBe(200);
    expect(second.body.closureQueued).toBe(1);
    queueEmail.mockResolvedValue({ queued: false, duplicate: true });
    const third = await run();
    expect(third.status).toBe(200);
    expect(third.body.closureQueued).toBe(0);
    expect(queueEmail.mock.calls[0][1].idempotencyKey).toBe(queueEmail.mock.calls[1][1].idempotencyKey);
  });

  it.each(["payment completes", "application archives", "link is replaced"])("does not send when %s before eligibility recheck", async () => {
    harness({ outbox: [item], overrides: { can_deliver_application_payment_email: () => ok(false) } });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await run();
    expect(result.status).toBe(200);
    expect(result.body.cancelled).toBe(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("quarantines a provider-accepted message when completion fails", async () => {
    const { quarantine } = harness({ outbox: [item], overrides: { finish_email_outbox: failure } });
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as Response);
    const result = await run();
    expect(result.status).toBe(500);
    expect(result.body.issues).toContain("provider_accepted_manual_review");
    expect(quarantine).toHaveBeenCalledWith(expect.objectContaining({ status: "permanently_failed" }));
  });

  it("reports unresolved delivery if both finish and quarantine fail", async () => {
    harness({ outbox: [item], quarantine: null, overrides: { finish_email_outbox: failure } });
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as Response);
    const result = await run();
    expect(result.status).toBe(500);
    expect(result.body.issues).toContain("provider_accepted_unresolved");
  });

  it("uses one logical reminder key across duplicate cron executions", async () => {
    const { rpc } = harness({ active: [payment], overrides: { schedule_application_payment_reminder: () => ok(false) } });
    const first = await run();
    const second = await run();
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const calls = rpc.mock.calls.filter(([name]) => name === "schedule_application_payment_reminder");
    expect(calls).toHaveLength(2);
    expect((calls[0][1] as { reminder_key: string }).reminder_key)
      .toBe((calls[1][1] as { reminder_key: string }).reminder_key);
  });

  it("cannot finish a job after another worker takes its claim", async () => {
    harness({ outbox: [item], quarantine: null, overrides: { finish_email_outbox: () => ok(false) } });
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as Response);
    const result = await run();
    expect(result.status).toBe(500);
    expect(result.body.issues).toContain("provider_accepted_unresolved");
  });
});
