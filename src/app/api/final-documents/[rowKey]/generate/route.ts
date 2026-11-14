import { NextRequest, NextResponse } from "next/server";
import { encodeParticipant } from "@/lib/encode";
import {
  isDbConfigured,
  getFinalDocumentByRowKey,
  setFinalDocumentCertificateId,
  getCertificateById,
  recordSendAttempt,
} from "@/lib/db";
import { makeCertificateId } from "@/lib/id";
import { renderPdf } from "@/lib/pdf";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getOrigin } from "@/lib/request-origin";
import type { ParticipantData } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ rowKey: string }> }) {
  const { ok } = rateLimit(`final-docs-generate:${clientIp(req)}`, 30, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "Terlalu banyak permintaan, coba lagi sebentar." }, { status: 429 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL belum diset." }, { status: 500 });
  }

  const { rowKey } = await params;
  const row = await getFinalDocumentByRowKey(decodeURIComponent(rowKey));
  if (!row) {
    return NextResponse.json({ error: "Data tidak ditemukan. Coba sync ulang." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    nama?: string;
    email?: string;
    judul?: string;
    batch?: string;
    pelaksanaan?: string;
    certificateType?: string;
    location?: string;
  };

  const nama = (body.nama ?? row.nama).trim();
  const email = (body.email ?? row.email).trim();
  if (!nama || !email) {
    return NextResponse.json({ error: "Nama dan email wajib diisi." }, { status: 400 });
  }

  // Reuse the certificate ID already linked to this row (so "edit & regenerate"
  // overwrites the same certificate instead of creating a duplicate).
  const id = row.certificate_id || makeCertificateId();
  if (!row.certificate_id) {
    const existing = await getCertificateById(id);
    if (existing) {
      return NextResponse.json({ error: "Certificate ID bentrok, coba lagi." }, { status: 409 });
    }
  }

  const data: ParticipantData = {
    id,
    nama,
    email,
    judul: (body.judul ?? row.judul_final_project ?? "").trim(),
    batch: (body.batch ?? row.batch ?? "").trim(),
    pelaksanaan: (body.pelaksanaan ?? "").trim(),
    sendMode: "certificate",
    modules: [],
    total: 0,
    grade: "",
    certificateType: (body.certificateType ?? "COMPLETION").trim() || "COMPLETION",
    location: (body.location ?? "").trim(),
  };

  try {
    const origin = await getOrigin();
    const encoded = encodeParticipant(data);
    const pdf = await renderPdf(origin, "certificate", encoded);

    await recordSendAttempt({
      id: data.id,
      nama: data.nama,
      email: data.email,
      judul: data.judul,
      batch: data.batch,
      pelaksanaan: data.pelaksanaan,
      sendMode: data.sendMode,
      total: data.total,
      grade: data.grade,
      modules: data.modules,
      certificateType: data.certificateType,
      location: data.location,
      status: "pending",
    });
    await setFinalDocumentCertificateId(row.row_key, data.id);

    return NextResponse.json({ ok: true, participant: data, pdfBase64: Buffer.from(pdf).toString("base64") });
  } catch (e) {
    return NextResponse.json({ error: `Gagal membuat sertifikat: ${(e as Error).message}` }, { status: 500 });
  }
}
