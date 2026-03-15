export interface PageSpeedResult {
  score: number;
  metrics: {
    fcp: number; // First Contentful Paint (ms)
    lcp: number; // Largest Contentful Paint (ms)
    tbt: number; // Total Blocking Time (ms)
    cls: number; // Cumulative Layout Shift
    si: number; // Speed Index (ms)
    tti: number; // Time to Interactive (ms)
    ttfb: number; // Time to First Byte (ms)
  };
  opportunities: {
    title: string;
    description: string;
    savings: string;
  }[];
  totalSize: number; // bytes
  requestCount: number;
  usesCompression: boolean;
  usesMinification: boolean;
  hasLazyImages: boolean;
  usesWebP: boolean;
}

export async function getPageSpeedData(url: string): Promise<PageSpeedResult> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;

  // Build API URL — works without API key (rate limited) or with key
  const params = new URLSearchParams({
    url,
    strategy: "mobile",
    category: "performance",
  });
  if (apiKey) params.set("key", apiKey);

  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`;

  const response = await fetch(apiUrl, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) {
    throw new Error(`PageSpeed API error: ${response.status}`);
  }

  const data = await response.json();
  const lighthouse = data.lighthouseResult;
  const audits = lighthouse?.audits || {};
  const categories = lighthouse?.categories || {};

  // Performance score (0-100)
  const score = Math.round((categories.performance?.score || 0) * 100);

  // Core Web Vitals
  const metrics = {
    fcp: audits["first-contentful-paint"]?.numericValue || 0,
    lcp: audits["largest-contentful-paint"]?.numericValue || 0,
    tbt: audits["total-blocking-time"]?.numericValue || 0,
    cls: audits["cumulative-layout-shift"]?.numericValue || 0,
    si: audits["speed-index"]?.numericValue || 0,
    tti: audits["interactive"]?.numericValue || 0,
    ttfb: audits["server-response-time"]?.numericValue || 0,
  };

  // Opportunities
  const allAudits = Object.values(audits) as Record<string, unknown>[];
  const opportunities = allAudits
    .filter((a) => (a as { details?: { type?: string } }).details?.type === "opportunity" && (a as { score?: number }).score !== undefined && ((a as { score?: number }).score ?? 1) < 1)
    .map((a) => ({
      title: ((a as { title?: string }).title) || "",
      description: ((a as { description?: string }).description) || "",
      savings: ((a as { displayValue?: string }).displayValue) || "",
    }))
    .slice(0, 5);

  // Resource summary
  const resourceSummary = (audits["resource-summary"]?.details?.items || []) as Record<string, unknown>[];
  const totalItem = resourceSummary.find((i) => i.resourceType === "total");
  const totalSize = (totalItem?.transferSize as number) || 0;
  const requestCount = (totalItem?.requestCount as number) || 0;

  // Checks
  const usesCompression = audits["uses-text-compression"]?.score === 1;
  const usesMinification =
    (audits["unminified-css"]?.score === 1) && (audits["unminified-javascript"]?.score === 1);
  const hasLazyImages = audits["offscreen-images"]?.score === 1;
  const usesWebP = audits["modern-image-formats"]?.score === 1;

  return {
    score,
    metrics,
    opportunities,
    totalSize,
    requestCount,
    usesCompression,
    usesMinification,
    hasLazyImages,
    usesWebP,
  };
}
