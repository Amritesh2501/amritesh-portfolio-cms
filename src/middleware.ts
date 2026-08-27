import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Edge-safe gate. It only checks that a session cookie is PRESENT so the
// middleware bundle stays free of Prisma and bcrypt. The real check
// (signature + user lookup) happens in the /admin layout and in every server
// action via requireAdmin(). Never rely on this file alone for authorization.
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const hasSessionCookie = SESSION_COOKIES.some((name) =>
    req.cookies.has(name),
  );

  if (pathname === "/admin/login") {
    if (hasSessionCookie) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.next();
  }

  if (!hasSessionCookie) {
    const login = new URL("/admin/login", req.url);
    login.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
