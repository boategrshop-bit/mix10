import { createHmac, timingSafeEqual } from "crypto";

// Session handling for /tools store customers. Mirrors lib/student-auth.ts:
// a signed, stateless cookie so we don't need server-side session storage.
export const TOOLS_COOKIE_NAME = "tools_customer_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "tools-dev-insecure-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export interface CustomerSession {
  id: number;
  email: string;
}

export function createCustomerSessionToken(session: CustomerSession): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const encodedEmail = Buffer.from(session.email).toString("base64url");
  const payload = `${session.id}.${encodedEmail}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyCustomerSessionToken(token: string | undefined | null): CustomerSession | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [idStr, encodedEmail, expiresStr, sig] = parts;
  const payload = `${idStr}.${encodedEmail}.${expiresStr}`;
  if (!safeEqual(sig, sign(payload))) return null;

  const expiresAt = Number(expiresStr);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;

  const id = Number(idStr);
  if (!Number.isInteger(id)) return null;

  let email: string;
  try {
    email = Buffer.from(encodedEmail, "base64url").toString("utf8");
  } catch {
    return null;
  }
  return { id, email };
}

export const TOOLS_COOKIE_MAX_AGE = Math.floor(SESSION_TTL_MS / 1000);
