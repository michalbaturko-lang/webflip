/**
 * Google PageSpeed Insights API v5 Integration
 *
 * Fetches real Lighthouse metrics via the PageSpeed Insights API.
 * GOOGLE_PAGESPEED_API_KEY env var is OPTIONAL — works without it at lower rate limit.
 * Always returns null gracefully on error — never blocks the pipeline.
 */

export interface PageSpeedMetrics {
  fcp: number; // First Contentful Paint (ms)
  lcp: number; // Largest Contentful Paint (ms)
  tbt: number; // Total Blocking Time (ms)
  cls: number; // Cumulative Layout Shift
  si: number;  // Speed Index (ms)
  tti: number; // Time to Interactive (ms)
  ttfb: number; // Time to First Byte (ms)
}

export interface PageSpeedFieldData {
  fcpP75: number | null; // Chrome UX Report p75 FCP (ms)
  lcpP75: number | null; // Chrome UX Report p75 LCP (ms)
  clsP75: number | null; // Chrome UX Report p75 CLS
  fidP75: number | null; // Chrome UX Report p75 FID (ms)
  inpP75: number | null; // Chrome UX Report p75 INP (ms)
  ttfbP75: number | null; // Chrome UX Report p75 TTFB (ms)
}

export interface PageSpeedAudit {
  id: string;
  title: string;
  titleCz: string;
  description: string;
  score: number | null; // 0-1, null if not applicable
  displayValue: string;
  savings: string;
}

export interface PageSpeedScores {
  performance: number; // 0-100
  accessibility: number; // 0-100
}

export interface PageSpeedResult {
  score: number;
  metrics: PageSpeedMetrics;
  scores: PageSpeedScores;
  audits: PageSpeedAudit[];
  fieldData: PageSpeedFieldData | null;
  opportunities: {
    title: string;
    description: string;
    savings: string;
  }[];
  totalSize: number;
  requestCount: number;
  usesCompression: boolean;
  usesMinification: boolean;
  hasLazyImages: boolean;
  usesWebP: boolean;
  source: "lighthouse";
}

/** Map Lighthouse audit IDs to Czech finding titles */
const AUDIT_TITLE_MAP: Record<string, string> = {
  "render-blocking-resources": "Blokující zdroje na kritické cestě",
  "unused-css-rules": "Nepoužívané CSS",
  "unused-javascript": "Nepoužívaný JavaScript",
  "modern-image-formats": "Chybí moderní formáty obrázků (WebP/AVIF)",
  "server-response-time": "Pomalá odezva serveru (TTFB)",
  "dom-size": "Příliš velký DOM",
  "uses-text-compression": "Chybí textová komprese (gzip/brotli)",
  "redirects": "Přesměrování zpomalují načítání",
  "layout-shift-elements": "Prvky způsobující posun obsahu (CLS)",
  "offscreen-images": "Obrázky mimo viewport bez lazy loading",
  "uses-long-cache-ttl": "Krátká cache pro statické soubory",
  "unminified-css": "CSS není minifikované",
  "unminified-javascript": "JavaScript není minifikovaný",
  "uses-responsive-images": "Neoptimální velikost obrázků",
  "efficient-animated-content": "Neefektivní animovaný obsah",
  "duplicated-javascript": "Duplikovaný JavaScript",
  "legacy-javascript": "Legacy JavaScript (ES5 polyfills)",
  "total-byte-weight": "Příliš velká celková velikost stránky",
  "mainthread-work-breakdown": "Příliš mnoho práce na hlavním vlákně",
  "bootup-time": "Pomalé spouštění JavaScriptu",
  "font-display": "Fonty blokují vykreslování textu",
  "third-party-summary": "Služby třetích stran zpomalují stránku",
  "largest-contentful-paint-element": "LCP element je pomalý",
  "lcp-lazy-loaded": "LCP obrázek má lazy loading (zpomaluje)",
  "prioritize-lcp-image": "LCP obrázek nemá prioritu načítání",
  "uses-optimized-images": "Neoptimalizované obrázky",
};

/** All audit IDs we care about */
const TRACKED_AUDIT_IDS = Object.keys(AUDIT_TITLE_MAP);

/**
 * Fetch real PageSpeed Insights data for a URL.
 * Returns null on any error — never blocks the pipeline.
 */
