import { NextRequest, NextResponse } from "next/server";
import { getPipelineData } from "@/lib/admin/queries";
import {
  runOutreachPipeline,
  runOutreachPipelineBatch,
  prepareSequenceStep,
} from "@/lib/outreach/pipeline";

export async function GET() {
  try {
    const pipeline = await getPipelineData();
    return NextResponse.json(pipeline);
  } catch (err) {
    console.error("GET /api/admin/pipeline error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/pipeline
 *
 * Run the full outreach preparation pipeline:
 *   analysis complete → screenshots → video render → ready for email
 *
 * Modes:
 *   1. Single:   { recordId: "uuid" }
 *   2. Batch:    { recordIds: ["uuid1", "uuid2"] }
 *   3. Sequence: { sequenceId: "uuid", stepNumber: 2 }
 *
 * Options:
 *   - voiceoverUrl?: string
 *   - forceRefreshScreenshots?: boolean
 *   - skipVideo?: boolean
 */
export async function POST(req: NextRequest) {
  const body = await req.json();

  const options = {
    voiceoverUrl: body.voiceoverUrl as string | undefined,
    forceRefreshScreenshots: body.forceRefreshScreenshots as boolean | undefined,
    skipVideo: body.skipVideo as boolean | undefined,
  };

  // Mode 3: Sequence step preparation
  if (body.sequenceId && body.stepNumber) {
    const result = await prepareSequenceStep(
      body.sequenceId,
      body.stepNumber,
      { voiceoverUrl: options.voiceoverUrl }
    );

    const resultsObj: Record<string, unknown> = {};
    for (const [id, steps] of result.results) {
      resultsObj[id] = steps;
    }

    return NextResponse.json({
      mode: "sequence",
      total: result.total,
      prepared: result.prepared,
      errors: result.errors,
      results: resultsObj,
    });
  }

  // Mode 1: Single record
  if (body.recordId && !body.recordIds) {
    const results = await runOutreachPipeline(body.recordId, options);
    const hasErrors = results.some((r) => r.status === "error");

    return NextResponse.json({
      mode: "single",
      recordId: body.recordId,
      success: !hasErrors,
      steps: results,
    });
  }

  // Mode 2: Batch
  const recordIds: string[] = body.recordIds ?? [];
  if (!recordIds.length) {
    return NextResponse.json(
      { error: "Provide recordId, recordIds, or sequenceId+stepNumber" },
      { status: 400 }
    );
  }

  if (recordIds.length > 50) {
    return NextResponse.json(
      { error: "Maximum 50 records per batch" },
      { status: 400 }
    );
  }

  const batchResults = await runOutreachPipelineBatch(recordIds, options);

  const resultsObj: Record<string, unknown> = {};
  let successCount = 0;
  let errorCount = 0;

  for (const [id, steps] of batchResults) {
    resultsObj[id] = steps;
    if (steps.some((r) => r.status === "error")) errorCount++;
    else successCount++;
  }

  return NextResponse.json({
    mode: "batch",
    total: recordIds.length,
    success: successCount,
    errors: errorCount,
    results: resultsObj,
  });
}
