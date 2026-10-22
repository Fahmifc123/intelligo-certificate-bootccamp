import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { encodeParticipant } from "@/lib/encode";
import { buildReceiptEmailHtml, buildReceiptEmailSubject } from "@/lib/receipt-email-template";
import { saveReceiptAttempt } from "@/lib/receipt-history";
import { renderPdf } from "@/lib/pdf";
import { getOrigin } from "@/lib/request-origin";
import type { ReceiptData } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const data = (await req.json()) as ReceiptData;

  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM;
  if (!apiKey || !fromAddress) {
    const message = "RESEND_API_KEY / EMAIL_FROM belum diset di environment variables.";
    await saveReceiptAttempt(data, "failed", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!data.receivedEmail) {
    return NextResponse.json({ error: "Email penerima belum diisi." }, { status: 400 });
  }

  try {
    const origin = await getOrigin();
    const encoded = encodeParticipant(data);
    const pdf = await renderPdf(origin, "receipt", encoded);

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: data.receivedEmail,
      subject: buildReceiptEmailSubject(data),
      html: buildReceiptEmailHtml(data),
      attachments: [
        {
          filename: `Bukti Pembayaran ${data.receiptNo.replace(/\//g, "-")}.pdf`,
          content: pdf.toString("base64"),
        },
      ],
    });

    if (error) {
      await saveReceiptAttempt(data, "failed", error.message);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    await saveReceiptAttempt(data, "sent");
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = (e as Error).message;
    await saveReceiptAttempt(data, "failed", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
