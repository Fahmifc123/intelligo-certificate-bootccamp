const SESSION_COOKIE = "intelligo_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toHex(signature);
}

/** Constant-time string comparison (equal-length strings only give a timing guarantee). */
export function constantTimeEqual(a: string, b: string): boolean {
  const bufA = new TextEncoder().encode(a);
  const bufB = new TextEncoder().encode(b);
  const len = Math.max(bufA.length, bufB.length, 1);
  let diff = bufA.length === bufB.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    diff |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  return diff === 0;
}

export function checkAdminPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return constantTimeEqual(candidate, expected);
}

export async function createSessionToken(): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET belum diset di environment variables.");
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `admin.${expiresAt}`;
  const signature = await hmacSha256Hex(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [who, expiresAtStr, signature] = parts;
  if (who !== "admin") return false;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  const expectedSignature = await hmacSha256Hex(`${who}.${expiresAtStr}`, secret);
  return constantTimeEqual(signature, expectedSignature);
}

export { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS };
