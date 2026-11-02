import { NextRequest, NextResponse } from "next/server";
import { encodeParticipant } from "@/lib/encode";
import { saveInvoiceAttempt } from "@/lib/invoice-history";
import { saveReceiptAttempt } from "@/lib/receipt-history";
import { isDbConfigured, getCertificateById, recordSendAttempt } from "@/lib/db";
import { renderPdf, type PdfKind } from "@/lib/pdf";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getOrigin } from "@/lib/request-origin";
import type { InvoiceData, ParticipantData, ReceiptData } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { ok } = rateLimit(`pdf:${clientIp(req)}`, 30, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "Terlalu banyak permintaan, coba lagi sebentar." }, { status: 429 });
  }

  const body = (await req.json()) as { kind: PdfKind; data: ParticipantData | InvoiceData | ReceiptData };

  if (
    body.kind !== "certificate" &&
    body.kind !== "performance" &&
    body.kind !== "invoice" &&
    body.kind !== "receipt"
  ) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  // Certificate IDs are permanent once issued. If this download's ID already
  // belongs to a different participant, refuse instead of silently
  // overwriting their saved record (a same-participant re-download is fine).
  if (body.kind === "certificate" && isDbConfigured()) {
    const data = body.data as ParticipantData;
    const existing = await getCertificateById(data.id);
    if (existing && (existing.nama !== data.nama || existing.email !== data.email)) {
      return NextResponse.json(
        { error: `Certificate ID "${data.id}" sudah dipakai untuk ${existing.nama} (${existing.email}). Generate ID baru.` },
        { status: 409 }
      );
    }
  }

  try {
    const origin = await getOrigin();
    const encoded = encodeParticipant(body.data);
    const pdf = await renderPdf(origin, body.kind, encoded);

    let filename: string;
    if (body.kind === "certificate") {
      const data = body.data as ParticipantData;
      filename = `${data.nama} - Certificate.pdf`;
      if (isDbConfigured()) {
        await recordSendAttempt({
          id: data.id,
          nama: data.nama,
          email: data.email,
          judul: data.judul,
          batch: data.batch,
          pelaksanaan: data.pelaksanaan,
          photoUrl: data.photoUrl,
          sendMode: data.sendMode,
          total: data.total,
          grade: data.grade,
          modules: data.modules,
          certificateType: data.certificateType,
          status: "pending",
        });
      }
    } else if (body.kind === "performance") {
      filename = `${(body.data as ParticipantData).nama} - Performance Report.pdf`;
    } else if (body.kind === "invoice") {
      const invoice = body.data as InvoiceData;
      filename = `Invoice ${invoice.invoiceNo.replace(/\//g, "-")} - ${invoice.clientName}.pdf`;
      await saveInvoiceAttempt(invoice, "pending");
    } else {
      const receipt = body.data as ReceiptData;
      filename = `Bukti Pembayaran ${receipt.receiptNo.replace(/\//g, "-")} - ${receipt.receivedFrom}.pdf`;
      await saveReceiptAttempt(receipt, "pending");
    }

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("PDF generation failed:", e);
    return NextResponse.json({ error: `Gagal membuat PDF: ${(e as Error).message}` }, { status: 500 });
  }
}
