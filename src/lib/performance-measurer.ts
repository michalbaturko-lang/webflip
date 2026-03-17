/**
 * Performance Measurement Engine
 *
 * Analýza výkonu webu na základě HTML/CSS/JS obsahu stránky.
 * Pokrývá: Critical Rendering Path, obrázky, třetí strany,
 * fonty, skóre výkonu, CDN/cache, mobilní optimalizace, kompresi.
 */

import * as cheerio from "cheerio";
import type { PageSpeedResult } from "./pagespeed";
import type { Finding } from "./supabase";

// ─── Types ───

export interface PerformanceMeasurement {
  criticalRenderingPath: CriticalRenderingPathResult;
  imageOptimization: ImageOptimizationResult;
  thirdPartyImpact: ThirdPartyImpactResult;
  fontOptimization: FontOptimizationResult;
  performanceScore: PerformanceScoreResult;
  cdnCaching: CdnCachingResult;
  mobileOptimization: MobileOptimizationResult;
  compressionDetection: CompressionDetectionResult;
}

export interface CriticalRenderingPathResult {
  renderBlockingCss: number;
  renderBlockingJs: number;
  criticalPathLength: number;
  inlineCssSize: number;
  details: string[];
}

export interface ImageOptimizationResult {
  totalImages: number;
  withSrcset: number;
  withLazyLoading: number;
  withModernFormat: number;
  withDimensions: number;
  missingAlt: number;
  oversizedImages: number;
  details: string[];
}

export interface ThirdPartyImpactResult {
  totalThirdParty: number;
  slowServices: ThirdPartyService[];
  estimatedBlockingTime: number;
  details: string[];
}

export interface ThirdPartyService {
  name: string;
  category: string;
  impactLevel: "vysoký" | "střední" | "nízký";
  estimatedMs: number;
}

export interface FontOptimizationResult {
  totalFonts: number;
  withFontDisplaySwap: boolean;
  withPreload: number;
  usesGoogleFonts: boolean;
  googleFontsOptimized: boolean;
  details: string[];
}

export interface PerformanceScoreResult {
  overall: number;
  estimatedLCP: number;
  estimatedFCP: number;
  estimatedTBT: number;
  estimatedCLS: number;
  estimatedSI: number;
  breakdown: {
    tbtScore: number;
    lcpScore: number;
    clsScore: number;
    fcpScore: number;
    siScore: number;
  };
}

export interface CdnCachingResult {
  usesCdn: boolean;
  cdnProvider: string | null;
  hasCacheHeaders: boolean;
  staticAssetsCached: boolean;
  details: string[];
}

export interface MobileOptimizationResult {
  hasViewport: boolean;
  viewportCorrect: boolean;
  hasTouchTargets: boolean;
  usesResponsiveImages: boolean;
  usesMediaQueries: boolean;
  fontSizeReadable: boolean;
  details: string[];
}

export interface CompressionDetectionResult {
  textCompression: boolean;
  minifiedCss: boolean;
  minifiedJs: boolean;
  totalUncompressedSize: number;
  details: string[];
}

// ─── Third-Party Services Database (30+) ───

