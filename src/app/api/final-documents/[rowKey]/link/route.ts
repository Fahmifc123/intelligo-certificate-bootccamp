import { NextRequest, NextResponse } from "next/server";
import { isDbConfigured, getFinalDocumentByRowKey, setFinalDocumentCertificateId } from "@/lib/db";

// Reserves a certificate ID for a Dokumen Akhir row before the admin actually
// generates/downloads it via Input Manual, so the row shows up linked right
// away instead of only after a PDF is produced.
export async function POST(req: NextRequest, { params }: { params: Promise<{ rowKey: string }> }) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL belum diset." }, { status: 500 });
  }
  const { rowKey } = await params;
  const decoded = decodeURIComponent(rowKey);
  const row = await getFinalDocumentByRowKey(decoded);
  if (!row) return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });

  const { certificateId } = (await req.json().catch(() => ({}))) as { certificateId?: string };
  if (!certificateId || !certificateId.trim()) {
    return NextResponse.json({ error: "certificateId wajib diisi." }, { status: 400 });
  }

  if (!row.certificate_id) {
    await setFinalDocumentCertificateId(decoded, certificateId.trim());
  }
  return NextResponse.json({ ok: true, certificateId: row.certificate_id || certificateId.trim() });
}
