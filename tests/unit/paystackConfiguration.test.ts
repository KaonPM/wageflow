import { afterEach, describe, expect, it, vi } from "vitest";
import { initializePaystackTransaction } from "../../app/api/_lib/paystack";

const savedMode = process.env.PAYSTACK_MODE;
const savedKey = process.env.PAYSTACK_SECRET_KEY;

afterEach(() => {
  if (savedMode === undefined) delete process.env.PAYSTACK_MODE;
  else process.env.PAYSTACK_MODE = savedMode;
  if (savedKey === undefined) delete process.env.PAYSTACK_SECRET_KEY;
  else process.env.PAYSTACK_SECRET_KEY = savedKey;
  vi.unstubAllGlobals();
});

describe("Paystack server configuration", () => {
  it("rejects an unspecified payment environment before calling Paystack", async () => {
    delete process.env.PAYSTACK_MODE;
    process.env.PAYSTACK_SECRET_KEY = "sk_test_example";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(initializePaystackTransaction({
      email: "billing@example.test", amount: 1, reference: "reference", callbackUrl: "https://wageflow.test/callback", statementId: "statement", businessId: "business",
    })).rejects.toThrow("safe environment");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a key that does not match the configured payment environment", async () => {
    process.env.PAYSTACK_MODE = "test";
    process.env.PAYSTACK_SECRET_KEY = "sk_live_example";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(initializePaystackTransaction({
      email: "billing@example.test", amount: 1, reference: "reference", callbackUrl: "https://wageflow.test/callback", statementId: "statement", businessId: "business",
    })).rejects.toThrow("does not match");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
