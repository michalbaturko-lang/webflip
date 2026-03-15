import { NextResponse } from "next/server";
import { getAnalysis, updateAnalysis } from "@/lib/supabase";

/**
 * POST /api/analyze/[token]/select
 *
 * Persists which variant the user selected.
 * Stores selected_variant index in the analysis JSONB metadata.
 *
 * Body: { variantIndex: number }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { variantIndex } = body;

    if (typeof variantIndex !== "number" || variantIndex < 0) {
      return NextResponse.json(
        { error: "Invalid variantIndex" },
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

    if (analysis.status !== "complete") {
      return NextResponse.json(
        { error: "Analysis not yet complete" },
        { status: 202 }
      );
    }

    const variantsCount = (analysis.variants || []).length;
    if (variantIndex >= variantsCount) {
      return NextResponse.json(
        { error: `Invalid variantIndex: ${variantIndex}, available: ${variantsCount}` },
        { status: 400 }
      );
    }

    // Store in the analysis record using the existing JSONB flexibility
    // We use a type assertion since selected_variant is a new field
    await updateAnalysis(token, {
      selected_variant: variantIndex,
    } as Record<string, unknown>);

    return NextResponse.json({
      success: true,
      selectedVariant: variantIndex,
    });
  } catch (err) {
    console.error("POST /api/analyze/[token]/select error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
