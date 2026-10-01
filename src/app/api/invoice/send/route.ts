import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { encodeParticipant } from "@/lib/encode";
import { buildInvoiceEmailHtml, buildInvoiceEmailSubject } from "@/lib/invoice-email-template";
import { saveInvoiceAttempt as saveAttempt } from "@/lib/invoice-history";
import { renderPdf } from "@/lib/pdf";
import { getOrigin } from "@/lib/request-origin";
import type { InvoiceData } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const data = (await req.json()) as InvoiceData;

  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM;
  if (!apiKey || !fromAddress) {
    const message = "RESEND_API_KEY / EMAIL_FROM belum diset di environment variables.";
    await saveAttempt(data, "failed", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!data.clientEmail) {
    return NextResponse.json({ error: "Email klien belum diisi." }, { status: 400 });
  }

  try {
    const origin = await getOrigin();
    const encoded = encodeParticipant(data);
    const pdf = await renderPdf(origin, "invoice", encoded);

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: data.clientEmail,
      subject: buildInvoiceEmailSubject(data),
      html: buildInvoiceEmailHtml(data),
      attachments: [
        {
          filename: `Invoice ${data.invoiceNo.replace(/\//g, "-")}.pdf`,
          content: pdf.toString("base64"),
        },
      ],
    });

    if (error) {
      await saveAttempt(data, "failed", error.message);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    await saveAttempt(data, "sent");
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = (e as Error).message;
    await saveAttempt(data, "failed", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
