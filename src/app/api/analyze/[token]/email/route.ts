import { NextResponse } from "next/server";
import { getAnalysis, updateAnalysis } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const analysis = await getAnalysis(token);
    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    // Save email to analysis
    await updateAnalysis(token, { email });

    // TODO: Send email report via Resend when RESEND_API_KEY is configured
    // For now, just save the email and unlock results

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/analyze/[token]/email error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
