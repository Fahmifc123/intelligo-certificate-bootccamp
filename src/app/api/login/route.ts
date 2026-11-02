import { NextRequest, NextResponse } from "next/server";
import { checkAdminPassword, createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD / SESSION_SECRET belum diset di environment variables." },
      { status: 500 }
    );
  }

  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password || !checkAdminPassword(password)) {
    // Small delay to blunt naive brute-force attempts.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Password salah." }, { status: 401 });
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
