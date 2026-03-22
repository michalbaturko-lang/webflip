import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { captureScreenshot } from "@/lib/screenshot";

const supabase = () => createServerClient();

/**
 * POST /api/admin/screenshot/batch
 * Body: {
 *   recordId: string,
 *   domain: string,
 *   forceRefresh?: boolean
 * }
 *
 * Batch capture all screenshots needed for video rendering:
 *   - Original website screenshot
 *   - 3 variant screenshots from preview URLs
 *
 * Returns all screenshot URLs and updates the CRM record metadata.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { recordId, domain, forceRefresh } = body;

  if (!recordId || !domain) {
    return NextResponse.json(
      { error: "recordId and domain required" },
      { status: 400 }
    );
  }

  const db = supabase();

  try {
    // Load the CRM record to get analysis token
    const { data: record, error: recErr } = await db
      .from("crm_records")
      .select("*")
      .eq("id", recordId)
      .single();

    if (recErr || !record) {
      return NextResponse.json(
        { error: `Record not found: ${recErr?.message}` },
        { status: 404 }
      );
    }

    const meta = (record.metadata as Record<string, unknown>) ?? {};
    const analysisToken = (meta.analysis_token as string) ?? record.analysis_id;

    if (!analysisToken) {
      return NextResponse.json(
        { error: "No analysis token found in record" },
        { status: 400 }
      );
    }

    const screenshotUrls: Record<string, string> = {};

    // 1. Capture original website screenshot
    const original = await captureScreenshot(`https://${domain}`, {
      domain,
      variant: "original",
      forceRefresh,
    });
    screenshotUrls.original = original.url;

    // 2. Capture 3 variant screenshots from preview URLs
    const variantNames = ["modern", "professional", "conversion"];
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ?? "https://webflip.cz";

    for (let i = 0; i < 3; i++) {
      const variantName = variantNames[i];
      const previewUrl = `${baseUrl}/api/analyze/${analysisToken}/preview/${i}`;

      try {
        const screenshot = await captureScreenshot(previewUrl, {
          domain,
          variant: variantName,
          forceRefresh,
        });
        screenshotUrls[variantName] = screenshot.url;
      } catch (err) {
        // Log error but continue with other variants
        console.error(
          `Failed to capture ${variantName} screenshot:`,
          err instanceof Error ? err.message : String(err)
        );
        // Don't fail the entire batch on one screenshot error
      }
    }

    // 3. Update CRM record metadata with screenshot URLs
    const updatedMeta = {
      ...meta,
      originalScreenshotUrl: screenshotUrls.original ?? meta.originalScreenshotUrl,
      screenshots: screenshotUrls,
      screenshotsCapturedAt: new Date().toISOString(),
    };

    const { error: updateErr } = await db
      .from("crm_records")
      .update({ metadata: updatedMeta })
      .eq("id", recordId);

    if (updateErr) {
      console.error("Failed to update CRM record metadata:", updateErr);
      // Still return the screenshots even if metadata update fails
    }

    return NextResponse.json({
      recordId,
      domain,
      success: true,
      screenshots: screenshotUrls,
      count: Object.keys(screenshotUrls).length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: message, recordId, domain },
      { status: 500 }
    );
  }
}
