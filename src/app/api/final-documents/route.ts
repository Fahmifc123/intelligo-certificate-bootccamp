import { NextResponse } from "next/server";
import { isDbConfigured, listFinalDocuments, getCertificateById } from "@/lib/db";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL belum diset." }, { status: 500 });
  }
  const rows = await listFinalDocuments();
  const withStatus = await Promise.all(
    rows.map(async (r) => {
      const cert = r.certificate_id ? await getCertificateById(r.certificate_id) : null;
      return {
        ...r,
        certificate_sent_status: cert?.sent_status ?? null,
        certificate_status: cert?.status ?? null,
      };
    })
  );
  return NextResponse.json({ rows: withStatus });
}
