import { getVideoData, type VideoRenderData } from "./video-data";
import { createServerClient } from "@/lib/supabase";

const supabase = () => createServerClient();

export interface RenderJob {
  recordId: string;
  status: "queued" | "rendering" | "done" | "error";
  videoUrl?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

/**
 * Queue a video render for a CRM record.
 *
 * This stores the render request in the database so it can be
 * picked up by a render worker (Remotion Lambda, local CLI, or
 * a dedicated render server).
 *
 * Flow:
 *   1. Fetch video data from CRM
 *   2. Store render job in `outreach_video_renders` table
 *   3. (Worker picks it up) → renders via Remotion → uploads to S3/Supabase Storage
 *   4. Worker updates job status to "done" with videoUrl
 *   5. Outreach sequence can now include the video link
 */
export async function queueVideoRender(
  recordId: string,
  options?: {
    voiceoverUrl?: string;
    priority?: number;
  }
): Promise<RenderJob> {
  const data = await getVideoData(recordId);
  if (!data) {
    return {
      recordId,
      status: "error",
      error: "Could not fetch video data for this record",
    };
  }

  const videoProps: VideoRenderData & { voiceoverUrl?: string } = {
    ...data,
    ...(options?.voiceoverUrl ? { voiceoverUrl: options.voiceoverUrl } : {}),
  };

  const db = supabase();

  // Upsert render job
  const { data: job, error } = await db
    .from("outreach_video_renders")
    .upsert(
      {
        crm_record_id: recordId,
        status: "queued",
        input_props: videoProps,
        priority: options?.priority ?? 0,
        queued_at: new Date().toISOString(),
      },
      { onConflict: "crm_record_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("Failed to queue video render:", error);
    return {
      recordId,
      status: "error",
      error: `Database error: ${error.message}`,
    };
  }

  // Log activity in CRM
  await db.from("crm_activities").insert({
    crm_record_id: recordId,
    type: "note_added",
    metadata: {
      action: "video_render_queued",
      render_id: job?.id,
    },
  });

  return {
    recordId,
    status: "queued",
    startedAt: new Date().toISOString(),
  };
}

/**
 * Queue video renders for multiple records.
 */
export async function queueVideoRenderBatch(
  recordIds: string[],
  options?: {
    voiceoverUrl?: string;
  }
): Promise<RenderJob[]> {
  const results: RenderJob[] = [];

  // Process sequentially to avoid overwhelming the DB
  for (const id of recordIds) {
    const result = await queueVideoRender(id, options);
    results.push(result);
  }

  return results;
}

/**
 * Get the render status for a record.
 */
export async function getRenderStatus(
  recordId: string
): Promise<RenderJob | null> {
  const db = supabase();

  const { data, error } = await db
    .from("outreach_video_renders")
    .select("*")
    .eq("crm_record_id", recordId)
    .single();

  if (error || !data) return null;

  return {
    recordId,
    status: data.status,
    videoUrl: data.video_url ?? undefined,
    error: data.error_message ?? undefined,
    startedAt: data.queued_at,
    completedAt: data.completed_at ?? undefined,
  };
}

/**
 * SQL migration for the render jobs table.
 * Run this once in Supabase SQL editor.
 */
export const MIGRATION_SQL = `
-- Video render queue
CREATE TABLE IF NOT EXISTS outreach_video_renders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crm_record_id UUID NOT NULL REFERENCES crm_records(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'rendering', 'done', 'error')),
  input_props JSONB NOT NULL DEFAULT '{}',
  video_url TEXT,
  error_message TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(crm_record_id)
);

-- Index for worker to pick up next job
CREATE INDEX IF NOT EXISTS idx_video_renders_queue
  ON outreach_video_renders (status, priority DESC, queued_at ASC)
  WHERE status = 'queued';

-- RLS
ALTER TABLE outreach_video_renders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON outreach_video_renders
  FOR ALL USING (true) WITH CHECK (true);
`;
