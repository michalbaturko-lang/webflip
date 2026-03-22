import { createServerClient } from "@/lib/supabase";

const supabase = () => createServerClient();

export interface ScreenshotResult {
  url: string;
  width: number;
  height: number;
  domain: string;
  variant: string;
}

/**
 * Capture a screenshot of a URL using an external screenshot API.
 *
 * Strategy (in priority order):
 * 1. Check DB cache (website_screenshots table)
 * 2. Use screenshotone.com API (or similar) for capture
 * 3. Store result in Supabase Storage + DB
 *
 * For production, set SCREENSHOT_API_KEY in env.
 * Falls back to a placeholder service for development.
 */
export async function captureScreenshot(
  targetUrl: string,
  options?: {
    domain?: string;
    variant?: string;
    width?: number;
    height?: number;
    fullPage?: boolean;
    forceRefresh?: boolean;
  }
): Promise<ScreenshotResult> {
  const domain = options?.domain ?? new URL(ensureProtocol(targetUrl)).hostname;
  const variant = options?.variant ?? "original";
  const width = options?.width ?? 1200;
  const height = options?.height ?? 800;

  // 1. Check cache first
  if (!options?.forceRefresh) {
    const cached = await getCachedScreenshot(domain, variant);
    if (cached) return cached;
  }

  // 2. Capture screenshot
  const imageBuffer = await takeScreenshot(ensureProtocol(targetUrl), {
    width,
    height,
    fullPage: options?.fullPage ?? false,
  });

  // 3. Upload to Supabase Storage
  const storagePath = `screenshots/${domain}/${variant}-${Date.now()}.png`;
  const db = supabase();

  const { error: uploadError } = await db.storage
    .from("webflipper-assets")
    .upload(storagePath, imageBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    console.error("Screenshot upload failed:", uploadError);
    // Fall back to placeholder
    return {
      url: getPlaceholderUrl(domain, variant, width, height),
      width,
      height,
      domain,
      variant,
    };
  }

  const {
    data: { publicUrl },
  } = db.storage.from("webflipper-assets").getPublicUrl(storagePath);

  // 4. Save to DB cache
  await db.from("website_screenshots").upsert(
    {
      domain,
      variant,
      screenshot_url: publicUrl,
      width,
      height,
      file_size_bytes: imageBuffer.byteLength,
      captured_at: new Date().toISOString(),
      expires_at: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(), // 30 days
    },
    { onConflict: "domain,variant" }
  );

  return { url: publicUrl, width, height, domain, variant };
}

/**
 * Get a cached screenshot from DB.
 */
async function getCachedScreenshot(
  domain: string,
  variant: string
): Promise<ScreenshotResult | null> {
  const db = supabase();
  const { data } = await db
    .from("website_screenshots")
    .select("*")
    .eq("domain", domain)
    .eq("variant", variant)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!data) return null;

  return {
    url: data.screenshot_url,
    width: data.width,
    height: data.height,
    domain,
    variant,
  };
}

/**
 * Take a screenshot using the configured screenshot service.
 *
 * Supports:
 *   - SCREENSHOT_API=screenshotone  (screenshotone.com — recommended)
 *   - SCREENSHOT_API=urlbox         (urlbox.io)
 *   - SCREENSHOT_API=local          (Playwright — for dev/self-hosted)
 *
 * Default: screenshotone
 */
async function takeScreenshot(
  url: string,
  opts: { width: number; height: number; fullPage: boolean }
): Promise<Buffer> {
  const apiType = process.env.SCREENSHOT_API ?? "screenshotone";

  if (apiType === "screenshotone") {
    return takeScreenshotOne(url, opts);
  }

  if (apiType === "urlbox") {
    return takeUrlbox(url, opts);
  }

  // Local Playwright fallback
  return takePlaywright(url, opts);
}

/**
 * screenshotone.com API
 */
async function takeScreenshotOne(
  url: string,
  opts: { width: number; height: number; fullPage: boolean }
): Promise<Buffer> {
  const apiKey = process.env.SCREENSHOT_API_KEY;
  if (!apiKey) {
    throw new Error("SCREENSHOT_API_KEY required for screenshotone");
  }

  const params = new URLSearchParams({
    access_key: apiKey,
    url,
    viewport_width: String(opts.width),
    viewport_height: String(opts.height),
    full_page: String(opts.fullPage),
    format: "png",
    image_quality: "90",
    block_ads: "true",
    block_cookie_banners: "true",
    delay: "2",
    timeout: "30",
  });

  const response = await fetch(
    `https://api.screenshotone.com/take?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(
      `ScreenshotOne API error: ${response.status} ${response.statusText}`
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Urlbox.io API
 */
async function takeUrlbox(
  url: string,
  opts: { width: number; height: number; fullPage: boolean }
): Promise<Buffer> {
  const apiKey = process.env.SCREENSHOT_API_KEY;
  const apiSecret = process.env.SCREENSHOT_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("SCREENSHOT_API_KEY and SCREENSHOT_API_SECRET required");
  }

  const response = await fetch(`https://api.urlbox.io/v1/${apiKey}/png`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      width: opts.width,
      height: opts.height,
      full_page: opts.fullPage,
      block_ads: true,
      hide_cookie_banners: true,
      delay: 2,
    }),
  });

  if (!response.ok) {
    throw new Error(`Urlbox error: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Local Playwright — for development or self-hosted render servers.
 * Requires playwright to be installed: npm i playwright
 */
async function takePlaywright(
  url: string,
  opts: { width: number; height: number; fullPage: boolean }
): Promise<Buffer> {
  // Dynamic import — Playwright is optional
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { chromium } = await import("playwright");

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: opts.width, height: opts.height },
    });
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    // Wait a bit for lazy-loaded content
    await page.waitForTimeout(2000);

    const buffer = await page.screenshot({
      fullPage: opts.fullPage,
      type: "png",
    });

    return Buffer.from(buffer);
  } finally {
    await browser.close();
  }
}

/**
 * Placeholder URL for when screenshots can't be taken.
 */
function getPlaceholderUrl(
  domain: string,
  variant: string,
  width: number,
  height: number
): string {
  const label = variant === "original" ? domain : `${variant} - ${domain}`;
  const color =
    variant === "original"
      ? "1a1a2e/666666"
      : variant === "modern"
        ? "3b82f6/ffffff"
        : variant === "professional"
          ? "8b5cf6/ffffff"
          : "06b6d4/ffffff";
  return `https://placehold.co/${width}x${height}/${color}?text=${encodeURIComponent(label)}`;
}

function ensureProtocol(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

/**
 * Batch capture screenshots for a domain — original + all variants.
 */
export async function captureAllScreenshots(
  domain: string,
  variantUrls: { variant: string; url: string }[]
): Promise<ScreenshotResult[]> {
  const results: ScreenshotResult[] = [];

  // Original site first
  const original = await captureScreenshot(`https://${domain}`, {
    domain,
    variant: "original",
  });
  results.push(original);

  // Each redesign variant
  for (const { variant, url } of variantUrls) {
    const result = await captureScreenshot(url, {
      domain,
      variant,
    });
    results.push(result);
  }

  return results;
}
