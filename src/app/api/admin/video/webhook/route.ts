/**
 * Remotion Lambda Webhook Endpoint
 *
 * This endpoint receives callbacks from Remotion Lambda when video rendering completes.
 * It updates the render job status in the database.
 *
 * Webhook Flow:
 * 1. Remotion Lambda completes rendering a video
 * 2. Lambda invokes this webhook with render results
 * 3. We update the outreach_video_renders table status
 * 4. CRM record gets the new video_url
 *
 * POST /api/admin/video/webhook
 * Body:
 * {
 *   renderId: string (UUID of outreach_video_renders record)
 *   outputUrl: string (S3 URL to the rendered MP4)
 *   status: "done" | "error"
 *   errorMessage?: string (only if status = "error")
 *   durationMs?: number
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

interface WebhookPayload {
  renderId: string;
  outputUrl?: string;
  status: "done" | "error";
  errorMessage?: string;
  durationMs?: number;
}

/**
 * Validate webhook request
 *
 * In production, you would verify:
 * - Request signature from Lambda
 * - Source IP whitelist
 * - API key in Authorization header
 */
function validateWebhookRequest(req: NextRequest): boolean {
  // For now, we trust requests from our Lambda infrastructure
  // In production, add signature verification or API key validation
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Validate request
    if (!validateWebhookRequest(req)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse body
    const body: WebhookPayload = await req.json();

    // Validate required fields
    if (!body.renderId || !body.status) {
      return NextResponse.json(
        { error: "Missing renderId or status" },
        { status: 400 }
      );
    }

    if (body.status === "done" && !body.outputUrl) {
      return NextResponse.json(
        { error: "outputUrl required for status=done" },
        { status: 400 }
      );
    }

    const db = createServerClient();

    // Fetch the render job
    const { data: job, error: fetchError } = await db
      .from("outreach_video_renders")
      .select("*")
      .eq("id", body.renderId)
      .single();

    if (fetchError || !job) {
      return NextResponse.json(
        { error: "Render job not found" },
        { status: 404 }
      );
    }

    // Update based on status
    if (body.status === "done") {
      // Mark as done with video URL
      const { error: updateError } = await db
        .from("outreach_video_renders")
        .update({
          status: "done",
          video_url: body.outputUrl,
          completed_at: new Date().toISOString(),
          ...(body.durationMs && { duration_ms: body.durationMs }),
        })
        .eq("id", body.renderId);

      if (updateError) {
        console.error("Failed to update render job:", updateError);
        return NextResponse.json(
          { error: "Failed to update render job" },
          { status: 500 }
        );
      }

      // Also update CRM record for quick access
      await db
        .from("crm_records")
        .update({
          video_url: body.outputUrl,
          video_rendered_at: new Date().toISOString(),
        })
        .eq("id", job.crm_record_id);

      console.log(
        `✅ Webhook: Render ${body.renderId} marked done with video: ${body.outputUrl}`
      );

      return NextResponse.json({
        success: true,
        message: "Render job updated to done",
        renderId: body.renderId,
        videoUrl: body.outputUrl,
      });
    } else if (body.status === "error") {
      // Mark as error
      const { error: updateError } = await db
        .from("outreach_video_renders")
        .update({
          status: "error",
          error_message: body.errorMessage?.slice(0, 1000) || "Unknown error",
          completed_at: new Date().toISOString(),
        })
        .eq("id", body.renderId);

      if (updateError) {
        console.error("Failed to update render job:", updateError);
        return NextResponse.json(
          { error: "Failed to update render job" },
          { status: 500 }
        );
      }

      console.log(
        `❌ Webhook: Render ${body.renderId} marked error: ${body.errorMessage}`
      );

      return NextResponse.json({
        success: true,
        message: "Render job marked as error",
        renderId: body.renderId,
        error: body.errorMessage,
      });
    }

    return NextResponse.json(
      { error: "Invalid status" },
      { status: 400 }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Webhook processing failed:", errorMessage);

    return NextResponse.json(
      { error: "Webhook processing failed", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Remotion Lambda webhook endpoint ready",
    endpoint: "/api/admin/video/webhook",
  });
}
