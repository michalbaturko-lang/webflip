/**
 * Render Worker — polls the outreach_video_renders queue and renders videos.
 *
 * Usage:
 *   npx tsx scripts/render-worker.ts          # Process one batch then exit
 *   npx tsx scripts/render-worker.ts --watch   # Continuous polling
 *
 * Environment:
 *   SUPABASE_URL        — Supabase project URL
 *   SUPABASE_SERVICE_KEY — Service role key (bypasses RLS)
 *   REMOTION_CONCURRENCY — Render concurrency (default: 50%)
 *   RENDER_OUTPUT_DIR    — Output directory (default: ./out)
 *   STORAGE_BUCKET       — Supabase storage bucket (default: webflip-assets)
 *
 * The worker:
 *   1. Picks up the next 'queued' job (ordered by priority DESC, queued_at ASC)
 *   2. Updates status to 'rendering'
 *   3. Runs `npx remotion render` with inputProps from the job
 *   4. Uploads the .mp4 to Supabase Storage
 *   5. Updates job status to 'done' with the video URL
 *   6. Updates crm_records.video_url for quick access
 */

import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
const CONCURRENCY = process.env.REMOTION_CONCURRENCY ?? "50%";
const OUTPUT_DIR = process.env.RENDER_OUTPUT_DIR ?? path.join(__dirname, "..", "out");
const BUCKET = process.env.STORAGE_BUCKET ?? "webflip-assets";
const WATCH_MODE = process.argv.includes("--watch");
const POLL_INTERVAL = 10_000; // 10 seconds

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ SUPABASE_URL and SUPABASE_SERVICE_KEY are required");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

interface RenderJob {
  id: string;
  crm_record_id: string;
  input_props: Record<string, unknown>;
  priority: number;
}

async function claimNextJob(): Promise<RenderJob | null> {
  // Atomically claim the next queued job
  const { data, error } = await db
    .from("outreach_video_renders")
    .select("id, crm_record_id, input_props, priority")
    .eq("status", "queued")
    .order("priority", { ascending: false })
    .order("queued_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) return null;

  // Mark as rendering
  const { error: updateError } = await db
    .from("outreach_video_renders")
    .update({
      status: "rendering",
      started_at: new Date().toISOString(),
    })
    .eq("id", data.id)
    .eq("status", "queued"); // Optimistic lock

  if (updateError) {
    console.warn("⚠️  Could not claim job (race condition?):", data.id);
    return null;
  }

  return data as RenderJob;
}

async function renderVideo(job: RenderJob): Promise<string> {
  const outputFile = path.join(OUTPUT_DIR, `video-${job.crm_record_id}.mp4`);

  // Ensure output dir exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Write props to a temp file (avoids shell escaping issues)
  const propsFile = path.join(OUTPUT_DIR, `props-${job.crm_record_id}.json`);
  fs.writeFileSync(propsFile, JSON.stringify(job.input_props));

  console.log(`🎬 Rendering video for ${(job.input_props as Record<string, string>).companyDomain ?? job.crm_record_id}...`);

  try {
    execSync(
      [
        "npx remotion render",
        "WebflipVideo",
        outputFile,
        `--props="${propsFile}"`,
        "--codec=h264",
        "--image-format=jpeg",
        "--jpeg-quality=90",
        `--concurrency=${CONCURRENCY}`,
        "--log=error",
      ].join(" "),
      {
        cwd: path.join(__dirname, ".."),
        stdio: "inherit",
        timeout: 5 * 60 * 1000, // 5 minute timeout
      }
    );
  } finally {
    // Clean up props file
    if (fs.existsSync(propsFile)) fs.unlinkSync(propsFile);
  }

  if (!fs.existsSync(outputFile)) {
    throw new Error("Render completed but output file not found");
  }

  return outputFile;
}

async function uploadVideo(
  filePath: string,
  recordId: string
): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  const storagePath = `videos/${recordId}/outreach-${Date.now()}.mp4`;

  const { error } = await db.storage.from(BUCKET).upload(storagePath, fileBuffer, {
    contentType: "video/mp4",
    upsert: true,
  });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = db.storage.from(BUCKET).getPublicUrl(storagePath);

  // Clean up local file
  fs.unlinkSync(filePath);

  return publicUrl;
}

async function markDone(
  jobId: string,
  recordId: string,
  videoUrl: string,
  fileSizeBytes: number
) {
  await db
    .from("outreach_video_renders")
    .update({
      status: "done",
      video_url: videoUrl,
      file_size_bytes: fileSizeBytes,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  // Also update the CRM record for quick access
  await db
    .from("crm_records")
    .update({
      video_url: videoUrl,
      video_rendered_at: new Date().toISOString(),
    })
    .eq("id", recordId);
}

async function markError(jobId: string, errorMessage: string) {
  await db
    .from("outreach_video_renders")
    .update({
      status: "error",
      error_message: errorMessage.slice(0, 1000),
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

async function processOne(): Promise<boolean> {
  const job = await claimNextJob();
  if (!job) return false;

  const startTime = Date.now();

  try {
    const outputFile = await renderVideo(job);
    const stat = fs.statSync(outputFile);
    const videoUrl = await uploadVideo(outputFile, job.crm_record_id);

    const durationMs = Date.now() - startTime;
    await markDone(job.id, job.crm_record_id, videoUrl, stat.size);

    console.log(
      `✅ Done: ${(job.input_props as Record<string, string>).companyDomain} — ${(durationMs / 1000).toFixed(1)}s, ${(stat.size / 1024 / 1024).toFixed(1)} MB`
    );

    // Update duration
    await db
      .from("outreach_video_renders")
      .update({ duration_ms: durationMs })
      .eq("id", job.id);

    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌ Failed: ${job.crm_record_id} — ${message}`);
    await markError(job.id, message);
    return true; // true = we processed something (even if error)
  }
}

async function run() {
  console.log(`🎥 Webflip Render Worker started${WATCH_MODE ? " (watch mode)" : ""}`);
  console.log(`   Output: ${OUTPUT_DIR}`);
  console.log(`   Concurrency: ${CONCURRENCY}`);
  console.log("");

  if (WATCH_MODE) {
    // Continuous polling
    while (true) {
      const processed = await processOne();
      if (!processed) {
        // No jobs — wait before polling again
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      }
      // If we processed something, immediately check for more
    }
  } else {
    // Process all available jobs then exit
    let count = 0;
    while (await processOne()) {
      count++;
    }
    console.log(count > 0 ? `\n🏁 Processed ${count} video(s)` : "📭 No queued jobs");
  }
}

run().catch((err) => {
  console.error("Worker crashed:", err);
  process.exit(1);
});