const THIRD_PARTY_DB: Record<string, { name: string; category: string; impactLevel: "vysoký" | "střední" | "nízký"; estimatedMs: number }> = {
  // Analytics & Tracking
  "googletagmanager.com": { name: "Google Tag Manager", category: "Analytics", impactLevel: "vysoký", estimatedMs: 300 },
  "google-analytics.com": { name: "Google Analytics", category: "Analytics", impactLevel: "střední", estimatedMs: 150 },
  "analytics.google.com": { name: "Google Analytics 4", category: "Analytics", impactLevel: "střední", estimatedMs: 150 },
  "gtag/js": { name: "Google gtag.js", category: "Analytics", impactLevel: "střední", estimatedMs: 120 },
  "connect.facebook.net": { name: "Facebook Pixel", category: "Reklama", impactLevel: "vysoký", estimatedMs: 350 },
  "snap.licdn.com": { name: "LinkedIn Insight Tag", category: "Reklama", impactLevel: "střední", estimatedMs: 200 },
  "bat.bing.com": { name: "Bing UET", category: "Reklama", impactLevel: "střední", estimatedMs: 150 },
  "clarity.ms": { name: "Microsoft Clarity", category: "Analytics", impactLevel: "střední", estimatedMs: 180 },
  "mc.yandex.ru": { name: "Yandex Metrica", category: "Analytics", impactLevel: "střední", estimatedMs: 200 },
  "cdn.segment.com": { name: "Segment", category: "Analytics", impactLevel: "střední", estimatedMs: 180 },
  "plausible.io": { name: "Plausible Analytics", category: "Analytics", impactLevel: "nízký", estimatedMs: 50 },
  "cdn.mxpnl.com": { name: "Mixpanel", category: "Analytics", impactLevel: "střední", estimatedMs: 160 },
  "static.hotjar.com": { name: "Hotjar", category: "Analytics", impactLevel: "vysoký", estimatedMs: 400 },
  "script.hotjar.com": { name: "Hotjar Script", category: "Analytics", impactLevel: "vysoký", estimatedMs: 400 },

  // Chat & Support
  "widget.intercom.io": { name: "Intercom", category: "Chat", impactLevel: "vysoký", estimatedMs: 500 },
  "js.intercomcdn.com": { name: "Intercom CDN", category: "Chat", impactLevel: "vysoký", estimatedMs: 450 },
  "embed.tawk.to": { name: "Tawk.to", category: "Chat", impactLevel: "vysoký", estimatedMs: 400 },
  "static.zdassets.com": { name: "Zendesk", category: "Chat", impactLevel: "vysoký", estimatedMs: 380 },
  "js.driftt.com": { name: "Drift", category: "Chat", impactLevel: "vysoký", estimatedMs: 420 },
  "cdn.livechatinc.com": { name: "LiveChat", category: "Chat", impactLevel: "vysoký", estimatedMs: 350 },
  "widget.smartsupp.com": { name: "Smartsupp", category: "Chat", impactLevel: "střední", estimatedMs: 300 },

  // Marketing & A/B testing
  "js.hs-scripts.com": { name: "HubSpot", category: "Marketing", impactLevel: "vysoký", estimatedMs: 350 },
  "js.hsforms.net": { name: "HubSpot Forms", category: "Marketing", impactLevel: "střední", estimatedMs: 200 },
  "cdn.optimizely.com": { name: "Optimizely", category: "A/B testování", impactLevel: "vysoký", estimatedMs: 300 },
  "js.stripe.com": { name: "Stripe", category: "Platby", impactLevel: "střední", estimatedMs: 200 },
  "cdn.cookielaw.org": { name: "OneTrust Cookie", category: "Soukromí", impactLevel: "střední", estimatedMs: 250 },
  "cookiebot.com": { name: "Cookiebot", category: "Soukromí", impactLevel: "střední", estimatedMs: 200 },

  // Social & Embeds
  "platform.twitter.com": { name: "Twitter/X Widget", category: "Sociální sítě", impactLevel: "střední", estimatedMs: 250 },
  "www.youtube.com/iframe_api": { name: "YouTube Embed", category: "Video", impactLevel: "vysoký", estimatedMs: 500 },
  "www.youtube.com/embed": { name: "YouTube Embed", category: "Video", impactLevel: "vysoký", estimatedMs: 500 },
  "player.vimeo.com": { name: "Vimeo Embed", category: "Video", impactLevel: "vysoký", estimatedMs: 400 },
  "maps.googleapis.com": { name: "Google Maps", category: "Mapy", impactLevel: "vysoký", estimatedMs: 400 },
  "maps.google.com": { name: "Google Maps", category: "Mapy", impactLevel: "vysoký", estimatedMs: 400 },
  "www.google.com/recaptcha": { name: "reCAPTCHA", category: "Bezpečnost", impactLevel: "střední", estimatedMs: 250 },
  "www.gstatic.com/recaptcha": { name: "reCAPTCHA", category: "Bezpečnost", impactLevel: "střední", estimatedMs: 250 },

  // Fonts
  "use.typekit.net": { name: "Adobe Fonts", category: "Fonty", impactLevel: "střední", estimatedMs: 200 },

  // CRM / Popups
  "cdn.onesignal.com": { name: "OneSignal", category: "Push notifikace", impactLevel: "střední", estimatedMs: 200 },
  "js.pusher.com": { name: "Pusher", category: "Realtime", impactLevel: "nízký", estimatedMs: 100 },
  "cdn.mouseflow.com": { name: "Mouseflow", category: "Analytics", impactLevel: "střední", estimatedMs: 250 },
  "cdn.heapanalytics.com": { name: "Heap Analytics", category: "Analytics", impactLevel: "střední", estimatedMs: 200 },
};

