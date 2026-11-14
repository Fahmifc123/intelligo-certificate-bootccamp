import { NextRequest, NextResponse } from "next/server";
import { isDbConfigured, upsertFinalDocumentRows, listFinalDocuments } from "@/lib/db";
import { fetchSheetRows } from "@/lib/sheet-sync";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { ok } = rateLimit(`final-docs-sync:${clientIp(req)}`, 10, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "Terlalu banyak permintaan, coba lagi sebentar." }, { status: 429 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL belum diset." }, { status: 500 });
  }

  try {
    const before = await listFinalDocuments();
    const beforeKeys = new Set(before.map((r) => r.row_key));

    const sheetRows = await fetchSheetRows();
    await upsertFinalDocumentRows(sheetRows);

    const newCount = sheetRows.filter((r) => !beforeKeys.has(r.rowKey)).length;
    return NextResponse.json({ ok: true, total: sheetRows.length, new: newCount });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
