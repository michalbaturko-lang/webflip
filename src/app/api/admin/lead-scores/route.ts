import { NextRequest, NextResponse } from "next/server";
import { calculateAllLeadScores, getTopLeadsByScore } from "@/lib/outreach/lead-scoring";

/**
 * GET /api/admin/lead-scores
 *
 * Returns scored leads sorted by total_score DESC.
 *
 * Query params:
 * - limit: number (default 50)
 * - min_score: number (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
    const minScore = Number(url.searchParams.get("min_score")) || 0;

    const leads = await getTopLeadsByScore(limit);

    // Filter by minimum score if provided
    const filtered = leads.filter((lead) => lead.lead_score.total_score >= minScore);

    return NextResponse.json({
      leads: filtered.map((lead) => ({
        id: lead.id,
        domain: lead.domain,
        company_name: lead.company_name,
        contact_email: lead.contact_email,
        stage: lead.stage,
        suitability_score: lead.suitability_score,
        lead_score: lead.lead_score,
      })),
      count: filtered.length,
    });
  } catch (err) {
    console.error("GET /api/admin/lead-scores error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/lead-scores
 *
 * Trigger recalculation of all lead scores.
 */
export async function POST(request: NextRequest) {
  try {
    const result = await calculateAllLeadScores();

    return NextResponse.json({
      message: "Lead scores recalculated",
      updated: result.updated,
      scores: result.scores,
    });
  } catch (err) {
    console.error("POST /api/admin/lead-scores error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
