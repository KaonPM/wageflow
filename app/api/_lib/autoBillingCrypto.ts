import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function key() {
  const encoded = process.env.BILLING_AUTHORIZATION_KEY;
  const decoded = encoded ? Buffer.from(encoded, "base64") : Buffer.alloc(0);
  if (decoded.length !== 32 || !encoded || decoded.toString("base64") !== encoded) {
    throw new Error("Automatic billing encryption is not configured.");
  }
  return decoded;
}

export function assertAutomaticBillingKeyConfigured() { key(); }

export function encryptAuthorization(code: string) {
  if (!/^AUTH_[A-Za-z0-9]+$/.test(code)) throw new Error("This card authorization cannot be saved.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptAuthorization(value: string) {
  const parts = value.split(".");
  if (parts.length !== 3) throw new Error("Automatic billing authorization is invalid.");
  const [iv, tag, encrypted] = parts.map((part) => Buffer.from(part, "base64url"));
  if (iv.length !== 12 || tag.length !== 16 || encrypted.length === 0) throw new Error("Automatic billing authorization is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  const code = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  if (!/^AUTH_[A-Za-z0-9]+$/.test(code)) throw new Error("Automatic billing authorization is invalid.");
  return code;
}
