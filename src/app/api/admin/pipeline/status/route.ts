import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

/**
 * GET /api/admin/pipeline/status
 *
 * Returns outreach pipeline status: screenshot & video stats per record,
 * render queue overview, and recent activity.
 */
export async function GET() {
  try {
    const db = createServerClient();

    // 1. Records with analysis + their pipeline readiness
    const { data: records, error: recErr } = await db
      .from("crm_records")
      .select(
        "id, domain, company_name, stage, suitability_score, analysis_id, metadata, video_url, video_rendered_at, updated_at"
      )
      .not("analysis_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (recErr) throw recErr;

    // 2. Render queue stats
    const { data: renders, error: renderErr } = await db
      .from("outreach_video_renders")
      .select("id, crm_record_id, status, video_url, error_message, priority, queued_at, started_at, completed_at, duration_ms, file_size_bytes");

    if (renderErr) throw renderErr;

    // 3. Screenshot stats
    const { data: screenshots, error: ssErr } = await db
      .from("website_screenshots")
      .select("id, domain, variant, url:screenshot_url, created_at");

    if (ssErr) throw ssErr;

    // Build per-record status
    const renderByRecord = new Map<string, typeof renders[number]>();
    for (const r of renders ?? []) {
      renderByRecord.set(r.crm_record_id, r);
    }

    const screenshotsByDomain = new Map<string, typeof screenshots>();
    for (const s of screenshots ?? []) {
      const list = screenshotsByDomain.get(s.domain) ?? [];
      list.push(s);
      screenshotsByDomain.set(s.domain, list);
    }

    const pipelineRecords = (records ?? []).map((rec) => {
      const meta = (rec.metadata as Record<string, unknown>) ?? {};
      const render = renderByRecord.get(rec.id);
      const domainScreenshots = screenshotsByDomain.get(rec.domain) ?? [];

      return {
        id: rec.id,
        domain: rec.domain,
        companyName: rec.company_name,
        stage: rec.stage,
        suitabilityScore: rec.suitability_score,
        analysisId: rec.analysis_id,
        hasAnalysis: !!rec.analysis_id,
        screenshotCount: domainScreenshots.length,
        hasOriginalScreenshot: domainScreenshots.some((s) => s.variant === "original"),
        hasVariantScreenshots: domainScreenshots.filter((s) => s.variant !== "original").length,
        screenshots: domainScreenshots.map((s) => ({
          variant: s.variant,
          url: s.url,
          createdAt: s.created_at,
        })),
        videoStatus: render?.status ?? null,
        videoUrl: rec.video_url ?? render?.video_url ?? null,
        videoError: render?.error_message ?? null,
        videoRenderedAt: rec.video_rendered_at ?? render?.completed_at ?? null,
        videoDurationMs: render?.duration_ms ?? null,
        videoSizeBytes: render?.file_size_bytes ?? null,
        pipelineReady:
          !!rec.analysis_id &&
          domainScreenshots.length >= 2 &&
          (render?.status === "done" || !!rec.video_url),
        updatedAt: rec.updated_at,
      };
    });

    // Aggregate stats
    const allRenders = renders ?? [];
    const stats = {
      totalWithAnalysis: pipelineRecords.length,
      screenshotsComplete: pipelineRecords.filter((r) => r.screenshotCount >= 2).length,
      videosRendered: allRenders.filter((r) => r.status === "done").length,
      videosQueued: allRenders.filter((r) => r.status === "queued").length,
      videosRendering: allRenders.filter((r) => r.status === "rendering").length,
      videosError: allRenders.filter((r) => r.status === "error").length,
      pipelineReady: pipelineRecords.filter((r) => r.pipelineReady).length,
      totalScreenshots: (screenshots ?? []).length,
    };

    // Recent render jobs (for queue view)
    const recentRenders = allRenders
      .sort((a, b) => new Date(b.queued_at).getTime() - new Date(a.queued_at).getTime())
      .slice(0, 20)
      .map((r) => {
        const rec = (records ?? []).find((rec) => rec.id === r.crm_record_id);
        return {
          id: r.id,
          recordId: r.crm_record_id,
          domain: rec?.domain ?? "unknown",
          companyName: rec?.company_name,
          status: r.status,
          videoUrl: r.video_url,
          error: r.error_message,
          priority: r.priority,
          queuedAt: r.queued_at,
          startedAt: r.started_at,
          completedAt: r.completed_at,
          durationMs: r.duration_ms,
          fileSizeBytes: r.file_size_bytes,
        };
      });

    return NextResponse.json({
      stats,
      records: pipelineRecords,
      renderQueue: recentRenders,
    });
  } catch (err) {
    console.error("GET /api/admin/pipeline/status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
