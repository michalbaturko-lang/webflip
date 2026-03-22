import { NextRequest, NextResponse } from "next/server";
import {
  queueVideoRender,
  queueVideoRenderBatch,
  getRenderStatus,
} from "@/lib/outreach/video-renderer";

/**
 * GET /api/admin/video/render?id=<record_id>
 *
 * Check render status for a record.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Missing ?id= query parameter" },
      { status: 400 }
    );
  }

  const status = await getRenderStatus(id);
  if (!status) {
    return NextResponse.json(
      { error: "No render job found for this record" },
      { status: 404 }
    );
  }

  return NextResponse.json(status);
}

/**
 * POST /api/admin/video/render
 * Body: { recordId: string } | { recordIds: string[], voiceoverUrl?: string }
 *
 * Queue video render(s) for CRM record(s).
 */
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Single record
  if (body.recordId && !body.recordIds) {
    const result = await queueVideoRender(body.recordId, {
      voiceoverUrl: body.voiceoverUrl,
    });
    return NextResponse.json(result);
  }

  // Batch
  const recordIds: string[] = body.recordIds ?? [];
  if (!recordIds.length) {
    return NextResponse.json(
      { error: "Provide recordId or recordIds" },
      { status: 400 }
    );
  }

  if (recordIds.length > 50) {
    return NextResponse.json(
      { error: "Maximum 50 per batch" },
      { status: 400 }
    );
  }

  const results = await queueVideoRenderBatch(recordIds, {
    voiceoverUrl: body.voiceoverUrl,
  });

  return NextResponse.json({
    total: recordIds.length,
    queued: results.filter((r) => r.status === "queued").length,
    errors: results.filter((r) => r.status === "error").length,
    results,
  });
}
