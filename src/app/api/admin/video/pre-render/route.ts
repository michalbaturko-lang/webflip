import { NextRequest, NextResponse } from "next/server";
import { preRenderForSequenceStep } from "@/lib/outreach/video-integration";

/**
 * POST /api/admin/video/pre-render
 * Body: { sequenceId: string, stepNumber: number, voiceoverUrl?: string }
 *
 * Queue video renders for all records in a sequence step.
 * Call this before executing the step to ensure videos are ready.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sequenceId, stepNumber, voiceoverUrl } = body;

  if (!sequenceId || !stepNumber) {
    return NextResponse.json(
      { error: "sequenceId and stepNumber required" },
      { status: 400 }
    );
  }

  const result = await preRenderForSequenceStep(
    sequenceId,
    stepNumber,
    voiceoverUrl
  );

  return NextResponse.json({
    ...result,
    readyCount: result.ready.length,
    pendingCount: result.pending.length,
    allReady: result.pending.length === 0,
  });
}