// CDN detection patterns
const CDN_PATTERNS: { pattern: RegExp; provider: string }[] = [
  { pattern: /cloudflare/i, provider: "Cloudflare" },
  { pattern: /cdn\.cloudflare\.com/i, provider: "Cloudflare" },
  { pattern: /cdnjs\.cloudflare\.com/i, provider: "Cloudflare CDN" },
  { pattern: /fastly/i, provider: "Fastly" },
  { pattern: /akamai/i, provider: "Akamai" },
  { pattern: /cloudfront\.net/i, provider: "AWS CloudFront" },
  { pattern: /azureedge\.net/i, provider: "Azure CDN" },
  { pattern: /googleapis\.com/i, provider: "Google CDN" },
  { pattern: /gstatic\.com/i, provider: "Google Static" },
  { pattern: /jsdelivr\.net/i, provider: "jsDelivr" },
  { pattern: /unpkg\.com/i, provider: "unpkg" },
  { pattern: /cdn77/i, provider: "CDN77" },
  { pattern: /stackpath/i, provider: "StackPath" },
  { pattern: /bunny\.net/i, provider: "Bunny CDN" },
  { pattern: /vercel/i, provider: "Vercel Edge" },
];

// ─── Lighthouse Log-Normal Scoring ───

/**
 * Lighthouse log-normal scoring function.
 * Maps a raw metric value to 0-100 score using log-normal distribution.
 */
function lighthouseLogNormalScore(value: number, median: number, p10: number): number {
  if (value <= 0) return 100;
  const logRatio = Math.log(value / median);
  const sigma = Math.log(median / p10) / 0.9061938024368232; // inv_norm(0.9)
  const score = 1 - normalCdf(logRatio / sigma);
  return Math.round(Math.max(0, Math.min(100, score * 100)));
}

function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422802228014 * Math.exp(-0.5 * x * x);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

// Lighthouse 10 scoring parameters (median, p10)
const METRIC_PARAMS = {
  fcp: { median: 3000, p10: 1800 },
  lcp: { median: 4000, p10: 2500 },
  tbt: { median: 600, p10: 200 },
  cls: { median: 0.25, p10: 0.1 },
  si: { median: 5800, p10: 3387 },
};

// ─── Main Engine ───

export function measurePerformance(html: string, url: string, headers?: Record<string, string>): PerformanceMeasurement {
  const $ = cheerio.load(html);

  return {
    criticalRenderingPath: analyzeCriticalRenderingPath($, html),
    imageOptimization: analyzeImageOptimization($),
    thirdPartyImpact: analyzeThirdPartyImpact($, html),
    fontOptimization: analyzeFontOptimization($, html),
    performanceScore: calculatePerformanceScore($, html),
    cdnCaching: analyzeCdnCaching($, html, headers),
    mobileOptimization: analyzeMobileOptimization($, html),
    compressionDetection: analyzeCompression($, html),
  };
}

// ─── 1. Critical Rendering Path ───

function analyzeCriticalRenderingPath($: cheerio.CheerioAPI, html: string): CriticalRenderingPathResult {
  const details: string[] = [];

  // Count render-blocking CSS (stylesheets in <head> without media/disabled)
  const allStylesheets = $('link[rel="stylesheet"]');
  let renderBlockingCss = 0;
  allStylesheets.each((_, el) => {
    const media = $(el).attr("media");
    const disabled = $(el).attr("disabled");
    // media="print" or media="(max-width:0)" are non-blocking
    if (!disabled && (!media || (media !== "print" && !media.includes("max-width: 0") && !media.includes("max-width:0")))) {
      renderBlockingCss++;
    }
  });

  // Count render-blocking JS (scripts in <head> without async/defer)
  let renderBlockingJs = 0;
  $("head script[src]").each((_, el) => {
    const async = $(el).attr("async");
    const defer = $(el).attr("defer");
    const type = $(el).attr("type");
    if (async === undefined && defer === undefined && type !== "module") {
      renderBlockingJs++;
    }
  });

  // Inline CSS size
  let inlineCssSize = 0;
  $("style").each((_, el) => {
    inlineCssSize += $(el).text().length;
  });

  // Critical path length = blocking CSS + blocking JS
  const criticalPathLength = renderBlockingCss + renderBlockingJs;

  if (renderBlockingCss > 0) {
    details.push(`Nalezeno ${renderBlockingCss} blokujících CSS souborů v <head>`);
  }
  if (renderBlockingJs > 0) {
    details.push(`Nalezeno ${renderBlockingJs} blokujících JS souborů v <head> (chybí async/defer)`);
  }
  if (inlineCssSize > 15000) {
    details.push(`Příliš velký inline CSS: ${Math.round(inlineCssSize / 1024)} KB`);
  }
  if (criticalPathLength === 0) {
    details.push("Žádné blokující zdroje na kritické cestě — výborně");
  }

  // Check for preload hints
  const preloads = $('link[rel="preload"]').length;
  if (preloads > 0) {
    details.push(`${preloads} preload hintů nalezeno`);
  } else if (criticalPathLength > 2) {
    details.push("Chybí preload hinty pro kritické zdroje");
  }

  return { renderBlockingCss, renderBlockingJs, criticalPathLength, inlineCssSize, details };
}

