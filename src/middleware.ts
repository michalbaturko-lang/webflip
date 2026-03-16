import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /api/admin/* routes with Bearer token
  if (pathname.startsWith("/api/admin")) {
    const authHeader = request.headers.get("authorization");
    const cookieToken = request.cookies.get("admin_token")?.value;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : cookieToken;
    const adminKey = process.env.ADMIN_API_KEY;

    if (!adminKey || !token || token !== adminKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Skip i18n middleware for all other API routes
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Protect /[locale]/admin/* pages (redirect to login if no cookie)
  const adminPageMatch = pathname.match(/^\/([a-z]{2})\/admin(\/.*)?$/);
  if (adminPageMatch) {
    const locale = adminPageMatch[1];
    const subpath = adminPageMatch[2] || "";

    // Allow login page through
    if (subpath === "/login") {
      return intlMiddleware(request);
    }

    const cookieToken = request.cookies.get("admin_token")?.value;
    const adminKey = process.env.ADMIN_API_KEY;

    if (!adminKey || !cookieToken || cookieToken !== adminKey) {
      const loginUrl = new URL(`/${locale}/admin/login`, request.url);
      return NextResponse.redirect(loginUrl);
    }

    return intlMiddleware(request);
  }

  // Default: i18n middleware
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
