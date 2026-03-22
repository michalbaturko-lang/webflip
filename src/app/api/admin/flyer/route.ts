import { NextRequest, NextResponse } from "next/server";
import { getFlyerData, generateFlyerHtml, generateFlyerBatch } from "@/lib/outreach/flyer-generator";

/**
 * GET /api/admin/flyer?id=<record_id>
 * Returns HTML flyer for a single CRM record
 *
 * Query params:
 * - id: CRM record UUID (required)
 * - format: "html" (default) or "json" (returns data object)
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const recordId = url.searchParams.get("id");
    const format = url.searchParams.get("format") || "html";

    if (!recordId) {
      return NextResponse.json({ error: "Missing 'id' parameter" }, { status: 400 });
    }

    const data = await getFlyerData(recordId);
    if (!data) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    if (format === "json") {
      return NextResponse.json(data);
    }

    const html = generateFlyerHtml(data);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("GET /api/admin/flyer error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/flyer
 * Generate flyers for multiple records (batch)
 *
 * Body: { ids: string[] }
 * Returns: { results: { id, html, error? }[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids: string[] = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Body must include 'ids' array" }, { status: 400 });
    }

    if (ids.length > 50) {
      return NextResponse.json({ error: "Maximum 50 records per batch" }, { status: 400 });
    }

    const results = await generateFlyerBatch(ids);
    return NextResponse.json({
      total: results.length,
      success: results.filter((r) => !r.error).length,
      errors: results.filter((r) => r.error).length,
      results,
    });
  } catch (err) {
    console.error("POST /api/admin/flyer error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