// ─── 2. Image Optimization ───

function analyzeImageOptimization($: cheerio.CheerioAPI): ImageOptimizationResult {
  const details: string[] = [];
  const images = $("img");
  const totalImages = images.length;

  if (totalImages === 0) {
    return { totalImages: 0, withSrcset: 0, withLazyLoading: 0, withModernFormat: 0, withDimensions: 0, missingAlt: 0, oversizedImages: 0, details: ["Žádné obrázky na stránce"] };
  }

  let withSrcset = 0;
  let withLazyLoading = 0;
  let withModernFormat = 0;
  let withDimensions = 0;
  let missingAlt = 0;
  let oversizedImages = 0;

  images.each((_, el) => {
    const src = $(el).attr("src") || "";
    const srcset = $(el).attr("srcset");
    const loading = $(el).attr("loading");
    const alt = $(el).attr("alt");
    const width = $(el).attr("width");
    const height = $(el).attr("height");

    if (srcset) withSrcset++;
    if (loading === "lazy") withLazyLoading++;
    if (alt === undefined || alt === "") missingAlt++;
    if (width && height) withDimensions++;

    // Modern format check
    const srcLower = src.toLowerCase();
    if (srcLower.includes(".webp") || srcLower.includes(".avif") || (srcset && (srcset.includes(".webp") || srcset.includes(".avif")))) {
      withModernFormat++;
    }

    // Check for oversized image hints (width attribute > 2000)
    const w = parseInt(width || "0");
    if (w > 2000) oversizedImages++;
  });

  // Also check <picture> with <source> for modern formats
  $("picture source").each((_, el) => {
    const type = $(el).attr("type") || "";
    if (type.includes("webp") || type.includes("avif")) {
      withModernFormat++;
    }
  });
  // Cap at total images
  withModernFormat = Math.min(withModernFormat, totalImages);

  // Generate details
  const lazyPct = Math.round((withLazyLoading / totalImages) * 100);
  const srcsetPct = Math.round((withSrcset / totalImages) * 100);
  const dimPct = Math.round((withDimensions / totalImages) * 100);

  if (withLazyLoading === 0) {
    details.push("Žádný obrázek nemá lazy loading — zpomaluje načítání");
  } else if (lazyPct < 80) {
    details.push(`Pouze ${lazyPct}% obrázků má lazy loading`);
  } else {
    details.push(`${lazyPct}% obrázků má lazy loading — dobře`);
  }

  if (withModernFormat === 0) {
    details.push("Žádné moderní formáty (WebP/AVIF) — zbytečně velké soubory");
  } else {
    details.push(`${withModernFormat}/${totalImages} obrázků v moderním formátu`);
  }

  if (withDimensions === 0) {
    details.push("Žádný obrázek nemá width/height — způsobuje CLS (posun obsahu)");
  } else if (dimPct < 80) {
    details.push(`Pouze ${dimPct}% obrázků má width/height atributy`);
  }

  if (withSrcset === 0 && totalImages > 2) {
    details.push("Chybí srcset — obrázky nejsou responzivní");
  } else if (srcsetPct > 0) {
    details.push(`${srcsetPct}% obrázků má srcset`);
  }

  if (missingAlt > 0) {
    details.push(`${missingAlt} obrázků bez alt textu`);
  }

  return { totalImages, withSrcset, withLazyLoading, withModernFormat, withDimensions, missingAlt, oversizedImages, details };
}

// ─── 3. Third-Party Impact ───

function analyzeThirdPartyImpact($: cheerio.CheerioAPI, html: string): ThirdPartyImpactResult {
  const details: string[] = [];
  const slowServices: ThirdPartyService[] = [];
  const foundServices = new Set<string>();

  // Collect all external URLs from scripts, links, iframes
  const allUrls: string[] = [];
  $("script[src]").each((_, el) => { allUrls.push($(el).attr("src") || ""); });
  $("link[href]").each((_, el) => { allUrls.push($(el).attr("href") || ""); });
  $("iframe[src]").each((_, el) => { allUrls.push($(el).attr("src") || ""); });
  $("img[src]").each((_, el) => { allUrls.push($(el).attr("src") || ""); });

  // Also scan inline scripts for known patterns
  const inlineScripts = $("script:not([src])").map((_, el) => $(el).text()).get().join("\n");

  for (const [pattern, service] of Object.entries(THIRD_PARTY_DB)) {
    if (foundServices.has(service.name)) continue;

    const found = allUrls.some(u => u.includes(pattern)) || html.includes(pattern) || inlineScripts.includes(pattern);
    if (found) {
      foundServices.add(service.name);
      slowServices.push(service);
    }
  }

  const totalThirdParty = slowServices.length;
  const estimatedBlockingTime = slowServices.reduce((sum, s) => sum + s.estimatedMs, 0);

  if (totalThirdParty === 0) {
    details.push("Žádné známé pomalé služby třetích stran — výborně");
  } else {
    details.push(`Nalezeno ${totalThirdParty} služeb třetích stran`);

    const highImpact = slowServices.filter(s => s.impactLevel === "vysoký");
    if (highImpact.length > 0) {
      details.push(`${highImpact.length} služeb s vysokým dopadem: ${highImpact.map(s => s.name).join(", ")}`);
    }

    details.push(`Odhadovaný celkový dopad: ~${estimatedBlockingTime}ms`);

    if (estimatedBlockingTime > 1500) {
      details.push("Služby třetích stran výrazně zpomalují stránku");
    }
  }

  return { totalThirdParty, slowServices, estimatedBlockingTime, details };
}

