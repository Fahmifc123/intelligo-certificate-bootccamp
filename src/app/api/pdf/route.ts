import { NextRequest, NextResponse } from "next/server";
import { encodeParticipant } from "@/lib/encode";
import { renderPdf, type PdfKind } from "@/lib/pdf";
import { getOrigin } from "@/lib/request-origin";
import type { ParticipantData } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { kind: PdfKind; data: ParticipantData };

  if (body.kind !== "certificate" && body.kind !== "performance") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const origin = await getOrigin();
  const encoded = encodeParticipant(body.data);
  const pdf = await renderPdf(origin, body.kind, encoded);

  const filename =
    body.kind === "certificate"
      ? `${body.data.nama} - Certificate.pdf`
      : `${body.data.nama} - Performance Report.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
