import { NextResponse, type NextRequest } from "next/server";
import { getAnalysis } from "@/lib/supabase";

/**
 * GET /api/analyze/[token]/preview?variant=0
 *
 * Serves a pre-generated standalone HTML preview for a specific design variant.
 * The HTML is generated during the main pipeline and stored in Supabase,
 * so this route simply retrieves and serves it — no timeout issues.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const variantIndex = parseInt(
    request.nextUrl.searchParams.get("variant") ?? "0",
    10
  );

  const analysis = await getAnalysis(token);

  if (!analysis) {
    return NextResponse.json(
      { error: "Analysis not found" },
      { status: 404 }
    );
  }

  if (analysis.status !== "complete") {
    return NextResponse.json(
      { error: "Analysis not yet complete", status: analysis.status },
      { status: 202 }
    );
  }

  const htmlVariants = analysis.html_variants || [];

  if (variantIndex < 0 || variantIndex >= htmlVariants.length) {
    return NextResponse.json(
      {
        error: "Variant not found",
        available: htmlVariants.length,
      },
      { status: 404 }
    );
  }

  const html = htmlVariants[variantIndex];

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
