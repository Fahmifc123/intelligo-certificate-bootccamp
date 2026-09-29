import { NextResponse } from "next/server";
import { isDbConfigured, listInvoices } from "@/lib/db";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, invoices: [] });
  }
  const invoices = await listInvoices();
  return NextResponse.json({ configured: true, invoices });
}
