import { NextRequest, NextResponse } from "next/server";
import { captureScreenshot } from "@/lib/screenshot";

/**
 * GET /api/screenshot/:domain/:variant
 *
 * Public endpoint that serves cached screenshots (or captures new ones).
 * Used by Remotion video to load screenshots via URL.
 *
 * Redirects to the actual image URL (Supabase Storage or placeholder).
 * Caches aggressively — screenshots are valid for 30 days.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ domain: string; variant: string }> }
) {
  const { domain, variant } = await params;

  if (!domain) {
    return NextResponse.json(
      { error: "Missing domain" },
      { status: 400 }
    );
  }

  try {
    const url =
      variant === "original"
        ? `https://${domain}`
        : `https://webflipper.app/preview/${domain}/${variant}`;

    const result = await captureScreenshot(url, {
      domain,
      variant: variant ?? "original",
    });

    // Redirect to actual image with cache headers
    return NextResponse.redirect(result.url, {
      status: 302,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=2592000",
      },
    });
  } catch {
    // Fallback to placeholder on error
    const placeholderUrl = `https://placehold.co/1200x800/1a1a2e/666666?text=${encodeURIComponent(domain)}`;
    return NextResponse.redirect(placeholderUrl, { status: 302 });
  }
}
