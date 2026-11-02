import { NextRequest, NextResponse } from "next/server";
import { getCertificateById, isDbConfigured } from "@/lib/db";
import { constantTimeEqual } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// Loose enough to cover any id this app has ever issued, strict enough to
// reject junk (path traversal attempts, SQL-ish noise, etc.) before it ever
// reaches the database.
const ID_PATTERN = /^[A-Z0-9-]{4,40}$/;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ok } = rateLimit(`verify:${clientIp(req)}`, 60, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Cache-Control": "no-store" } });
  }

  const requiredKey = process.env.CERTIFICATE_VERIFY_KEY;
  if (requiredKey) {
    const providedKey = req.headers.get("x-verify-key") ?? "";
    if (!constantTimeEqual(providedKey, requiredKey)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
  }

  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId).trim().toUpperCase();

  if (!ID_PATTERN.test(id) || !isDbConfigured()) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const cert = await getCertificateById(id);
  if (!cert) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    {
      certificate_id: cert.id,
      name: cert.nama,
      program: cert.judul,
      batch: cert.batch,
      period: cert.pelaksanaan || null,
      issued_at: (cert.sent_at || cert.created_at)?.slice(0, 10) || null,
      type: "certificate",
      status: cert.status === "revoked" ? "revoked" : "valid",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
