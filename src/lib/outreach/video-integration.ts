import { createServerClient } from "@/lib/supabase";
import { queueVideoRender, getRenderStatus } from "./video-renderer";
import { captureScreenshot } from "@/lib/screenshot";

const supabase = () => createServerClient();

/**
 * Email template variables related to video.
 * These can be used in outreach email templates via {{variable}} syntax.
 */
export interface VideoTemplateVars {
  /** Direct link to the rendered MP4 */
  video_url: string;
  /** Thumbnail/poster image for the video */
  video_thumbnail_url: string;
  /** HTML snippet: clickable video thumbnail that opens the video */
  video_embed_html: string;
  /** Landing page with embedded video player */
  video_landing_url: string;
}

/**
 * Get video template variables for a CRM record.
 * Returns null if no video has been rendered yet.
 */
export async function getVideoTemplateVars(
  recordId: string
): Promise<VideoTemplateVars | null> {
  const status = await getRenderStatus(recordId);

  if (!status || status.status !== "done" || !status.videoUrl) {
    return null;
  }

  const db = supabase();
  const { data: record } = await db
    .from("crm_records")
    .select("domain")
    .eq("id", recordId)
    .single();

  const domain = record?.domain ?? "unknown";

  // Get or generate thumbnail
  const thumbnailResult = await captureScreenshot(
    `https://webflipper.app/video/${recordId}`,
    {
      domain,
      variant: "video-thumb",
      width: 600,
      height: 338, // 16:9
    }
  ).catch(() => null);

  const thumbnailUrl =
    thumbnailResult?.url ??
    `https://webflipper.app/api/video-thumbnail/${recordId}`;

  const videoLandingUrl = `https://webflipper.app/preview/${domain}?ref=video&rid=${recordId}&play=1`;

  return {
    video_url: status.videoUrl,
    video_thumbnail_url: thumbnailUrl,
    video_embed_html: buildVideoEmbedHtml(
      status.videoUrl,
      thumbnailUrl,
      videoLandingUrl,
      domain
    ),
    video_landing_url: videoLandingUrl,
  };
}

/**
 * Build an HTML snippet for embedding in emails.
 * Since most email clients can't play video inline, we use a
 * clickable thumbnail that links to the landing page.
 */
function buildVideoEmbedHtml(
  videoUrl: string,
  thumbnailUrl: string,
  landingUrl: string,
  domain: string
): string {
  return `
<div style="margin: 16px 0; text-align: center;">
  <a href="${landingUrl}" target="_blank" style="display: inline-block; position: relative; text-decoration: none;">
    <img
      src="${thumbnailUrl}"
      alt="Video analýza webu ${domain}"
      width="560"
      height="315"
      style="border-radius: 12px; border: 2px solid #e5e7eb; display: block;"
    />
    <div style="
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 64px;
      height: 64px;
      background: rgba(0,0,0,0.7);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 0;
        height: 0;
        border-left: 24px solid white;
        border-top: 14px solid transparent;
        border-bottom: 14px solid transparent;
        margin-left: 4px;
      "></div>
    </div>
  </a>
  <p style="margin: 8px 0 0; font-size: 13px; color: #6b7280;">
    ▶ Klikněte pro přehrání video analýzy
  </p>
</div>`.trim();
}

/**
 * Ensure a video is ready for a CRM record before sending outreach.
 *
 * Call this from the outreach execution pipeline.
 * Returns true if video is ready (or not needed), false if still rendering.
 */
export async function ensureVideoReady(
  recordId: string,
  options?: { voiceoverUrl?: string }
): Promise<{ ready: boolean; videoUrl?: string }> {
  // Check if already rendered
  const existing = await getRenderStatus(recordId);

  if (existing?.status === "done" && existing.videoUrl) {
    return { ready: true, videoUrl: existing.videoUrl };
  }

  if (existing?.status === "rendering") {
    return { ready: false };
  }

  // Queue a render if not already queued
  if (!existing || existing.status === "error") {
    // Load record to get domain for screenshot batch capture
    const db = supabase();
    const { data: record } = await db
      .from("crm_records")
      .select("domain")
      .eq("id", recordId)
      .single();

    if (record?.domain) {
      // Ensure screenshots are captured before video rendering
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://webflip.cz";
        await fetch(`${baseUrl}/api/admin/screenshot/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recordId,
            domain: record.domain,
            forceRefresh: false,
          }),
        }).catch(() => {
          // Non-critical — screenshots can be captured on-demand by video renderer
        });
      } catch {
        // Non-critical — continue with video render even if screenshot batch fails
      }
    }

    await queueVideoRender(recordId, {
      voiceoverUrl: options?.voiceoverUrl,
      priority: 10, // Higher priority for immediate outreach
    });
  }

  return { ready: false };
}

/**
 * Process email template — replace {{video_*}} placeholders with real data.
 */
export function processVideoPlaceholders(
  template: string,
  vars: VideoTemplateVars | null
): string {
  if (!vars) {
    // Remove video placeholders if no video available
    return template
      .replace(/\{\{video_embed_html\}\}/g, "")
      .replace(/\{\{video_url\}\}/g, "")
      .replace(/\{\{video_thumbnail_url\}\}/g, "")
      .replace(/\{\{video_landing_url\}\}/g, "");
  }

  return template
    .replace(/\{\{video_embed_html\}\}/g, vars.video_embed_html)
    .replace(/\{\{video_url\}\}/g, vars.video_url)
    .replace(/\{\{video_thumbnail_url\}\}/g, vars.video_thumbnail_url)
    .replace(/\{\{video_landing_url\}\}/g, vars.video_landing_url);
}

/**
 * Pre-render videos for all records in a sequence step BEFORE execution.
 *
 * Call this e.g. 1 hour before scheduled outreach to ensure all videos
 * are ready when emails go out.
 *
 * Returns record IDs that are NOT yet ready (still rendering).
 */
export async function preRenderForSequenceStep(
  sequenceId: string,
  stepNumber: number,
  voiceoverUrl?: string
): Promise<{ ready: string[]; pending: string[] }> {
  const db = supabase();

  const { data: records } = await db
    .from("crm_records")
    .select("id")
    .eq("outreach_sequence_id", sequenceId)
    .eq("outreach_sequence_step", stepNumber - 1); // Current step is one before the target

  if (!records?.length) {
    return { ready: [], pending: [] };
  }

  const ready: string[] = [];
  const pending: string[] = [];

  for (const record of records) {
    const result = await ensureVideoReady(record.id, { voiceoverUrl });
    if (result.ready) {
      ready.push(record.id);
    } else {
      pending.push(record.id);
    }
  }

  return { ready, pending };
}
