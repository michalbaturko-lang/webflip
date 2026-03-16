import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "admin_token";

export function getAdminApiKey(): string {
  const key = process.env.ADMIN_API_KEY;
  if (!key) throw new Error("ADMIN_API_KEY env var is not set");
  return key;
}

export function validateAdminToken(token: string): boolean {
  try {
    return token === getAdminApiKey();
  } catch {
    return false;
  }
}

/** Extract admin token from request (Bearer header or cookie) */
export function extractAdminToken(request: NextRequest): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  // Check cookie
  return request.cookies.get(ADMIN_COOKIE)?.value ?? null;
}

/** Middleware-style auth check for API routes */
export function requireAdmin(request: NextRequest): NextResponse | null {
  const token = extractAdminToken(request);
  if (!token || !validateAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null; // Authorized
}

/** Set admin cookie on response */
export function setAdminCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return response;
}

export { ADMIN_COOKIE };
