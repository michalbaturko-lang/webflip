/**
 * Remotion Lambda Render Worker
 *
 * Polls the outreach_video_renders queue and renders videos using Remotion Lambda.
 * This worker supports both Lambda rendering (cloud-based, scalable) and local CLI
 * rendering (fallback/development).
 *
 * Usage:
 *   npx tsx scripts/render-worker.ts          # Process one batch then exit
 *   npx tsx scripts/render-worker.ts --watch   # Continuous polling
 *
 * Environment Variables:
 *   SUPABASE_URL             — Supabase project URL
 *   SUPABASE_SERVICE_KEY     — Service role key (bypasses RLS)
 *   RENDER_MODE              — "lambda" (default) or "local"
 *   AWS_ACCESS_KEY_ID        — AWS IAM credentials (for Lambda)
 *   AWS_SECRET_ACCESS_KEY    — AWS IAM credentials (for Lambda)
 *   REMOTION_LAMBDA_FUNCTION_NAME — Lambda function name
 *   REMOTION_S3_BUCKET       — S3 bucket for video output
 *   ELEVENLABS_API_KEY       — ElevenLabs API key (optional)
 *   ELEVENLABS_VOICE_ID      — Voice ID for Czech voiceover (optional)
 *   SKIP_VOICEOVER           — Set to "1" to skip voiceover generation
 *
 * Render Modes:
 * - Lambda (default): Scalable cloud rendering via AWS Lambda
 * - Local: Fallback local rendering using Remotion CLI
 *
 * The worker:
 *   1. Polls Supabase for queued render jobs
 *   2. Claims the next job (optimistic locking)
 *   3. Generates voiceover via ElevenLabs (if needed)
 *   4. Triggers render via Lambda (or local CLI)
 *   5. Updates job status in database
 *   6. Continuous polling in watch mode (--watch)
 */

import { createClient } from "@supabase/supabase-js";
import type { OutreachVideoProps } from "../src/Video";

// ──────────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
const RENDER_MODE = (process.env.RENDER_MODE || "lambda") as "lambda" | "local";
const WATCH_MODE = process.argv.includes("--watch");
const POLL_INTERVAL = 10_000; // 10 seconds between polls when idle
const SKIP_VOICEOVER = process.env.SKIP_VOICEOVER === "1";

// ElevenLabs config
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY ?? "";
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "";
const ELEVENLABS_MODEL = "eleven_multilingual_v2"; // Czech support

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ SUPABASE_URL and SUPABASE_SERVICE_KEY are required");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface RenderJob {
  id: string;
  crm_record_id: string;
  input_props: OutreachVideoProps & { voiceoverUrl?: string };
  priority: number;
}

// ──────────────────────────────────────────────────────────────
// Job Management
// ──────────────────────────────────────────────────────────────

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

