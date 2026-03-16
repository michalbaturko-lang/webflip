import { NextRequest, NextResponse } from "next/server";
import { validateAdminToken, setAdminCookie } from "@/lib/admin/auth";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token || !validateAdminToken(token)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    return setAdminCookie(response, token);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
