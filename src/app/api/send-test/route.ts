import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { encodeParticipant } from "@/lib/encode";
import { buildEmailHtml, buildEmailSubject } from "@/lib/email-template";
import { renderPdf } from "@/lib/pdf";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getOrigin } from "@/lib/request-origin";
import type { ParticipantData } from "@/lib/types";

export const maxDuration = 60;

// Sends the exact same certificate/email a real participant would get, but to
// an address the admin types in for previewing — never to data.email, and
// never recorded in the certificates history (no recordSendAttempt call).
export async function POST(req: NextRequest) {
  const { ok } = rateLimit(`send-test:${clientIp(req)}`, 20, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "Terlalu banyak permintaan, coba lagi sebentar." }, { status: 429 });
  }

  const body = (await req.json()) as ParticipantData & { testEmail?: string };
  const testEmail = body.testEmail?.trim();
  if (!testEmail) {
    return NextResponse.json({ error: "Email tes wajib diisi." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM;
  if (!apiKey || !fromAddress) {
    return NextResponse.json(
      { error: "RESEND_API_KEY / EMAIL_FROM belum diset di environment variables." },
      { status: 500 }
    );
  }

  const data: ParticipantData = { ...body };

  try {
    const origin = await getOrigin();
    const encoded = encodeParticipant(data);

    const certificatePdf = await renderPdf(origin, "certificate", encoded);
    const attachments = [
      {
        filename: `${data.nama || "Test"} - Certificate.pdf`,
        content: certificatePdf.toString("base64"),
      },
    ];

    if (data.sendMode === "performance") {
      const performancePdf = await renderPdf(origin, "performance", encoded);
      attachments.push({
        filename: `${data.nama || "Test"} - Performance Report.pdf`,
        content: performancePdf.toString("base64"),
      });
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: testEmail,
      subject: `[TEST] ${buildEmailSubject(data)}`,
      html: buildEmailHtml(data),
      attachments,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