async function markDone(jobId: string, recordId: string, videoUrl: string) {
  await db
    .from("outreach_video_renders")
    .update({
      status: "done",
      video_url: videoUrl,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  // Also update CRM record for quick access
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

// ──────────────────────────────────────────────────────────────
// ElevenLabs Voiceover
// ──────────────────────────────────────────────────────────────

async function generateVoiceover(job: RenderJob): Promise<string | null> {
  if (SKIP_VOICEOVER || !ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID) {
    if (!SKIP_VOICEOVER && !ELEVENLABS_API_KEY) {
      console.log("⏭️  Skipping voiceover (ELEVENLABS_API_KEY not set)");
    }
    return null;
  }

  const props = job.input_props;

  // Already has voiceover
  if (props.voiceoverUrl) {
    console.log(`🔊 Using existing voiceover: ${props.voiceoverUrl}`);
    return props.voiceoverUrl;
  }

  // Build personalized Czech script
  const domain = props.companyDomain ?? "vašeho webu";
  const score = props.overallScore ?? 0;

  const script = [
    `Váš web ${domain} má několik vážných problémů. Načítá se příliš pomalu, na mobilu je prakticky nepoužitelný a vyhledávače ho téměř nevidí. To znamená, že přicházíte o zákazníky každý den.`,
    `Náš systém Webflipper váš web kompletně analyzoval. Celkové skóre je pouhých ${score} bodů ze sta. Největší problémy jsou v rychlosti, mobilní optimalizaci a SEO. Ale máme pro vás řešení.`,
    `Na základě analýzy jsme vytvořili tři kompletní redesigny vašeho webu. Každý je optimalizovaný pro rychlost, SEO i AI vyhledávače. Vyberte si ten, který vám nejlépe sedí — nebo je zkombinujte.`,
    `A nejlepší část? Každý redesign si můžete sami upravit v našem AI editoru. Stačí kliknout na prvek, říct co chcete změnit — a editor to udělá za vás. Žádné programování.`,
    `Máte sedm dní na vyzkoušení — zcela zdarma. Podívejte se na návrhy na odkazu níže. Pokud se vám líbí, zaplaťte a web je váš. Pokud ne — smažeme vše. Žádný závazek.`,
  ].join("\n\n");

  console.log(
    `🎙️  Generating voiceover for ${domain} (${script.length} chars)...`
  );

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: script,
          model_id: ELEVENLABS_MODEL,
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(
        `❌ ElevenLabs error ${response.status}: ${errorText.slice(0, 200)}`
      );
      return null; // Proceed without voiceover
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`🎙️  Got audio: ${(audioBuffer.length / 1024).toFixed(0)} KB`);

    // Upload to Supabase Storage
    const storagePath = `voiceovers/${job.crm_record_id}/voiceover-${Date.now()}.mp3`;
    const { error: uploadError } = await db.storage
      .from("webflip-assets")
      .upload(storagePath, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error(`❌ Voiceover upload failed: ${uploadError.message}`);
      return null;
    }

    const { data: publicUrlData } = db.storage
      .from("webflip-assets")
      .getPublicUrl(storagePath);

    console.log(`🔊 Voiceover ready: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("❌ Voiceover generation failed:", err);
    return null; // Proceed without voiceover
  }
}

// ──────────────────────────────────────────────────────────────
// Rendering Backends
// ──────────────────────────────────────────────────────────────

async function renderViaLambda(job: RenderJob): Promise<string> {
  try {
    const { renderVideoOnLambda } = await import("../src/render-video");
    const props = job.input_props;
    const result = await renderVideoOnLambda(props);
    return result.videoUrl;
  } catch (err) {
    throw new Error(
      `Lambda render failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

async function renderViaLocal(job: RenderJob): Promise<string> {
  try {
    const { execSync } = await import("child_process");
    const fs = await import("fs");
    const path = await import("path");

    const OUTPUT_DIR = process.env.RENDER_OUTPUT_DIR || path.join(__dirname, "..", "out");
    const outputFile = path.join(
      OUTPUT_DIR,
      `video-${job.crm_record_id}.mp4`
    );

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const propsFile = path.join(OUTPUT_DIR, `props-${job.crm_record_id}.json`);
    fs.writeFileSync(propsFile, JSON.stringify(job.input_props));

    console.log(
      `🎬 Rendering locally for ${job.input_props.companyDomain}...`
    );

    execSync(
      [
        "npx remotion render",
        "WebflipperVideo",
        outputFile,
        `--props="${propsFile}"`,
        "--codec=h264",
        "--image-format=jpeg",
        "--jpeg-quality=90",
        "--concurrency=50%",
        "--log=error",
      ].join(" "),
      {
        cwd: path.join(__dirname, ".."),
        stdio: "inherit",
        timeout: 5 * 60 * 1000, // 5 minute timeout
      }
    );

    if (!fs.existsSync(outputFile)) {
      throw new Error("Render completed but output file not found");
    }

    // Upload to Supabase Storage
    const fileBuffer = fs.readFileSync(outputFile);
    const storagePath = `videos/${job.crm_record_id}/outreach-${Date.now()}.mp4`;

    const { error } = await db.storage
      .from("webflip-assets")
      .upload(storagePath, fileBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: publicUrlData } = db.storage
      .from("webflip-assets")
      .getPublicUrl(storagePath);

    // Clean up
    if (fs.existsSync(propsFile)) fs.unlinkSync(propsFile);
    if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

    return publicUrlData.publicUrl;
  } catch (err) {
    throw new Error(
      `Local render failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

// ──────────────────────────────────────────────────────────────
// Main Processing
// ──────────────────────────────────────────────────────────────

async function processOne(): Promise<boolean> {
  const job = await claimNextJob();
  if (!job) return false;

  const startTime = Date.now();

  try {
    // Generate voiceover if needed
    const voiceoverUrl = await generateVoiceover(job);
    if (voiceoverUrl) {
      job.input_props.voiceoverUrl = voiceoverUrl;
    }

    // Render video
    const videoUrl =
      RENDER_MODE === "lambda"
        ? await renderViaLambda(job)
        : await renderViaLocal(job);

    // Mark done
    const durationMs = Date.now() - startTime;
    await markDone(job.id, job.crm_record_id, videoUrl);

    console.log(
      `✅ Done: ${job.input_props.companyDomain} — ${(durationMs / 1000).toFixed(1)}s`
    );

    // Update duration in database
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
  console.log(`🎥 Webflipper Render Worker started${WATCH_MODE ? " (watch mode)" : ""}`);
  console.log(`   Mode: ${RENDER_MODE}`);
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