// ─── 4. Font Optimization ───

function analyzeFontOptimization($: cheerio.CheerioAPI, html: string): FontOptimizationResult {
  const details: string[] = [];

  // Detect font loading
  const fontLinks = $('link[rel="stylesheet"][href*="fonts"]');
  const fontPreloads = $('link[rel="preload"][as="font"]');
  const usesGoogleFonts = $('link[href*="fonts.googleapis.com"]').length > 0 || html.includes("fonts.googleapis.com");

  // Count font files referenced
  const fontFilePatterns = /\.(woff2?|ttf|otf|eot)(\?|$|#)/gi;
  const fontFileMatches = html.match(fontFilePatterns);
  const totalFonts = Math.max(fontLinks.length, fontFileMatches?.length || 0);

  // Check font-display: swap
  const hasFontDisplaySwap = html.includes("font-display:swap") ||
    html.includes("font-display: swap") ||
    (usesGoogleFonts && html.includes("display=swap"));

  // Google Fonts optimization check
  let googleFontsOptimized = false;
  if (usesGoogleFonts) {
    // Check if preconnect to Google Fonts is present
    const hasPreconnect = $('link[rel="preconnect"][href*="fonts.gstatic.com"]').length > 0 ||
      $('link[rel="preconnect"][href*="fonts.googleapis.com"]').length > 0;
    const hasDisplaySwapParam = html.includes("display=swap");
    googleFontsOptimized = hasPreconnect && hasDisplaySwapParam;
  }

  if (totalFonts === 0) {
    details.push("Žádné vlastní fonty — používá se systémový font");
  } else {
    if (!hasFontDisplaySwap) {
      details.push("Chybí font-display: swap — text je neviditelný při načítání fontů (FOIT)");
    } else {
      details.push("font-display: swap je nastaven — text je viditelný okamžitě");
    }

    if (fontPreloads.length > 0) {
      details.push(`${fontPreloads.length} fontů má preload — dobře`);
    } else {
      details.push("Fonty nemají preload — pozdější načítání textu");
    }

    if (usesGoogleFonts) {
      if (googleFontsOptimized) {
        details.push("Google Fonts správně optimalizovány (preconnect + display=swap)");
      } else {
        details.push("Google Fonts nejsou plně optimalizovány — přidejte preconnect a display=swap");
      }
    }

    if (totalFonts > 4) {
      details.push(`${totalFonts} fontových souborů — zvažte redukci pro rychlejší načítání`);
    }
  }

  return {
    totalFonts,
    withFontDisplaySwap: hasFontDisplaySwap,
    withPreload: fontPreloads.length,
    usesGoogleFonts,
    googleFontsOptimized,
    details,
  };
}

// ─── 5. Performance Scoring (Lighthouse Log-Normal) ───

function calculatePerformanceScore($: cheerio.CheerioAPI, html: string): PerformanceScoreResult {
  // Estimate metrics from HTML analysis
  const htmlSize = html.length;
  const scriptCount = $("script").length;
  const stylesheetCount = $('link[rel="stylesheet"]').length;
  const imageCount = $("img").length;
  const iframeCount = $("iframe").length;
  const thirdPartyScripts = $("script[src]").filter((_, el) => {
    const src = $(el).attr("src") || "";
    return src.startsWith("http") && !src.includes("//localhost");
  }).length;

  // Inline script size
  let inlineScriptSize = 0;
  $("script:not([src])").each((_, el) => {
    inlineScriptSize += $(el).text().length;
  });

  // Estimate FCP (ms): base 800ms + penalties
  const estimatedFCP = Math.round(
    800 +
    (stylesheetCount * 100) +
    (htmlSize > 100000 ? 300 : htmlSize > 50000 ? 150 : 0) +
    (scriptCount > 10 ? 200 : 0)
  );

  // Estimate LCP (ms): base 1200ms + penalties
  const estimatedLCP = Math.round(
    1200 +
    (stylesheetCount * 120) +
    (imageCount > 20 ? 400 : imageCount > 10 ? 200 : 0) +
    (iframeCount * 300) +
    (thirdPartyScripts * 80) +
    (htmlSize > 200000 ? 500 : htmlSize > 100000 ? 200 : 0)
  );

  // Estimate TBT (ms): base 100ms + penalties for JS
  const estimatedTBT = Math.round(
    100 +
    (thirdPartyScripts * 60) +
    (inlineScriptSize > 50000 ? 300 : inlineScriptSize > 20000 ? 150 : 0) +
    (scriptCount > 15 ? 200 : scriptCount > 8 ? 100 : 0) +
    (iframeCount * 100)
  );

  // Estimate CLS: base 0.02 + penalties for missing dimensions
  const imagesWithoutDimensions = $("img").filter((_, el) => !$(el).attr("width") || !$(el).attr("height")).length;
  const estimatedCLS = Math.min(1,
    0.02 +
    (imagesWithoutDimensions * 0.03) +
    (iframeCount * 0.05) +
    ($('link[rel="stylesheet"]').filter((_, el) => !$(el).attr("media")).length > 3 ? 0.05 : 0)
  );

  // Estimate SI (ms): roughly correlated with FCP and visual completeness
  const estimatedSI = Math.round(estimatedFCP * 1.3 + (imageCount > 15 ? 500 : 0));

  // Calculate individual scores using Lighthouse log-normal
  const fcpScore = lighthouseLogNormalScore(estimatedFCP, METRIC_PARAMS.fcp.median, METRIC_PARAMS.fcp.p10);
  const lcpScore = lighthouseLogNormalScore(estimatedLCP, METRIC_PARAMS.lcp.median, METRIC_PARAMS.lcp.p10);
  const tbtScore = lighthouseLogNormalScore(estimatedTBT, METRIC_PARAMS.tbt.median, METRIC_PARAMS.tbt.p10);
  const clsScore = lighthouseLogNormalScore(estimatedCLS, METRIC_PARAMS.cls.median, METRIC_PARAMS.cls.p10);
  const siScore = lighthouseLogNormalScore(estimatedSI, METRIC_PARAMS.si.median, METRIC_PARAMS.si.p10);

  // Weighted score: TBT*0.30 + LCP*0.25 + CLS*0.25 + FCP*0.10 + SI*0.10
  const overall = Math.round(
    tbtScore * 0.30 +
    lcpScore * 0.25 +
    clsScore * 0.25 +
    fcpScore * 0.10 +
    siScore * 0.10
  );

  return {
    overall,
    estimatedLCP,
    estimatedFCP,
    estimatedTBT,
    estimatedCLS,
    estimatedSI,
    breakdown: { tbtScore, lcpScore, clsScore, fcpScore, siScore },
  };
}

// ─── 6. CDN & Caching Detection ───

function analyzeCdnCaching($: cheerio.CheerioAPI, html: string, headers?: Record<string, string>): CdnCachingResult {
  const details: string[] = [];

  // Detect CDN from resource URLs
  let usesCdn = false;
  let cdnProvider: string | null = null;
  const detectedCdns = new Set<string>();

  const allUrls: string[] = [];
  $("script[src], link[href], img[src]").each((_, el) => {
    const url = $(el).attr("src") || $(el).attr("href") || "";
    allUrls.push(url);
  });

  for (const url of allUrls) {
    for (const { pattern, provider } of CDN_PATTERNS) {
      if (pattern.test(url)) {
        detectedCdns.add(provider);
        usesCdn = true;
      }
    }
  }

  // Also check response headers if available
  let hasCacheHeaders = false;
  if (headers) {
    const server = headers["server"] || headers["Server"] || "";
    for (const { pattern, provider } of CDN_PATTERNS) {
      if (pattern.test(server)) {
        detectedCdns.add(provider);
        usesCdn = true;
      }
    }

    hasCacheHeaders = !!(headers["cache-control"] || headers["Cache-Control"] ||
      headers["etag"] || headers["ETag"] ||
      headers["x-cache"] || headers["X-Cache"]);
  }

  // Detect CDN hints in HTML meta/headers
  if (html.includes("cdn-cgi") || html.includes("__cf_")) {
    detectedCdns.add("Cloudflare");
    usesCdn = true;
  }

  if (detectedCdns.size > 0) {
    cdnProvider = Array.from(detectedCdns).join(", ");
    details.push(`CDN detekováno: ${cdnProvider}`);
  } else {
    details.push("Žádné CDN nebylo detekováno — zvažte použití CDN pro statické soubory");
  }

  // Check for cache hints in HTML
  const staticAssetsCached = $('link[rel="stylesheet"][href*="?v="], link[rel="stylesheet"][href*="hash"], script[src*="?v="], script[src*="chunk"]').length > 0;
  if (staticAssetsCached) {
    details.push("Statické soubory mají cache-busting parametry — dobře");
  }

  if (hasCacheHeaders) {
    details.push("Cache hlavičky jsou nastaveny");
  }

  return { usesCdn, cdnProvider, hasCacheHeaders, staticAssetsCached, details };
}

// ─── 7. Mobile Optimization ───

function analyzeMobileOptimization($: cheerio.CheerioAPI, html: string): MobileOptimizationResult {
  const details: string[] = [];

  // Viewport meta
  const viewportContent = $('meta[name="viewport"]').attr("content") || "";
  const hasViewport = viewportContent.length > 0;
  const viewportCorrect = viewportContent.includes("width=device-width");

  if (!hasViewport) {
    details.push("Chybí viewport meta tag — stránka nebude responzivní na mobilu");
  } else if (!viewportCorrect) {
    details.push("Viewport meta tag nemá width=device-width");
  } else {
    details.push("Viewport meta tag je správně nastaven");
  }

  // Touch targets — check for buttons/links with small size
  const hasTouchTargets = $('button, a[class*="btn"], a[class*="button"], input[type="submit"]').length > 0;

  // Responsive images
  const usesResponsiveImages = $("img[srcset], picture source").length > 0;
  if (usesResponsiveImages) {
    details.push("Responzivní obrázky (srcset/picture) jsou použity");
  } else if ($("img").length > 0) {
    details.push("Chybí responzivní obrázky — na mobilu se stahují zbytečně velké soubory");
  }

  // Media queries detection
  let usesMediaQueries = false;
  $("style").each((_, el) => {
    if ($(el).text().includes("@media")) {
      usesMediaQueries = true;
    }
  });
  // Also check for responsive framework classes
  if (html.includes("@media") || html.includes("col-md-") || html.includes("sm:") || html.includes("md:") || html.includes("lg:")) {
    usesMediaQueries = true;
  }
  if (usesMediaQueries) {
    details.push("Media queries / responzivní framework detekován");
  } else {
    details.push("Žádné media queries — stránka pravděpodobně není responzivní");
  }

  // Font size readability
  let fontSizeReadable = true;
  $("style").each((_, el) => {
    const css = $(el).text();
    // Check for very small font sizes
    const smallFonts = css.match(/font-size:\s*(8|9|10)px/g);
    if (smallFonts && smallFonts.length > 3) {
      fontSizeReadable = false;
    }
  });

  if (!fontSizeReadable) {
    details.push("Příliš malé písmo nalezeno — na mobilních zařízeních bude nečitelné");
  }

  // Check for tap-to-call
  const hasTelLinks = $('a[href^="tel:"]').length > 0;
  if (hasTelLinks) {
    details.push("Telefonní odkazy (tap-to-call) nalezeny — dobré pro mobilní UX");
  }

  return { hasViewport, viewportCorrect, hasTouchTargets, usesResponsiveImages, usesMediaQueries, fontSizeReadable, details };
}

// ─── 8. Compression Detection ───

function analyzeCompression($: cheerio.CheerioAPI, html: string): CompressionDetectionResult {
  const details: string[] = [];

  // Detect if text is likely compressed (we can only check HTML content characteristics)
  // Actual compression is a server-side feature, so we estimate from content
  const totalUncompressedSize = html.length;

  // Check for minified CSS
  let minifiedCss = true;
  let cssContent = "";
  $("style").each((_, el) => {
    cssContent += $(el).text();
  });
  if (cssContent.length > 500) {
    // Heuristic: minified CSS has very few newlines relative to size
    const newlineRatio = (cssContent.match(/\n/g)?.length || 0) / cssContent.length;
    minifiedCss = newlineRatio < 0.02;
  }

  // Check for minified inline JS
  let minifiedJs = true;
  let jsContent = "";
  $("script:not([src])").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 200) {
      jsContent += text;
    }
  });
  if (jsContent.length > 500) {
    const newlineRatio = (jsContent.match(/\n/g)?.length || 0) / jsContent.length;
    minifiedJs = newlineRatio < 0.02;
  }

  // Check for minified HTML (approximate)
  const htmlNewlineRatio = (html.match(/\n/g)?.length || 0) / html.length;
  const textCompression = htmlNewlineRatio < 0.015;

  if (textCompression) {
    details.push("HTML je pravděpodobně minifikovaný");
  } else {
    details.push("HTML není minifikovaný — zbytečně velký přenos");
  }

  if (cssContent.length > 0) {
    if (minifiedCss) {
      details.push("Inline CSS je minifikovaný");
    } else {
      details.push("Inline CSS není minifikovaný — zvažte minifikaci");
    }
  }

  if (jsContent.length > 0) {
    if (minifiedJs) {
      details.push("Inline JS je minifikovaný");
    } else {
      details.push("Inline JS není minifikovaný — zvažte minifikaci");
    }
  }

  const sizeMB = totalUncompressedSize / (1024 * 1024);
  if (sizeMB > 2) {
    details.push(`Celková velikost HTML: ${sizeMB.toFixed(1)} MB — příliš velké`);
  } else if (sizeMB > 0.5) {
    details.push(`Celková velikost HTML: ${Math.round(totalUncompressedSize / 1024)} KB — zvažte optimalizaci`);
  } else {
    details.push(`Celková velikost HTML: ${Math.round(totalUncompressedSize / 1024)} KB`);
  }

  return { textCompression, minifiedCss, minifiedJs, totalUncompressedSize, details };
}

