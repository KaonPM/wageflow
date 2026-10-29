import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const queueEmail = vi.fn();
vi.mock("../../app/api/_lib/applicationWorkflow", () => ({ queueEmail }));

const { employerPasswordSetupHtml, queueEmployerPasswordSetup } = await import("../../app/api/_lib/employerOnboarding");

describe("employer onboarding outbox helpers (mocked database)", () => {
  const context = { applicationId: "application-1", businessId: "business-1", email: "owner@example.test", contactName: "Owner", businessName: "Example", initialPaymentId: "payment-1" };

  it("does not requeue the automatic password email when its idempotency key already exists", async () => {
    queueEmail.mockResolvedValueOnce({ queued: false, duplicate: true });
    const rpc = vi.fn();
    await queueEmployerPasswordSetup({ rpc } as never, context);
    expect(rpc).not.toHaveBeenCalled();
    expect(queueEmail).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ idempotencyKey: "employer-password-setup:application-1", eventType: "employer_password_setup" }));
  });

  it("uses a separate idempotency key for an explicitly authorised recovery delivery", async () => {
    queueEmail.mockResolvedValueOnce({ queued: true, duplicate: false });
    const rpc = vi.fn().mockResolvedValue({ error: null });
    await queueEmployerPasswordSetup({ rpc } as never, context, true);
    expect(rpc).toHaveBeenCalledWith("queue_application_employer_password_setup", { application_id_input: "application-1" });
    expect(queueEmail.mock.calls[0][1].idempotencyKey).toMatch(/^employer-password-setup:application-1:recovery:/);
  });

  it("renders a password-setup email without a password and escapes contact data", () => {
    const html = employerPasswordSetupHtml("<Owner>", "owner@example.test", "https://example.test/reset?token=a");
    expect(html).toContain("&lt;Owner&gt;");
    expect(html).not.toMatch(/password\s*[:=]\s*[^<]/i);
    expect(html).toContain("Set your secure password");
  });
});
