import { NextResponse } from "next/server";
import { isDbConfigured, listReceipts } from "@/lib/db";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, receipts: [] });
  }
  const receipts = await listReceipts();
  return NextResponse.json({ configured: true, receipts });
}
