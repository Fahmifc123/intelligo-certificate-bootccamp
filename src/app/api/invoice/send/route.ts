import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { encodeParticipant } from "@/lib/encode";
import { buildInvoiceEmailHtml, buildInvoiceEmailSubject } from "@/lib/invoice-email-template";
import { isDbConfigured, recordInvoiceSendAttempt } from "@/lib/db";
import { renderPdf } from "@/lib/pdf";
import { getOrigin } from "@/lib/request-origin";
import type { InvoiceData } from "@/lib/types";
import { invoiceTotal } from "@/lib/types";

export const maxDuration = 60;

async function saveAttempt(data: InvoiceData, status: "sent" | "failed", error?: string) {
  if (!isDbConfigured()) return;
  try {
    await recordInvoiceSendAttempt({
      invoiceNo: data.invoiceNo,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      total: invoiceTotal(data),
      data,
      status,
      error,
    });
  } catch (e) {
    console.error("Failed to record invoice history:", e);
  }
}

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
