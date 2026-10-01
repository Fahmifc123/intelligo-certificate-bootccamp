import { NextRequest, NextResponse } from "next/server";
import { encodeParticipant } from "@/lib/encode";
import { saveInvoiceAttempt } from "@/lib/invoice-history";
import { renderPdf, type PdfKind } from "@/lib/pdf";
import { getOrigin } from "@/lib/request-origin";
import type { InvoiceData, ParticipantData } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { kind: PdfKind; data: ParticipantData | InvoiceData };

  if (body.kind !== "certificate" && body.kind !== "performance" && body.kind !== "invoice") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  try {
    const origin = await getOrigin();
    const encoded = encodeParticipant(body.data);
    const pdf = await renderPdf(origin, body.kind, encoded);

    let filename: string;
    if (body.kind === "certificate") {
      filename = `${(body.data as ParticipantData).nama} - Certificate.pdf`;
    } else if (body.kind === "performance") {
      filename = `${(body.data as ParticipantData).nama} - Performance Report.pdf`;
    } else {
      const invoice = body.data as InvoiceData;
      filename = `Invoice ${invoice.invoiceNo.replace(/\//g, "-")} - ${invoice.clientName}.pdf`;
      await saveInvoiceAttempt(invoice, "pending");
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