export async function getPageSpeedData(url: string): Promise<PageSpeedResult | null> {
  try {
    const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;

    const params = new URLSearchParams();
    params.set("url", url);
    params.set("strategy", "mobile");
    params.append("category", "PERFORMANCE");
    params.append("category", "ACCESSIBILITY");
    if (apiKey) params.set("key", apiKey);

    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`;

    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) {
      console.warn(`PageSpeed API returned ${response.status} for ${url}`);
      return null;
    }

    const data = await response.json();
    return parsePageSpeedResponse(data);
  } catch (err) {
    console.warn("PageSpeed API unavailable:", err instanceof Error ? err.message : err);
    return null;
  }
}

function parsePageSpeedResponse(data: Record<string, unknown>): PageSpeedResult {
  const lighthouse = (data as any).lighthouseResult;
  const loadingExperience = (data as any).loadingExperience;
  const audits = lighthouse?.audits || {};
  const categories = lighthouse?.categories || {};

  // Performance & accessibility scores (0-100)
  const performanceScore = Math.round((categories.performance?.score || 0) * 100);
  const accessibilityScore = Math.round((categories.accessibility?.score || 0) * 100);

  // Core Web Vitals from Lighthouse lab data
  const metrics: PageSpeedMetrics = {
    fcp: audits["first-contentful-paint"]?.numericValue || 0,
    lcp: audits["largest-contentful-paint"]?.numericValue || 0,
    tbt: audits["total-blocking-time"]?.numericValue || 0,
    cls: audits["cumulative-layout-shift"]?.numericValue || 0,
    si: audits["speed-index"]?.numericValue || 0,
    tti: audits["interactive"]?.numericValue || 0,
    ttfb: audits["server-response-time"]?.numericValue || 0,
  };

  // Chrome UX Report field data (p75 values)
  let fieldData: PageSpeedFieldData | null = null;
  if (loadingExperience?.metrics) {
    const m = loadingExperience.metrics;
    fieldData = {
      fcpP75: m.FIRST_CONTENTFUL_PAINT_MS?.percentile ?? null,
      lcpP75: m.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null,
      clsP75: m.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile != null
        ? m.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100
        : null,
      fidP75: m.FIRST_INPUT_DELAY_MS?.percentile ?? null,
      inpP75: m.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
      ttfbP75: m.EXPERIMENTAL_TIME_TO_FIRST_BYTE?.percentile ?? null,
    };
    // Only keep field data if at least one metric is present
    const hasAnyField = Object.values(fieldData).some((v) => v !== null);
    if (!hasAnyField) fieldData = null;
  }

  // Parse audits we track
  const parsedAudits: PageSpeedAudit[] = [];
  for (const auditId of TRACKED_AUDIT_IDS) {
    const audit = audits[auditId];
    if (!audit) continue;
    // Only include audits that failed or have a non-perfect score
    if (audit.score === 1 || audit.score === null) continue;
    parsedAudits.push({
      id: auditId,
      title: audit.title || auditId,
      titleCz: AUDIT_TITLE_MAP[auditId] || audit.title || auditId,
      description: audit.description || "",
      score: audit.score ?? null,
      displayValue: audit.displayValue || "",
      savings: audit.displayValue || "",
    });
  }

  // Sort audits by score ascending (worst first)
  parsedAudits.sort((a, b) => (a.score ?? 0) - (b.score ?? 0));

  // Top opportunities (failed audits of type "opportunity")
  const allAudits = Object.values(audits) as Record<string, unknown>[];
  const opportunities = allAudits
    .filter((a: any) => a.details?.type === "opportunity" && a.score !== undefined && (a.score ?? 1) < 1)
    .sort((a: any, b: any) => (a.score ?? 0) - (b.score ?? 0))
    .map((a: any) => ({
      title: a.title || "",
      description: a.description || "",
      savings: a.displayValue || "",
    }))
    .slice(0, 8);

  // Resource summary
  const resourceSummary = (audits["resource-summary"]?.details?.items || []) as Record<string, unknown>[];
  const totalItem = resourceSummary.find((i) => i.resourceType === "total");
  const totalSize = (totalItem?.transferSize as number) || 0;
  const requestCount = (totalItem?.requestCount as number) || 0;

  // Boolean checks
  const usesCompression = audits["uses-text-compression"]?.score === 1;
  const usesMinification =
    (audits["unminified-css"]?.score === 1) && (audits["unminified-javascript"]?.score === 1);
  const hasLazyImages = audits["offscreen-images"]?.score === 1;
  const usesWebP = audits["modern-image-formats"]?.score === 1;

  return {
    score: performanceScore,
    metrics,
    scores: {
      performance: performanceScore,
      accessibility: accessibilityScore,
    },
    audits: parsedAudits,
    fieldData,
    opportunities,
    totalSize,
    requestCount,
    usesCompression,
    usesMinification,
    hasLazyImages,
    usesWebP,
    source: "lighthouse",
  };
}
