import { NextResponse } from "next/server";
import { getAnalysis, updateAnalysis } from "@/lib/supabase";
import { sendAnalysisEmail } from "@/lib/email";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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

    // Send email report via Resend
    const emailType =
      analysis.status === "error"
        ? "analysis-error" as const
        : analysis.status === "complete"
          ? "analysis-complete" as const
          : "analysis-started" as const;

    await sendAnalysisEmail({
      to: email,
      type: emailType,
      token,
      url: analysis.url,
      scores: analysis.score_performance != null ? {
        performance: analysis.score_performance ?? 0,
        seo: analysis.score_seo ?? 0,
        security: analysis.score_security ?? 0,
        ux: analysis.score_ux ?? 0,
        content: analysis.score_content ?? 0,
        aiVisibility: analysis.score_ai_visibility ?? 0,
      } : undefined,
      variantCount: analysis.variants?.length,
      errorMessage: analysis.error_message ?? undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/analyze/[token]/email error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
