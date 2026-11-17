import { NextRequest, NextResponse } from "next/server";
import { getCertificateById } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getCertificateById(id);
  if (!record) return NextResponse.json({ error: "Sertifikat tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ certificate: record });
}
