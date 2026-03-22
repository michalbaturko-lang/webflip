import { createServerClient } from "@/lib/supabase";
import { captureScreenshot, captureAllScreenshots } from "@/lib/screenshot";
import { queueVideoRender, getRenderStatus } from "./video-renderer";
import { getVideoData } from "./video-data";

const supabase = () => createServerClient();

export interface PipelineResult {
  recordId: string;
  step: string;
  status: "ok" | "skipped" | "error";
  details?: Record<string, unknown>;
  error?: string;
}

/**
 * Full outreach preparation pipeline for a single CRM record.
 *
 * Steps:
 *   1. Verify the record has a completed analysis with variants
 *   2. Capture screenshots (original site + 3 redesign previews)
 *   3. Store screenshot URLs in the record metadata
 *   4. Queue video render with real data
 *
 * Call this after the analysis is complete and variants are generated.
 * Idempotent — safe to call multiple times (skips already-done steps).
 */
export async function runOutreachPipeline(
  recordId: string,
  options?: {
    voiceoverUrl?: string;
    forceRefreshScreenshots?: boolean;
    skipVideo?: boolean;
  }
): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];
  const db = supabase();

  // ── Step 1: Load CRM record + check analysis ──

  const { data: record, error: recErr } = await db
    .from("crm_records")
    .select("*")
    .eq("id", recordId)
    .single();

  if (recErr || !record) {
    results.push({
      recordId,
      step: "load_record",
      status: "error",
      error: recErr?.message ?? "Record not found",
    });
    return results;
  }

  const meta = (record.metadata as Record<string, unknown>) ?? {};
  const analysisToken = (meta.analysis_token as string) ?? record.analysis_id;

  // Try to get analysis data
  let analysisData: Record<string, unknown> | null = null;
  if (analysisToken) {
    const { data } = await db
      .from("analyses")
      .select("*")
      .eq("token", analysisToken)
      .single();
    analysisData = data as Record<string, unknown> | null;
  }

  const htmlVariants = (analysisData?.html_variants as string[]) ?? [];
  const variants = (analysisData?.variants as Array<Record<string, unknown>>) ?? [];

  if (!analysisData || analysisData.status !== "complete") {
    results.push({
      recordId,
      step: "check_analysis",
      status: "error",
      error: `Analysis not complete (status: ${analysisData?.status ?? "missing"})`,
    });
    return results;
  }

  results.push({
    recordId,
    step: "check_analysis",
    status: "ok",
    details: {
      token: analysisToken,
      variantsCount: variants.length,
      htmlVariantsCount: htmlVariants.length,
    },
  });

  // ── Step 2: Capture screenshots ──

  const domain = record.domain;
  const screenshotUrls: Record<string, string> = {};

  try {
    // Original website screenshot
    const original = await captureScreenshot(`https://${domain}`, {
      domain,
      variant: "original",
      forceRefresh: options?.forceRefreshScreenshots,
    });
    screenshotUrls.original = original.url;

    // Redesign variant screenshots (from the preview URLs)
    const variantNames = ["modern", "professional", "conversion"];
    for (let i = 0; i < Math.min(htmlVariants.length, 3); i++) {
      const variantName = (variants[i]?.style as string) ?? variantNames[i] ?? `variant-${i}`;
      const previewUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://webflip.cz"}/api/analyze/${analysisToken}/preview/${i}`;

      const screenshot = await captureScreenshot(previewUrl, {
        domain,
        variant: variantName,
        forceRefresh: options?.forceRefreshScreenshots,
      });
      screenshotUrls[variantName] = screenshot.url;
    }

    results.push({
      recordId,
      step: "capture_screenshots",
      status: "ok",
      details: { screenshotCount: Object.keys(screenshotUrls).length, urls: screenshotUrls },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({
      recordId,
      step: "capture_screenshots",
      status: "error",
      error: msg,
    });
    // Continue even if screenshots fail — video can use placeholders
  }

  // ── Step 3: Store screenshot URLs in record metadata ──

  try {
    const updatedMeta = {
      ...meta,
      originalScreenshotUrl: screenshotUrls.original ?? meta.originalScreenshotUrl,
      screenshots: screenshotUrls,
      variants: variants.map((v, i) => {
        const variantName = (v.style as string) ?? ["modern", "professional", "conversion"][i];
        return {
          name: (v.name as string) ?? variantName,
          screenshotUrl: screenshotUrls[variantName] ?? (v as Record<string, unknown>).screenshotUrl,
          features: (v.keyFeatures as string[]) ?? [],
        };
      }),
    };

    await db
      .from("crm_records")
      .update({ metadata: updatedMeta })
      .eq("id", recordId);

    results.push({
      recordId,
      step: "store_metadata",
      status: "ok",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({
      recordId,
      step: "store_metadata",
      status: "error",
      error: msg,
    });
  }

  // ── Step 4: Queue video render ──

  if (options?.skipVideo) {
    results.push({
      recordId,
      step: "queue_video",
      status: "skipped",
    });
  } else {
    // Check if already rendered
    const existingRender = await getRenderStatus(recordId);
    if (existingRender?.status === "done" && existingRender.videoUrl) {
      results.push({
        recordId,
        step: "queue_video",
        status: "skipped",
        details: { reason: "already_rendered", videoUrl: existingRender.videoUrl },
      });
    } else {
      try {
        const renderJob = await queueVideoRender(recordId, {
          voiceoverUrl: options?.voiceoverUrl,
          priority: 5,
        });

        results.push({
          recordId,
          step: "queue_video",
          status: renderJob.status === "error" ? "error" : "ok",
          error: renderJob.error,
          details: { renderStatus: renderJob.status },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({
          recordId,
          step: "queue_video",
          status: "error",
          error: msg,
        });
      }
    }
  }

  // ── Step 5: Update CRM stage ──

  try {
    const currentStage = record.stage;
    // If still at prospect/contacted, move to "engaged" since we prepared outreach material
    if (currentStage === "prospect" || currentStage === "contacted") {
      await db
        .from("crm_records")
        .update({ stage: "contacted", updated_at: new Date().toISOString() })
        .eq("id", recordId);
    }

    // Log activity
    await db.from("crm_activities").insert({
      crm_record_id: recordId,
      type: "note_added",
      metadata: {
        action: "outreach_pipeline_complete",
        screenshots: Object.keys(screenshotUrls).length,
        video_queued: !options?.skipVideo,
      },
    });
  } catch {
    // Non-critical — don't fail the pipeline
  }

  return results;
}

/**
 * Run the outreach pipeline for multiple records.
 * Processes sequentially to avoid overwhelming screenshot APIs.
 */
export async function runOutreachPipelineBatch(
  recordIds: string[],
  options?: {
    voiceoverUrl?: string;
    forceRefreshScreenshots?: boolean;
    skipVideo?: boolean;
  }
): Promise<Map<string, PipelineResult[]>> {
  const allResults = new Map<string, PipelineResult[]>();

  for (const id of recordIds) {
    const results = await runOutreachPipeline(id, options);
    allResults.set(id, results);
  }

  return allResults;
}

/**
 * Run pipeline for all records enrolled in a sequence at a specific step.
 * Useful for pre-processing before a scheduled outreach send.
 */
export async function prepareSequenceStep(
  sequenceId: string,
  targetStep: number,
  options?: {
    voiceoverUrl?: string;
  }
): Promise<{
  total: number;
  prepared: number;
  errors: number;
  results: Map<string, PipelineResult[]>;
}> {
  const db = supabase();

  // Find records at the step before the target (they'll advance to target step)
  const { data: records } = await db
    .from("crm_records")
    .select("id")
    .eq("outreach_sequence_id", sequenceId)
    .eq("outreach_sequence_step", targetStep - 1);

  if (!records?.length) {
    return { total: 0, prepared: 0, errors: 0, results: new Map() };
  }

  const recordIds = records.map((r) => r.id);
  const results = await runOutreachPipelineBatch(recordIds, options);

  let prepared = 0;
  let errors = 0;
  for (const [, steps] of results) {
    const hasError = steps.some((s) => s.status === "error");
    if (hasError) errors++;
    else prepared++;
  }

  return { total: recordIds.length, prepared, errors, results };
}
