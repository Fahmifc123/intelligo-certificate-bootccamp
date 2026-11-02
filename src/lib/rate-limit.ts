type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Best-effort, per-instance in-memory limiter. On serverless this resets
// whenever a fresh function instance spins up, so treat it as a speed bump
// against naive abuse, not a hard guarantee.
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { ok: false, remaining: 0 };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count };
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