// ─── Merge Real PageSpeed Metrics with HTML Estimation ───

/**
 * Merges real Lighthouse PageSpeed data with HTML-based performance estimation.
 * Real metrics take PRIORITY, but HTML-based findings (image optimization,
 * font loading, third-party detection) are still valuable.
 * Deduplicates findings by title.
 */
export function mergeWithRealMetrics(
  htmlMeasurement: PerformanceMeasurement,
  psData: PageSpeedResult,
  htmlFindings: Finding[]
): { score: number; findings: Finding[] } {
  const findings: Finding[] = [];

  // ── Real Lighthouse audit findings (PRIORITY) ──
  for (const audit of psData.audits) {
    const severity: Finding["severity"] =
      audit.score !== null && audit.score < 0.5 ? "critical" :
      audit.score !== null && audit.score < 0.9 ? "warning" : "info";

    findings.push({
      category: "performance",
      severity,
      title: audit.titleCz,
      description: audit.displayValue
        ? `${audit.title}: ${audit.displayValue}`
        : audit.title,
    });
  }

  // ── Core Web Vitals findings from real data ──
  const m = psData.metrics;

  if (m.lcp > 4000) {
    findings.push({ category: "performance", severity: "critical", title: "Pomalý LCP", description: `Largest Contentful Paint: ${(m.lcp / 1000).toFixed(1)}s. Cíl: pod 2.5s.` });
  } else if (m.lcp > 2500) {
    findings.push({ category: "performance", severity: "warning", title: "LCP potřebuje zlepšení", description: `LCP: ${(m.lcp / 1000).toFixed(1)}s. Cíl: pod 2.5s.` });
  } else {
    findings.push({ category: "performance", severity: "ok", title: "Dobrý LCP", description: `LCP: ${(m.lcp / 1000).toFixed(1)}s — rychlé.` });
  }

  if (m.cls > 0.25) {
    findings.push({ category: "performance", severity: "critical", title: "Vysoký posun obsahu (CLS)", description: `CLS: ${m.cls.toFixed(3)}. Cíl: pod 0.1.` });
  } else if (m.cls > 0.1) {
    findings.push({ category: "performance", severity: "warning", title: "CLS potřebuje zlepšení", description: `CLS: ${m.cls.toFixed(3)}. Cíl: pod 0.1.` });
  }

  if (m.fcp > 3000) {
    findings.push({ category: "performance", severity: "warning", title: "Pomalý First Paint", description: `FCP: ${(m.fcp / 1000).toFixed(1)}s. Uživatel vidí prázdnou stránku příliš dlouho.` });
  }

  if (m.tbt > 600) {
    findings.push({ category: "performance", severity: "warning", title: "Vysoký Total Blocking Time", description: `TBT: ${Math.round(m.tbt)}ms. Stránka působí neresponzivně.` });
  }

  // ── HTML-based findings that real Lighthouse doesn't cover well ──
  // Image optimization details, font loading, third-party detection
  const realTitles = new Set(findings.map(f => f.title));

  // Categories unique to HTML analysis
  const valuableHtmlCategories = new Set([
    // Image details from HTML analysis
    "imageOptimization",
    "fontOptimization",
    "thirdPartyImpact",
  ]);

  for (const hf of htmlFindings) {
    if (realTitles.has(hf.title)) continue; // Skip duplicates
    // Keep HTML-based findings from valuable categories or if they have unique titles
    if (valuableHtmlCategories.has(hf.category) || !realTitles.has(hf.title)) {
      realTitles.add(hf.title);
      findings.push(hf);
    }
  }

  // Score: 70% real Lighthouse, 30% HTML estimation
  const score = Math.round(psData.score * 0.7 + htmlMeasurement.performanceScore.overall * 0.3);

  return { score, findings };
}
