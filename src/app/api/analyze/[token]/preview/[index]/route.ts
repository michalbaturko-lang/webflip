import { NextResponse } from "next/server";
import { getAnalysis } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; index: string }> }
) {
  try {
    const { token, index } = await params;
    const variantIndex = parseInt(index, 10);

    if (!token || isNaN(variantIndex) || variantIndex < 0) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const analysis = await getAnalysis(token);
    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    const htmlVariants = analysis.html_variants || [];
    if (variantIndex >= htmlVariants.length || !htmlVariants[variantIndex]) {
      return NextResponse.json(
        { error: "Variant preview not available" },
        { status: 404 }
      );
    }

    return new Response(htmlVariants[variantIndex], {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "Content-Security-Policy": "frame-ancestors 'self'",
      },
    });
  } catch (err) {
    console.error("GET /api/analyze/[token]/preview/[index] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
