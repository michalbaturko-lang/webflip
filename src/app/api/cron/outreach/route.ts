import { NextRequest, NextResponse } from "next/server";
import { processOutreachSequences } from "@/lib/outreach/sequence-engine";
import { extractAdminToken, validateAdminToken } from "@/lib/admin/auth";

// Vercel Cron config - max 60 seconds for free plan
export const maxDuration = 60;

/**
 * Verify authorization for cron job
 * Accepts either:
 * - CRON_SECRET as Bearer token (for Vercel Cron)
 * - ADMIN_API_KEY as Bearer token (for manual admin triggers)
 */
function verifyCronAuth(request: NextRequest): boolean {
  // Check CRON_SECRET (Vercel Cron)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader === `Bearer ${cronSecret}`) {
      return true;
    }
  }

  // Check admin token
  const adminToken = extractAdminToken(request);
  if (adminToken && validateAdminToken(adminToken)) {
    return true;
  }

  return false;
}

/**
 * GET handler for manual triggers (e.g., testing or manual admin triggers)
 * POST handler for Vercel Cron (POST by default)
 */
export async function POST(request: NextRequest) {
  // Verify authorization
  if (!verifyCronAuth(request)) {
    console.warn("[cron/outreach] Unauthorized access attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[cron/outreach] Starting outreach sequence processing");

    // Parse optional parameters from query string
    const { searchParams } = new URL(request.url);
    const maxRecords = searchParams.get("maxRecords")
      ? parseInt(searchParams.get("maxRecords")!, 10)
      : 100;
    const maxEmails = searchParams.get("maxEmails")
      ? parseInt(searchParams.get("maxEmails")!, 10)
      : 50;
    const sequenceId = searchParams.get("sequenceId") || undefined;

    // Validate parameters
    if (isNaN(maxRecords) || maxRecords <= 0 || maxRecords > 500) {
      return NextResponse.json(
        { error: "maxRecords must be between 1 and 500" },
        { status: 400 }
      );
    }

    if (isNaN(maxEmails) || maxEmails <= 0 || maxEmails > 100) {
      return NextResponse.json(
        { error: "maxEmails must be between 1 and 100" },
        { status: 400 }
      );
    }

    // Process outreach sequences
    const summary = await processOutreachSequences({
      maxRecords,
      maxEmails,
      sequenceId,
    });

    // Return success response
    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        summary,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cron/outreach] Unexpected error:", error);

    return NextResponse.json(
      {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for testing/debugging
 */
export async function GET(request: NextRequest) {
  // Only allow in development or with auth
  if (process.env.NODE_ENV === "production" && !verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[cron/outreach] GET request - running with defaults");

    const summary = await processOutreachSequences({
      maxRecords: 100,
      maxEmails: 50,
    });

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        summary,
        message: "GET request processed successfully. Use POST in production.",
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cron/outreach] Unexpected error:", error);

    return NextResponse.json(
      {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
