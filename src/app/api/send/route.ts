import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { encodeParticipant } from "@/lib/encode";
import { buildEmailHtml, buildEmailSubject } from "@/lib/email-template";
import { renderPdf } from "@/lib/pdf";
import { getOrigin } from "@/lib/request-origin";
import type { ParticipantData } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM;
  if (!apiKey || !fromAddress) {
    return NextResponse.json(
      { error: "RESEND_API_KEY / EMAIL_FROM belum diset di environment variables." },
      { status: 500 }
    );
  }

  const data = (await req.json()) as ParticipantData;
  const origin = await getOrigin();
  const encoded = encodeParticipant(data);

  const certificatePdf = await renderPdf(origin, "certificate", encoded);
  const attachments = [
    {
      filename: `${data.nama} - Certificate.pdf`,
      content: certificatePdf.toString("base64"),
    },
  ];

  if (data.sendMode === "performance") {
    const performancePdf = await renderPdf(origin, "performance", encoded);
    attachments.push({
      filename: `${data.nama} - Performance Report.pdf`,
      content: performancePdf.toString("base64"),
    });
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: fromAddress,
    to: data.email,
    subject: buildEmailSubject(data),
    html: buildEmailHtml(data),
    attachments,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
