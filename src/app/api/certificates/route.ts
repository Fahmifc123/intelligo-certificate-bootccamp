import { NextResponse } from "next/server";
import { isDbConfigured, listCertificates } from "@/lib/db";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, certificates: [] });
  }
  const certificates = await listCertificates();
  return NextResponse.json({ configured: true, certificates });
}
