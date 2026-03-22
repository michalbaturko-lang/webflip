/**
 * ElevenLabs TTS integration for personalized outreach voiceovers.
 *
 * Generates a single continuous MP3 voiceover from a personalized script,
 * uploads it to Supabase Storage, and returns the public URL.
 *
 * Environment:
 *   ELEVENLABS_API_KEY  — API key
 *   ELEVENLABS_VOICE_ID — Voice ID for Czech voiceover
 *   STORAGE_BUCKET      — Supabase storage bucket (default: webflipper-assets)
 */

import { createServerClient } from "@/lib/supabase";

const API_BASE = "https://api.elevenlabs.io/v1";

interface VoiceoverRequest {
  /** CRM record ID — used for storage path */
  recordId: string;
  /** Full voiceover script (all scenes concatenated) */
  script: string;
  /** Override voice ID (otherwise uses env default) */
  voiceId?: string;
  /** Model ID (default: eleven_multilingual_v2 for Czech support) */
  modelId?: string;
}

interface VoiceoverResult {
  success: boolean;
  voiceoverUrl?: string;
  durationMs?: number;
  error?: string;
}

function getConfig() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const bucket = process.env.STORAGE_BUCKET ?? "webflip-assets";

  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");
  if (!voiceId) throw new Error("ELEVENLABS_VOICE_ID not configured");

  return { apiKey, voiceId, bucket };
}

/**
 * Generate a voiceover MP3 from text using ElevenLabs TTS.
 * Returns the raw audio buffer.
 */
async function synthesizeSpeech(
  text: string,
  voiceId: string,
  apiKey: string,
  modelId: string
): Promise<Buffer> {
  const response = await fetch(`${API_BASE}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.6,
        similarity_boost: 0.8,
        style: 0.2,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `ElevenLabs API error ${response.status}: ${errorBody.slice(0, 200)}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload voiceover audio to Supabase Storage.
 */
async function uploadVoiceover(
  audioBuffer: Buffer,
  recordId: string,
  bucket: string
): Promise<string> {
  const db = createServerClient();
  const storagePath = `voiceovers/${recordId}/voiceover-${Date.now()}.mp3`;

  const { error } = await db.storage.from(bucket).upload(storagePath, audioBuffer, {
    contentType: "audio/mpeg",
    upsert: true,
  });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = db.storage.from(bucket).getPublicUrl(storagePath);

  return publicUrl;
}

/**
 * Generate a personalized voiceover for a CRM record.
 *
 * Takes the full concatenated script, synthesizes it via ElevenLabs,
 * uploads the MP3 to Supabase Storage, and returns the public URL.
 */
export async function generateVoiceover(
  request: VoiceoverRequest
): Promise<VoiceoverResult> {
  const startTime = Date.now();

  try {
    const config = getConfig();
    const voiceId = request.voiceId ?? config.voiceId;
    const modelId = request.modelId ?? "eleven_multilingual_v2";

    console.log(
      `[elevenlabs] Generating voiceover for record ${request.recordId} (${request.script.length} chars)`
    );

    // Synthesize speech
    const audioBuffer = await synthesizeSpeech(
      request.script,
      voiceId,
      config.apiKey,
      modelId
    );

    console.log(
      `[elevenlabs] Got audio: ${(audioBuffer.length / 1024).toFixed(0)} KB`
    );

    // Upload to storage
    const voiceoverUrl = await uploadVoiceover(
      audioBuffer,
      request.recordId,
      config.bucket
    );

    const durationMs = Date.now() - startTime;
    console.log(
      `[elevenlabs] Voiceover ready for ${request.recordId} in ${(durationMs / 1000).toFixed(1)}s: ${voiceoverUrl}`
    );

    return {
      success: true,
      voiceoverUrl,
      durationMs,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[elevenlabs] Failed for ${request.recordId}:`, error);
    return {
      success: false,
      error,
    };
  }
}

/**
 * Build the full voiceover script from scene segments.
 * Adds natural pauses between scenes.
 */
export function buildFullScript(scenes: Record<string, string>): string {
  // Order matters — scenes should be passed in order
  const parts = Object.values(scenes).filter(
    (text) => !text.startsWith("[") // Skip non-speech segments like "[Hudební intro]"
  );

  // Join with paragraph breaks (ElevenLabs interprets double newlines as pauses)
  return parts.join("\n\n");
}

/**
 * Check remaining character quota on ElevenLabs account.
 * Useful for monitoring usage before batch generation.
 */
export async function checkQuota(): Promise<{
  characterCount: number;
  characterLimit: number;
  remainingCharacters: number;
} | null> {
  try {
    const { apiKey } = getConfig();

    const response = await fetch(`${API_BASE}/user/subscription`, {
      headers: { "xi-api-key": apiKey },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      characterCount: data.character_count ?? 0,
      characterLimit: data.character_limit ?? 0,
      remainingCharacters:
        (data.character_limit ?? 0) - (data.character_count ?? 0),
    };
  } catch {
    return null;
  }
}
