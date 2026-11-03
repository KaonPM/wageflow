import { afterEach, describe, expect, it } from "vitest";
import { encryptAuthorization, decryptAuthorization, assertAutomaticBillingKeyConfigured } from "../../app/api/_lib/autoBillingCrypto";

const prior = process.env.BILLING_AUTHORIZATION_KEY;
afterEach(() => {
  if (prior === undefined) delete process.env.BILLING_AUTHORIZATION_KEY;
  else process.env.BILLING_AUTHORIZATION_KEY = prior;
});

describe("automatic billing authorization storage", () => {
  it("encrypts a reusable authorization and rejects tampering", () => {
    process.env.BILLING_AUTHORIZATION_KEY = Buffer.alloc(32, 7).toString("base64");
    const encrypted = encryptAuthorization("AUTH_test123");
    expect(encrypted).not.toContain("AUTH_test123");
    expect(decryptAuthorization(encrypted)).toBe("AUTH_test123");
    expect(() => decryptAuthorization(`${encrypted.slice(0, -2)}xx`)).toThrow();
  });

  it("fails closed without a configured encryption key", () => {
    delete process.env.BILLING_AUTHORIZATION_KEY;
    expect(() => assertAutomaticBillingKeyConfigured()).toThrow();
    expect(() => encryptAuthorization("AUTH_test123")).toThrow();
  });
});
