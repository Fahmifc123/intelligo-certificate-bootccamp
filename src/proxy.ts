import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";

const PUBLIC_EXACT = new Set(["/login", "/api/login"]);
const PUBLIC_PREFIXES = ["/api/public/verify/"];
const STATIC_PREFIXES = ["/_next/", "/favicon.ico", "/icon.png", "/brand/"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  if (PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // Puppeteer renders /print/* server-to-server to build PDFs. It presents an
  // internal secret instead of the admin session cookie.
  if (pathname.startsWith("/print/")) {
    const key = req.nextUrl.searchParams.get("key");
    const expected = process.env.INTERNAL_RENDER_SECRET;
    if (expected && key && key === expected) {
      const res = NextResponse.next();
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      return res;
    }
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = await verifySessionToken(token);

  if (authenticated) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
