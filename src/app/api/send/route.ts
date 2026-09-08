import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { encodeParticipant } from "@/lib/encode";
import { buildEmailHtml, buildEmailSubject } from "@/lib/email-template";
import { isDbConfigured, recordSendAttempt } from "@/lib/db";
import { renderPdf } from "@/lib/pdf";
import { getOrigin } from "@/lib/request-origin";
import type { ParticipantData } from "@/lib/types";

export const maxDuration = 60;

async function saveAttempt(data: ParticipantData, status: "sent" | "failed", error?: string) {
  if (!isDbConfigured()) return;
  try {
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
      status,
      error,
    });
  } catch (e) {
    console.error("Failed to record certificate history:", e);
  }
}

export async function POST(req: NextRequest) {
  const data = (await req.json()) as ParticipantData;

  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM;
  if (!apiKey || !fromAddress) {
    const message = "RESEND_API_KEY / EMAIL_FROM belum diset di environment variables.";
    await saveAttempt(data, "failed", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  try {
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
