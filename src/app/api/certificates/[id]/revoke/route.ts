import { NextRequest, NextResponse } from "next/server";
import { revokeCertificate, unrevokeCertificate } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { reason } = (await req.json().catch(() => ({}))) as { reason?: string };
  if (!reason || !reason.trim()) {
    return NextResponse.json({ error: "Alasan pencabutan wajib diisi." }, { status: 400 });
  }
  const found = await revokeCertificate(id, reason.trim());
  if (!found) return NextResponse.json({ error: "Sertifikat tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await unrevokeCertificate(id);
  if (!found) return NextResponse.json({ error: "Sertifikat tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
