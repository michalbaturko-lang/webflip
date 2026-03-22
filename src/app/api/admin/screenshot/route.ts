import { NextRequest, NextResponse } from "next/server";
import {
  captureScreenshot,
  captureAllScreenshots,
} from "@/lib/screenshot";

/**
 * GET /api/admin/screenshot?domain=example.cz&variant=original
 *
 * Returns cached or freshly captured screenshot metadata.
 * Add &redirect=true to redirect directly to the image URL.
 */
export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain");
  const variant = req.nextUrl.searchParams.get("variant") ?? "original";
  const redirect = req.nextUrl.searchParams.get("redirect") === "true";
  const refresh = req.nextUrl.searchParams.get("refresh") === "true";

  if (!domain) {
    return NextResponse.json(
      { error: "Missing ?domain= parameter" },
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
      variant,
      forceRefresh: refresh,
    });

    if (redirect) {
      return NextResponse.redirect(result.url);
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/screenshot
 * Body: { domain: string, variants?: string[] }
 *
 * Capture screenshots for a domain — original + specified variants.
 * Default variants: ["modern", "professional", "conversion"]
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const domain: string = body.domain;
  const variants: string[] = body.variants ?? [
    "modern",
    "professional",
    "conversion",
  ];

  if (!domain) {
    return NextResponse.json(
      { error: "Provide domain in body" },
      { status: 400 }
    );
  }

  try {
    const variantUrls = variants.map((v) => ({
      variant: v,
      url: `https://webflipper.app/preview/${domain}/${v}`,
    }));

    const results = await captureAllScreenshots(domain, variantUrls);

    return NextResponse.json({
      domain,
      screenshots: results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
