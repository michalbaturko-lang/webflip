/**
 * Comprehensive Data Extraction Engine for Webflipper Analysis
 *
 * Extracts 150+ data points per page across 9 categories:
 * Performance, On-Page SEO, Technical SEO, Content Quality,
 * Accessibility, Site Structure, Image Analysis, Security, AI/LLM Visibility
 */

import * as cheerio from "cheerio";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EngineFinding {
  id: string;
  severity: "error" | "warning" | "notice";
  category:
    | "performance"
    | "seo"
    | "security"
    | "accessibility"
    | "content"
    | "structure"
    | "images"
    | "ai-visibility";
  title: string;
  description: string;
  impact: number; // 1-10
  effort: number; // 1-10
}

export interface PerformanceData {
  htmlSizeBytes: number;
  totalResourceSizeEstimate: number;
  externalScriptCount: number;
  externalStylesheetCount: number;
  inlineCssSizeBytes: number;
  inlineJsSizeBytes: number;
  renderBlockingScripts: number;
  imageCount: number;
  totalImageSizeEstimate: number;
  lazyLoadingCount: number;
  preloadHints: number;
  prefetchHints: number;
  httpVersion: string | null;
  compressionDetected: string | null;
  cacheControlPresent: boolean;
  cacheControlValue: string | null;
  cdnDetected: string | null;
  aboveFoldImageOptimized: boolean;
  criticalCssDetected: boolean;
  fontDisplayUsed: boolean;
  thirdPartyScriptCount: number;
}

export interface OnPageSeoData {
  titlePresent: boolean;
  titleLength: number;
  titleContent: string;
  metaDescriptionPresent: boolean;
  metaDescriptionLength: number;
  metaDescriptionContent: string;
  h1Present: boolean;
  h1Count: number;
  h1Content: string;
  headingHierarchy: { level: number; text: string }[];
  headingHierarchyValid: boolean;
  h2Count: number;
  h3Count: number;
  h4Count: number;
  h5Count: number;
  h6Count: number;
  canonicalPresent: boolean;
  canonicalUrl: string | null;
  canonicalSelfReferencing: boolean;
  hreflangTags: { lang: string; url: string }[];
  robotsMetaContent: string | null;
  hasNoindex: boolean;
  hasNofollow: boolean;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogUrl: string | null;
  twitterCard: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
  schemaTypes: string[];
  schemaJsonLdCount: number;
  sitemapReference: boolean;
  urlLength: number;
  urlHasKeywords: boolean;
  urlHasSpecialChars: boolean;
  internalLinkCount: number;
  externalLinkCount: number;
  nofollowLinkCount: number;
  contentWordCount: number;
  topKeywords: { word: string; count: number; density: number }[];
  viewportPresent: boolean;
  viewportContent: string | null;
  langAttribute: string | null;
  imageAltCoverage: number;
  imagesWithAlt: number;
  imagesWithEmptyAlt: number;
  imagesWithoutAlt: number;
  breadcrumbMarkup: boolean;
  faqMarkup: boolean;
  socialMediaLinks: string[];
}

export interface TechnicalSeoData {
  httpsEnabled: boolean;
  mixedContentCount: number;
  mixedContentUrls: string[];
  serverResponseCode: number | null;
  serverType: string | null;
  xRobotsTag: string | null;
  contentType: string | null;
  responseTimeMs: number | null;
  redirectDetected: boolean;
  redirectType: string | null;
  metaRefreshDetected: boolean;
  jsRedirectDetected: boolean;
  has404Page: boolean;
  urlParameterCount: number;
  trailingSlash: boolean;
  mobileViewportValid: boolean;
  ampDetected: boolean;
  serviceWorkerDetected: boolean;
  brokenInternalLinks: string[];
  orphanPages: string[];
}

export interface ContentQualityData {
  wordCount: number;
  sentenceCount: number;
  averageSentenceLength: number;
  readabilityScore: number;
  isThinContent: boolean;
  headingToContentRatio: number;
  listUsageCount: number;
  tableUsageCount: number;
  mediaRichness: number;
  textToHtmlRatio: number;
  faqPresent: boolean;
  testimonialPresent: boolean;
  pricingPresent: boolean;
  contactInfoPresent: boolean;
  ctaCount: number;
  ctaInHero: boolean;
  authorInfoPresent: boolean;
  aboutPageLinked: boolean;
  contactPageLinked: boolean;
  outboundAuthorityLinks: number;
  contentFreshnessYear: number | null;
  duplicateContentHash: string;
}

export interface AccessibilityData {
  imageAltPresent: number;
  imageAltMissing: number;
  formLabelCount: number;
  formInputCount: number;
  formLabelAssociation: number;
  ariaLandmarks: string[];
  ariaAttributeCount: number;
  semanticElements: {
    header: number;
    nav: number;
    main: number;
    footer: number;
    article: number;
    section: number;
    aside: number;
  };
  headingHierarchyValid: boolean;
  skippedHeadingLevels: number[];
  badLinkTexts: string[];
  langDeclared: boolean;
  skipNavPresent: boolean;
  focusVisibleIssues: boolean;
  fontSizeBase: number | null;
  lineHeightBase: number | null;
  tabIndexIssues: number;
  colorContrastEstimates: { ratio: number; passes: boolean }[];
}

export interface SiteStructureData {
  pageType: string;
  headerNavLinks: { text: string; href: string }[];
  footerNavLinks: { text: string; href: string }[];
  breadcrumbPresent: boolean;
  paginationDetected: boolean;
  infiniteScrollDetected: boolean;
  searchFunctionalityPresent: boolean;
  pageCountEstimate: number;
  multiLanguageStructure: string | null;
  mobileNavPattern: string | null;
  socialProofElements: number;
  urlDirectoryDepth: number;
}

export interface ImageAnalysisData {
  totalCount: number;
  withAlt: number;
  withEmptyAlt: number;
  withoutAlt: number;
  oversizedImages: string[];
  modernFormatCount: number;
  responsiveImageCount: number;
  lazyLoadedCount: number;
  heroImageDetected: boolean;
  heroImageUrl: string | null;
  logoDetected: boolean;
  iconCount: number;
  backgroundImageCount: number;
  withDimensionAttributes: number;
  withFetchPriority: number;
}

export interface SecurityData {
  httpsEnabled: boolean;
  hstsPresent: boolean;
  hstsValue: string | null;
  cspPresent: boolean;
  cspValue: string | null;
  xFrameOptionsPresent: boolean;
  xFrameOptionsValue: string | null;
  xContentTypeOptionsPresent: boolean;
  referrerPolicyPresent: boolean;
  referrerPolicyValue: string | null;
  permissionsPolicyPresent: boolean;
  mixedContentCount: number;
  cookieSecurityFlags: { secure: boolean; sameSite: boolean; httpOnly: boolean }[];
  exposedServerVersion: boolean;
  serverHeader: string | null;
}

export interface AiVisibilityData {
  llmsTxtDetected: boolean;
  schemaRichness: number;
  schemaTypes: string[];
  semanticHtmlScore: number;
  contentStructureClarity: number;
  keywordStuffingDetected: boolean;
  faqSchemaPresent: boolean;
  howToSchemaPresent: boolean;
  articleSchemaPresent: boolean;
  cleanUrlStructure: boolean;
  metadataCompletenessScore: number;
}

export interface PageAnalysis {
  url: string;
  fetchedAt: string;
  performance: PerformanceData;
  onPageSeo: OnPageSeoData;
  technicalSeo: TechnicalSeoData;
  contentQuality: ContentQualityData;
  accessibility: AccessibilityData;
  siteStructure: SiteStructureData;
  imageAnalysis: ImageAnalysisData;
  security: SecurityData;
  aiVisibility: AiVisibilityData;
}

export interface SiteAnalysis {
  url: string;
  analyzedAt: string;
  pageCount: number;
  pages: PageAnalysis[];
  aggregated: {
    avgWordCount: number;
    avgReadabilityScore: number;
    totalImageCount: number;
    totalImagesWithAlt: number;
    altCoveragePercent: number;
    uniqueTitles: number;
    uniqueDescriptions: number;
    duplicateTitles: string[];
    duplicateDescriptions: string[];
    schemaTypesUsed: string[];
    avgTextToHtmlRatio: number;
    totalInternalLinks: number;
    totalExternalLinks: number;
    contentHashMap: Map<string, string[]>;
    duplicateContentPages: string[][];
    pageTypes: Record<string, number>;
    avgPerformanceMetrics: Partial<PerformanceData>;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-záčďéěíňóřšťúůýž]/g, "");
  if (word.length <= 3) return 1;
  // Simple English syllable heuristic
  let count = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .match(/[aeiouy]{1,2}/g);
  return count ? count.length : 1;
}

function simHash(text: string): string {
  // Tokenize into 3-word shingles
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if (words.length < 3) return "0".repeat(64);
  
  const bits = new Array(64).fill(0);
  
  for (let i = 0; i <= words.length - 3; i++) {
    const shingle = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    const hash = fnv1a64(shingle);
    for (let j = 0; j < 64; j++) {
      if ((hash[j >> 5] >>> (j & 31)) & 1) {
        bits[j]++;
      } else {
        bits[j]--;
      }
    }
  }
  
  // Convert to binary string
  return bits.map(b => (b >= 0 ? "1" : "0")).join("");
}

function fnv1a64(str: string): [number, number] {
  let h0 = 0x811c9dc5;
  let h1 = 0xcbf29ce4;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h0 ^= c;
    h1 ^= c;
    h0 = Math.imul(h0, 0x01000193);
    h1 = Math.imul(h1, 0x01000193);
  }
  return [h0 >>> 0, h1 >>> 0];
}

function hammingDistance(a: string, b: string): number {
  let distance = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) distance++;
  }
  return distance;
}

function extractTextColors($: cheerio.CheerioAPI): { fg: string; bg: string }[] {
  const pairs: { fg: string; bg: string }[] = [];
  const colorRegex = /#([0-9a-fA-F]{3,8})|rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)|rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
  
  $("[style]").each((_, el) => {
    const style = $(el).attr("style") || "";
    const colors: string[] = [];
    let match;
    while ((match = colorRegex.exec(style)) !== null) {
      colors.push(match[0]);
    }
    if (colors.length >= 2) {
      pairs.push({ fg: colors[0], bg: colors[1] });
    }
  });
  return pairs;
}

function hexToRgb(hex: string): [number, number, number] | null {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
  if (hex.length !== 6) return null;
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const AUTHORITY_DOMAINS = [
  "wikipedia.org", "gov.", ".edu", "who.int", "nih.gov",
  "cdc.gov", "nature.com", "sciencedirect.com", "pubmed",
  "bbc.com", "reuters.com", "nytimes.com", "theguardian.com",
];

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "that", "this", "are", "was",
  "be", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "shall", "can", "not", "no",
  "all", "each", "every", "both", "few", "more", "most", "other",
  "some", "such", "than", "too", "very", "just", "also", "about",
  "na", "se", "je", "ve", "za", "od", "do", "pro", "jak", "jsou",
  "jako", "tak", "ale", "kde", "kdy", "co", "ten", "ten",
  "und", "der", "die", "das", "ein", "eine", "ist", "mit", "von",
  "für", "auf", "den", "dem", "des", "nicht", "ich", "sie", "wir",
]);

// ─── Page Analysis ────────────────────────────────────────────────────────────

export function analyzePage(
  html: string,
  url: string,
  headers: Record<string, string> = {}
): PageAnalysis {
  const $ = cheerio.load(html);
  const bodyText = $("body").text();
  const parsedUrl = new URL(url);

  return {
    url,
    fetchedAt: new Date().toISOString(),
    performance: extractPerformance($, html, headers),
    onPageSeo: extractOnPageSeo($, html, url, bodyText),
    technicalSeo: extractTechnicalSeo($, html, url, headers),
    contentQuality: extractContentQuality($, html, bodyText),
    accessibility: extractAccessibility($, html),
    siteStructure: extractSiteStructure($, html, url),
    imageAnalysis: extractImageAnalysis($),
    security: extractSecurity($, url, headers),
    aiVisibility: extractAiVisibility($, html, url),
  };
}

// ─── 1. Performance Extraction ────────────────────────────────────────────────

function extractPerformance(
  $: cheerio.CheerioAPI,
  html: string,
  headers: Record<string, string>
): PerformanceData {
  const htmlSize = new TextEncoder().encode(html).length;

  // External scripts
  const externalScripts = $("script[src]");
  const externalStylesheets = $("link[rel='stylesheet']");

  // Inline CSS size
  let inlineCssSize = 0;
  $("style").each((_, el) => {
    inlineCssSize += new TextEncoder().encode($(el).text()).length;
  });
  $("[style]").each((_, el) => {
    inlineCssSize += new TextEncoder().encode($(el).attr("style") || "").length;
  });

  // Inline JS size
  let inlineJsSize = 0;
  $("script:not([src])").each((_, el) => {
    inlineJsSize += new TextEncoder().encode($(el).text()).length;
  });

  // Render-blocking scripts (in head, no async/defer)
  const renderBlocking = $("head script[src]").filter((_, el) => {
    return !$(el).attr("async") && !$(el).attr("defer");
  }).length;

  // Images
  const images = $("img");
  const imageCount = images.length;
  let totalImageSizeEstimate = 0;
  images.each((_, el) => {
    // Rough estimate: avg web image ~100KB, larger if no srcset
    totalImageSizeEstimate += $(el).attr("srcset") ? 50000 : 100000;
  });

  // Lazy loading
  const lazyLoadCount = $("img[loading='lazy'], iframe[loading='lazy']").length;

  // Preload/prefetch
  const preloads = $("link[rel='preload']").length;
  const prefetches = $("link[rel='prefetch'], link[rel='dns-prefetch']").length;

  // HTTP version from headers
  const httpVersion = headers["x-http-version"] || null;

  // Compression
  const contentEncoding = headers["content-encoding"] || null;

  // Cache-Control
  const cacheControl = headers["cache-control"] || null;

  // CDN detection
  let cdn: string | null = null;
  const serverHeader = (headers["server"] || "").toLowerCase();
  const via = (headers["via"] || "").toLowerCase();
  const cdnHeaders = [
    headers["x-cdn"], headers["x-served-by"], headers["x-cache"],
    headers["cf-ray"], headers["x-vercel-id"], headers["x-amz-cf-id"],
  ].filter(Boolean);

  if (headers["cf-ray"]) cdn = "Cloudflare";
  else if (headers["x-vercel-id"]) cdn = "Vercel";
  else if (headers["x-amz-cf-id"] || via.includes("cloudfront")) cdn = "CloudFront";
  else if (serverHeader.includes("netlify")) cdn = "Netlify";
  else if (via.includes("akamai") || serverHeader.includes("akamai")) cdn = "Akamai";
  else if (headers["x-fastly-request-id"]) cdn = "Fastly";
  else if (cdnHeaders.length > 0) cdn = "Unknown CDN";

  // Above-fold image optimization - check if first image has fetchpriority or is preloaded
  const firstImg = $("img").first();
  const aboveFoldOptimized = firstImg.attr("fetchpriority") === "high" ||
    $("link[rel='preload'][as='image']").length > 0;

  // Critical CSS: check for inline style in head or preload CSS
  const criticalCss = $("head style").length > 0 ||
    $("link[rel='preload'][as='style']").length > 0;

  // Font display
  const fontDisplay = html.includes("font-display:") ||
    html.includes("font-display :") ||
    $("link[rel='preload'][as='font']").length > 0;

  // Third-party scripts
  const pageHost = new URL("https://placeholder.com").hostname;
  let thirdPartyCount = 0;
  externalScripts.each((_, el) => {
    const src = $(el).attr("src") || "";
    try {
      const scriptHost = new URL(src, "https://placeholder.com").hostname;
      if (scriptHost !== pageHost && !src.startsWith("/")) thirdPartyCount++;
    } catch { /* skip */ }
  });

  return {
    htmlSizeBytes: htmlSize,
    totalResourceSizeEstimate: htmlSize + inlineCssSize + inlineJsSize + totalImageSizeEstimate,
    externalScriptCount: externalScripts.length,
    externalStylesheetCount: externalStylesheets.length,
    inlineCssSizeBytes: inlineCssSize,
    inlineJsSizeBytes: inlineJsSize,
    renderBlockingScripts: renderBlocking,
    imageCount,
    totalImageSizeEstimate,
    lazyLoadingCount: lazyLoadCount,
    preloadHints: preloads,
    prefetchHints: prefetches,
    httpVersion,
    compressionDetected: contentEncoding,
    cacheControlPresent: !!cacheControl,
    cacheControlValue: cacheControl,
    cdnDetected: cdn,
    aboveFoldImageOptimized: aboveFoldOptimized,
    criticalCssDetected: criticalCss,
    fontDisplayUsed: fontDisplay,
    thirdPartyScriptCount: thirdPartyCount,
  };
}

// ─── 2. On-Page SEO Extraction ────────────────────────────────────────────────

function extractOnPageSeo(
  $: cheerio.CheerioAPI,
  html: string,
  url: string,
  bodyText: string
): OnPageSeoData {
  // Title
  const title = $("title").text().trim();
  
  // Meta description
  const metaDesc = $('meta[name="description"]').attr("content")?.trim() || "";

  // H1
  const h1s = $("h1");
  const h1Content = h1s.first().text().trim();

  // Heading hierarchy
  const headings: { level: number; text: string }[] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    headings.push({
      level: parseInt(el.tagName.replace("h", "")),
      text: $(el).text().trim().slice(0, 100),
    });
  });

  let hierarchyValid = true;
  let prevLevel = 0;
  for (const h of headings) {
    if (h.level > prevLevel + 1 && prevLevel > 0) {
      hierarchyValid = false;
      break;
    }
    prevLevel = h.level;
  }

  // Canonical
  const canonical = $('link[rel="canonical"]').attr("href") || null;
  const canonicalSelf = canonical ? (
    canonical === url ||
    canonical === url.replace(/\/$/, "") ||
    canonical === url + "/"
  ) : false;

  // Hreflang
  const hreflangTags: { lang: string; url: string }[] = [];
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const lang = $(el).attr("hreflang") || "";
    const href = $(el).attr("href") || "";
    if (lang && href) hreflangTags.push({ lang, url: href });
  });

  // Robots meta
  const robotsMeta = $('meta[name="robots"]').attr("content") || null;
  const hasNoindex = robotsMeta?.toLowerCase().includes("noindex") || false;
  const hasNofollow = robotsMeta?.toLowerCase().includes("nofollow") || false;

  // Open Graph
  const ogTitle = $('meta[property="og:title"]').attr("content") || null;
  const ogDescription = $('meta[property="og:description"]').attr("content") || null;
  const ogImage = $('meta[property="og:image"]').attr("content") || null;
  const ogUrl = $('meta[property="og:url"]').attr("content") || null;

  // Twitter Card
  const twitterCard = $('meta[name="twitter:card"]').attr("content") || null;
  const twitterTitle = $('meta[name="twitter:title"]').attr("content") || null;
  const twitterDescription = $('meta[name="twitter:description"]').attr("content") || null;
  const twitterImage = $('meta[name="twitter:image"]').attr("content") || null;

  // Schema.org / JSON-LD
  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      if (data["@type"]) schemaTypes.push(data["@type"]);
      if (Array.isArray(data["@graph"])) {
        for (const item of data["@graph"]) {
          if (item["@type"]) schemaTypes.push(item["@type"]);
        }
      }
    } catch { /* skip */ }
  });

  // Sitemap reference
  const sitemapRef = html.includes("sitemap") &&
    ($('link[rel="sitemap"]').length > 0 || html.includes("sitemap.xml"));

  // URL analysis
  const parsedUrl = new URL(url);
  const urlPath = parsedUrl.pathname;
  const urlSpecialChars = /[!@#$%^&*()+=[\]{}|\\:;"'<>,?]/.test(urlPath);

  // Links
  let internalLinks = 0;
  let externalLinks = 0;
  let nofollowLinks = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const rel = $(el).attr("rel") || "";
    if (href.startsWith("/") || href.startsWith(url) || href.startsWith("#")) {
      internalLinks++;
    } else if (href.startsWith("http")) {
      externalLinks++;
    }
    if (rel.includes("nofollow")) nofollowLinks++;
  });

  // Word count and keyword density
  const words = bodyText.split(/\s+/).filter(w => w.length > 2);
  const wordCount = words.length;

  const wordFreq: Record<string, number> = {};
  for (const w of words) {
    const lower = w.toLowerCase().replace(/[^a-záčďéěíňóřšťúůýžäöüß\w]/g, "");
    if (lower.length < 3 || STOP_WORDS.has(lower)) continue;
    wordFreq[lower] = (wordFreq[lower] || 0) + 1;
  }
  const topKeywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({
      word,
      count,
      density: Math.round((count / Math.max(wordCount, 1)) * 10000) / 100,
    }));

  // Viewport
  const viewport = $('meta[name="viewport"]').attr("content") || null;

  // Lang
  const lang = $("html").attr("lang") || null;

  // Image alt coverage
  const totalImages = $("img").length;
  let withAlt = 0;
  let emptyAlt = 0;
  let noAlt = 0;
  $("img").each((_, el) => {
    const alt = $(el).attr("alt");
    if (alt === undefined) noAlt++;
    else if (alt.trim() === "") emptyAlt++;
    else withAlt++;
  });
  const altCoverage = totalImages > 0
    ? Math.round((withAlt / totalImages) * 100)
    : 100;

  // Breadcrumb
  const breadcrumb = $('[itemtype*="BreadcrumbList"]').length > 0 ||
    $("[class*='breadcrumb']").length > 0 ||
    schemaTypes.includes("BreadcrumbList");

  // FAQ markup
  const faqMarkup = schemaTypes.includes("FAQPage") ||
    $('[itemtype*="FAQPage"]').length > 0;

  // Social media links
  const socialPatterns = ["facebook.com", "instagram.com", "twitter.com", "x.com",
    "linkedin.com", "youtube.com", "tiktok.com", "pinterest.com"];
  const socialLinks: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    for (const pattern of socialPatterns) {
      if (href.includes(pattern) && !socialLinks.includes(href)) {
        socialLinks.push(href);
      }
    }
  });

  return {
    titlePresent: title.length > 0,
    titleLength: title.length,
    titleContent: title,
    metaDescriptionPresent: metaDesc.length > 0,
    metaDescriptionLength: metaDesc.length,
    metaDescriptionContent: metaDesc,
    h1Present: h1s.length > 0,
    h1Count: h1s.length,
    h1Content,
    headingHierarchy: headings,
    headingHierarchyValid: hierarchyValid,
    h2Count: $("h2").length,
    h3Count: $("h3").length,
    h4Count: $("h4").length,
    h5Count: $("h5").length,
    h6Count: $("h6").length,
    canonicalPresent: !!canonical,
    canonicalUrl: canonical,
    canonicalSelfReferencing: canonicalSelf,
    hreflangTags,
    robotsMetaContent: robotsMeta,
    hasNoindex,
    hasNofollow,
    ogTitle,
    ogDescription,
    ogImage,
    ogUrl,
    twitterCard,
    twitterTitle,
    twitterDescription,
    twitterImage,
    schemaTypes,
    schemaJsonLdCount: $('script[type="application/ld+json"]').length,
    sitemapReference: sitemapRef,
    urlLength: url.length,
    urlHasKeywords: /[a-z]/.test(urlPath) && urlPath.length > 1,
    urlHasSpecialChars: urlSpecialChars,
    internalLinkCount: internalLinks,
    externalLinkCount: externalLinks,
    nofollowLinkCount: nofollowLinks,
    contentWordCount: wordCount,
    topKeywords,
    viewportPresent: !!viewport,
    viewportContent: viewport,
    langAttribute: lang,
    imageAltCoverage: altCoverage,
    imagesWithAlt: withAlt,
    imagesWithEmptyAlt: emptyAlt,
    imagesWithoutAlt: noAlt,
    breadcrumbMarkup: breadcrumb,
    faqMarkup,
    socialMediaLinks: socialLinks,
  };
}

// ─── 3. Technical SEO Extraction ──────────────────────────────────────────────

function extractTechnicalSeo(
  $: cheerio.CheerioAPI,
  html: string,
  url: string,
  headers: Record<string, string>
): TechnicalSeoData {
  const parsedUrl = new URL(url);

  // HTTPS
  const httpsEnabled = parsedUrl.protocol === "https:";

  // Mixed content
  const mixedUrls: string[] = [];
  if (httpsEnabled) {
    $("img[src^='http:'], script[src^='http:'], link[href^='http:'], iframe[src^='http:']").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("href") || "";
      if (src.startsWith("http:")) mixedUrls.push(src);
    });
  }

  // Server info from headers
  const serverType = headers["server"] || null;
  const xRobotsTag = headers["x-robots-tag"] || null;
  const contentType = headers["content-type"] || null;

  // Meta refresh redirect
  const metaRefresh = $('meta[http-equiv="refresh"]').attr("content") || "";
  const metaRefreshDetected = metaRefresh.length > 0;

  // JS redirect detection
  let jsRedirect = false;
  $("script:not([src])").each((_, el) => {
    const text = $(el).text();
    if (text.includes("window.location") || text.includes("document.location") ||
        text.includes("location.href") || text.includes("location.replace")) {
      jsRedirect = true;
    }
  });

  // URL parameters
  const urlParams = parsedUrl.searchParams;
  const paramCount = Array.from(urlParams.keys()).length;

  // Trailing slash
  const trailingSlash = parsedUrl.pathname.endsWith("/") && parsedUrl.pathname.length > 1;

  // Mobile viewport
  const viewport = $('meta[name="viewport"]').attr("content") || "";
  const mobileValid = viewport.includes("width=device-width");

  // AMP
  const ampDetected = $("html[amp], html[⚡]").length > 0 ||
    $('link[rel="amphtml"]').length > 0;

  // Service Worker
  const swDetected = html.includes("serviceWorker") || html.includes("service-worker");

  return {
    httpsEnabled,
    mixedContentCount: mixedUrls.length,
    mixedContentUrls: mixedUrls.slice(0, 10),
    serverResponseCode: null, // Set externally from fetch response
    serverType,
    xRobotsTag,
    contentType,
    responseTimeMs: null, // Set externally from fetch timing
    redirectDetected: metaRefreshDetected || jsRedirect,
    redirectType: metaRefreshDetected ? "meta-refresh" : jsRedirect ? "javascript" : null,
    metaRefreshDetected,
    jsRedirectDetected: jsRedirect,
    has404Page: false, // Detected at site level
    urlParameterCount: paramCount,
    trailingSlash,
    mobileViewportValid: mobileValid,
    ampDetected,
    serviceWorkerDetected: swDetected,
    brokenInternalLinks: [], // Detected at site level
    orphanPages: [], // Detected at site level
  };
}

// ─── 4. Content Quality Extraction ────────────────────────────────────────────

function extractContentQuality(
  $: cheerio.CheerioAPI,
  html: string,
  bodyText: string
): ContentQualityData {
  // Clean body text
  const cleanText = bodyText.replace(/\s+/g, " ").trim();
  const words = cleanText.split(/\s+/).filter(w => w.length > 1);
  const wordCount = words.length;

  // Sentence detection
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const sentenceCount = Math.max(sentences.length, 1);
  const avgSentenceLength = wordCount / sentenceCount;

  // Readability (Flesch-Kincaid)
  let totalSyllables = 0;
  for (const word of words.slice(0, 2000)) {
    totalSyllables += countSyllables(word);
  }
  const syllablesPerWord = totalSyllables / Math.max(words.length, 1);
  const readabilityScore = Math.max(0, Math.min(100,
    206.835 - 1.015 * avgSentenceLength - 84.6 * syllablesPerWord
  ));

  // Thin content
  const isThin = wordCount < 300;

  // Heading to content ratio
  const headingCount = $("h1, h2, h3, h4, h5, h6").length;
  const headingRatio = headingCount / Math.max(wordCount / 100, 1);

  // Lists, tables, media
  const listCount = $("ul, ol").length;
  const tableCount = $("table").length;
  const mediaCount = $("img, video, audio, iframe").length;
  const mediaRichness = mediaCount / Math.max(wordCount / 500, 1);

  // Text-to-HTML ratio
  const htmlSize = new TextEncoder().encode(html).length;
  const textSize = new TextEncoder().encode(cleanText).length;
  const textToHtml = textSize / Math.max(htmlSize, 1);

  // FAQ
  const hasFaq = $("[class*='faq'], [id*='faq'], [class*='accordion'], details").length > 0;

  // Testimonials
  const hasTestimonials = $("[class*='testimonial'], [class*='review'], [class*='recenz'], blockquote").length > 0 ||
    /testimonial|review|recenze|hodnocení|bewertung/i.test(bodyText);

  // Pricing
  const hasPricing = $("[class*='pricing'], [class*='price'], [class*='cen']").length > 0 ||
    /pricing|ceník|cena|price|preis/i.test(bodyText);

  // Contact info
  const hasContact = /\+?\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/.test(bodyText) ||
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(bodyText);

  // CTAs
  const ctaElements = $("a.btn, a.button, button[type='submit'], [class*='cta'], [class*='btn-primary'], a[class*='bg-']");
  const ctaCount = ctaElements.length;

  // CTA in hero area (first section/header area)
  const heroArea = $("header, [class*='hero'], [class*='banner'], section:first-of-type");
  let ctaInHero = false;
  heroArea.find("a.btn, a.button, button, [class*='cta'], [class*='btn']").each(() => {
    ctaInHero = true;
  });

  // E-E-A-T signals
  const authorInfo = $("[class*='author'], [rel='author'], [itemtype*='Person']").length > 0;
  const aboutLinked = $("a[href*='about'], a[href*='o-nas'], a[href*='uber-uns']").length > 0;
  const contactLinked = $("a[href*='contact'], a[href*='kontakt']").length > 0;

  // Outbound authority links
  let authorityLinks = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (AUTHORITY_DOMAINS.some(d => href.includes(d))) authorityLinks++;
  });

  // Content freshness
  const yearPattern = /©\s*(\d{4})|copyright\s*(\d{4})|(\d{4})\s*©/gi;
  const years = [...bodyText.matchAll(yearPattern)]
    .map(m => parseInt(m[1] || m[2] || m[3]))
    .filter(y => y > 2000);
  const latestYear = years.length > 0 ? Math.max(...years) : null;

  // SimHash for duplicate detection
  const contentHash = simHash(cleanText);

  return {
    wordCount,
    sentenceCount,
    averageSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    readabilityScore: Math.round(readabilityScore * 10) / 10,
    isThinContent: isThin,
    headingToContentRatio: Math.round(headingRatio * 100) / 100,
    listUsageCount: listCount,
    tableUsageCount: tableCount,
    mediaRichness: Math.round(mediaRichness * 100) / 100,
    textToHtmlRatio: Math.round(textToHtml * 1000) / 1000,
    faqPresent: hasFaq,
    testimonialPresent: hasTestimonials,
    pricingPresent: hasPricing,
    contactInfoPresent: hasContact,
    ctaCount,
    ctaInHero,
    authorInfoPresent: authorInfo,
    aboutPageLinked: aboutLinked,
    contactPageLinked: contactLinked,
    outboundAuthorityLinks: authorityLinks,
    contentFreshnessYear: latestYear,
    duplicateContentHash: contentHash,
  };
}

// ─── 5. Accessibility Extraction ──────────────────────────────────────────────

function extractAccessibility(
  $: cheerio.CheerioAPI,
  html: string
): AccessibilityData {
  // Image alt
  let altPresent = 0;
  let altMissing = 0;
  $("img").each((_, el) => {
    const alt = $(el).attr("alt");
    if (alt !== undefined && alt.trim().length > 0) altPresent++;
    else altMissing++;
  });

  // Form labels
  const formInputs = $("input:not([type='hidden']):not([type='submit']):not([type='button']), textarea, select").length;
  const formLabels = $("label").length;
  let labelAssociation = 0;
  $("label[for]").each((_, el) => {
    const forId = $(el).attr("for");
    if (forId && $(`#${forId}`).length > 0) labelAssociation++;
  });

  // ARIA landmarks
  const landmarks: string[] = [];
  $("[role]").each((_, el) => {
    const role = $(el).attr("role") || "";
    if (["navigation", "main", "banner", "contentinfo", "complementary", "search", "form", "region"].includes(role)) {
      if (!landmarks.includes(role)) landmarks.push(role);
    }
  });

  // ARIA attributes count
  const ariaCount = $("[aria-label], [aria-labelledby], [aria-describedby], [aria-expanded], [aria-hidden], [aria-live], [aria-role]").length;

  // Semantic elements
  const semanticElements = {
    header: $("header").length,
    nav: $("nav").length,
    main: $("main").length,
    footer: $("footer").length,
    article: $("article").length,
    section: $("section").length,
    aside: $("aside").length,
  };

  // Heading hierarchy
  const headings = $("h1, h2, h3, h4, h5, h6").toArray();
  let prevLevel = 0;
  let hierarchyValid = true;
  const skippedLevels: number[] = [];
  for (const h of headings) {
    const level = parseInt(h.tagName.replace("h", ""));
    if (level > prevLevel + 1 && prevLevel > 0) {
      hierarchyValid = false;
      skippedLevels.push(level);
    }
    prevLevel = level;
  }

  // Bad link texts
  const badTexts: string[] = [];
  const badPatterns = ["click here", "read more", "more", "here", "link", "klikněte", "více", "zde", "hier"];
  $("a").each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (badPatterns.includes(text) && !badTexts.includes(text)) {
      badTexts.push(text);
    }
  });

  // Language declaration
  const langDeclared = !!$("html").attr("lang");

  // Skip navigation
  const skipNav = $("a[href='#main'], a[href='#content'], a.skip-link, a.skip-nav, a[class*='skip']").length > 0;

  // Focus visible (check if outline:none without replacement)
  const focusIssues = html.includes("outline: none") || html.includes("outline:none") || html.includes("outline:0");

  // Font size (check body/html style)
  let baseFontSize: number | null = null;
  const bodyStyle = $("body").attr("style") || "";
  const htmlStyle = $("html").attr("style") || "";
  const fontSizeMatch = (bodyStyle + htmlStyle).match(/font-size:\s*(\d+)px/);
  if (fontSizeMatch) baseFontSize = parseInt(fontSizeMatch[1]);

  // Line height
  let baseLineHeight: number | null = null;
  const lineHeightMatch = (bodyStyle + htmlStyle).match(/line-height:\s*([\d.]+)/);
  if (lineHeightMatch) baseLineHeight = parseFloat(lineHeightMatch[1]);

  // Tab index issues (positive tabindex is an anti-pattern)
  let tabIndexIssues = 0;
  $("[tabindex]").each((_, el) => {
    const val = parseInt($(el).attr("tabindex") || "0");
    if (val > 0) tabIndexIssues++;
  });

  // Color contrast estimation
  const colorPairs = extractTextColors($);
  const contrastEstimates = colorPairs.slice(0, 10).map(pair => {
    const fgRgb = hexToRgb(pair.fg);
    const bgRgb = hexToRgb(pair.bg);
    if (!fgRgb || !bgRgb) return { ratio: 0, passes: true };
    const l1 = relativeLuminance(fgRgb[0], fgRgb[1], fgRgb[2]);
    const l2 = relativeLuminance(bgRgb[0], bgRgb[1], bgRgb[2]);
    const ratio = contrastRatio(l1, l2);
    return { ratio: Math.round(ratio * 100) / 100, passes: ratio >= 4.5 };
  });

  return {
    imageAltPresent: altPresent,
    imageAltMissing: altMissing,
    formLabelCount: formLabels,
    formInputCount: formInputs,
    formLabelAssociation: labelAssociation,
    ariaLandmarks: landmarks,
    ariaAttributeCount: ariaCount,
    semanticElements,
    headingHierarchyValid: hierarchyValid,
    skippedHeadingLevels: skippedLevels,
    badLinkTexts: badTexts,
    langDeclared,
    skipNavPresent: skipNav,
    focusVisibleIssues: focusIssues,
    fontSizeBase: baseFontSize,
    lineHeightBase: baseLineHeight,
    tabIndexIssues,
    colorContrastEstimates: contrastEstimates,
  };
}

// ─── 6. Site Structure Extraction ─────────────────────────────────────────────

function extractSiteStructure(
  $: cheerio.CheerioAPI,
  html: string,
  url: string
): SiteStructureData {
  // Page type classification
  const bodyText = $("body").text().toLowerCase();
  const urlLower = url.toLowerCase();
  let pageType = "other";

  if (urlLower.match(/\/(index|home)?(\.[a-z]+)?$/i) || urlLower.endsWith("/")) {
    pageType = "homepage";
  } else if (urlLower.includes("/product") || urlLower.includes("/zbozi") || urlLower.includes("/produkt")) {
    if ($("[class*='product-list'], [class*='product-grid'], [class*='catalog']").length > 0) {
      pageType = "product-listing";
    } else {
      pageType = "product-detail";
    }
  } else if (urlLower.includes("/blog") || urlLower.includes("/clanek") || urlLower.includes("/artikel")) {
    if ($("article").length > 1 || $("[class*='post-list'], [class*='blog-list']").length > 0) {
      pageType = "blog-listing";
    } else {
      pageType = "blog-post";
    }
  } else if (urlLower.includes("/about") || urlLower.includes("/o-nas") || urlLower.includes("/uber-uns")) {
    pageType = "about";
  } else if (urlLower.includes("/contact") || urlLower.includes("/kontakt")) {
    pageType = "contact";
  } else if (urlLower.includes("/gallery") || urlLower.includes("/galerie")) {
    pageType = "gallery";
  } else if (urlLower.includes("/service") || urlLower.includes("/sluzb") || urlLower.includes("/dienst")) {
    pageType = "services";
  } else if (urlLower.includes("/pricing") || urlLower.includes("/cenik") || urlLower.includes("/preis")) {
    pageType = "pricing";
  }

  // Navigation
  const headerLinks: { text: string; href: string }[] = [];
  $("header a, nav a, [role='navigation'] a").each((_, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr("href") || "";
    if (text && href && text.length < 50) {
      headerLinks.push({ text, href });
    }
  });

  const footerLinks: { text: string; href: string }[] = [];
  $("footer a").each((_, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr("href") || "";
    if (text && href && text.length < 50) {
      footerLinks.push({ text, href });
    }
  });

  // Breadcrumb
  const breadcrumb = $("[class*='breadcrumb'], [itemtype*='BreadcrumbList'], nav[aria-label*='breadcrumb']").length > 0;

  // Pagination
  const pagination = $("[class*='pagination'], [class*='pager'], a[rel='next'], a[rel='prev']").length > 0;

  // Infinite scroll
  const infiniteScroll = html.includes("infinite-scroll") ||
    html.includes("IntersectionObserver") ||
    $("[class*='infinite'], [data-infinite]").length > 0;

  // Search
  const hasSearch = $("input[type='search'], [class*='search'], [role='search'], form[action*='search']").length > 0;

  // Multi-language
  const hreflangCount = $('link[rel="alternate"][hreflang]').length;
  let multiLang: string | null = null;
  if (hreflangCount > 0) {
    const langs = $('link[rel="alternate"][hreflang]').map((_, el) => $(el).attr("hreflang")).get();
    multiLang = `hreflang: ${langs.join(", ")}`;
  } else if ($("a[href*='/en/'], a[href*='/de/'], a[href*='/sk/'], a[href*='/cs/']").length > 0) {
    multiLang = "subdirectory";
  }

  // Mobile nav
  let mobileNav: string | null = null;
  if ($("[class*='hamburger'], [class*='mobile-menu'], [class*='burger']").length > 0) {
    mobileNav = "hamburger";
  } else if ($("[class*='offcanvas'], [class*='off-canvas']").length > 0) {
    mobileNav = "offcanvas";
  }

  // Social proof
  const socialProof = $("[class*='testimonial'], [class*='review'], [class*='rating'], [class*='stars'], [class*='trust'], [class*='partner'], [class*='client']").length;

  // URL depth
  const pathParts = new URL(url).pathname.split("/").filter(Boolean);
  const urlDepth = pathParts.length;

  return {
    pageType,
    headerNavLinks: headerLinks.slice(0, 30),
    footerNavLinks: footerLinks.slice(0, 30),
    breadcrumbPresent: breadcrumb,
    paginationDetected: pagination,
    infiniteScrollDetected: infiniteScroll,
    searchFunctionalityPresent: hasSearch,
    pageCountEstimate: 0, // Set at site level
    multiLanguageStructure: multiLang,
    mobileNavPattern: mobileNav,
    socialProofElements: socialProof,
    urlDirectoryDepth: urlDepth,
  };
}

// ─── 7. Image Analysis Extraction ─────────────────────────────────────────────

function extractImageAnalysis($: cheerio.CheerioAPI): ImageAnalysisData {
  const images = $("img");
  let withAlt = 0;
  let emptyAlt = 0;
  let withoutAlt = 0;
  const oversized: string[] = [];
  let modernFormat = 0;
  let responsive = 0;
  let lazyLoaded = 0;
  let withDimensions = 0;
  let withFetchPriority = 0;
  let iconCount = 0;
  let heroImage: string | null = null;
  let logoDetected = false;

  images.each((i, el) => {
    const alt = $(el).attr("alt");
    const src = $(el).attr("src") || "";
    const srcset = $(el).attr("srcset");
    const loading = $(el).attr("loading");
    const width = parseInt($(el).attr("width") || "0");
    const height = parseInt($(el).attr("height") || "0");
    const fetchPriority = $(el).attr("fetchpriority");

    // Alt text
    if (alt === undefined) withoutAlt++;
    else if (alt.trim() === "") emptyAlt++;
    else withAlt++;

    // Modern format
    if (/\.(webp|avif)(\?|$)/i.test(src)) modernFormat++;
    if (srcset && /\.(webp|avif)/i.test(srcset)) modernFormat++;

    // Picture source with modern formats
    const picture = $(el).closest("picture");
    if (picture.length > 0) {
      picture.find("source").each((_, source) => {
        const type = $(source).attr("type") || "";
        if (type.includes("webp") || type.includes("avif")) modernFormat++;
      });
    }

    // Responsive
    if (srcset || $(el).attr("sizes")) responsive++;

    // Lazy loading
    if (loading === "lazy") lazyLoaded++;

    // Dimensions
    if (width > 0 && height > 0) withDimensions++;

    // Fetch priority
    if (fetchPriority) withFetchPriority++;

    // Icons (small images)
    if ((width > 0 && width < 64) || (height > 0 && height < 64)) iconCount++;

    // Hero image (first large image)
    if (i === 0 && !heroImage) {
      if ((width > 300 || height > 200) || (!width && !height)) {
        heroImage = src;
      }
    }

    // Logo detection
    if (src.toLowerCase().includes("logo") ||
        (alt && alt.toLowerCase().includes("logo")) ||
        $(el).closest("header, [class*='logo']").length > 0) {
      logoDetected = true;
    }
  });

  // Background images (CSS)
  let bgImageCount = 0;
  $("[style]").each((_, el) => {
    const style = $(el).attr("style") || "";
    if (style.includes("background-image") || style.includes("background:")) {
      if (style.includes("url(")) bgImageCount++;
    }
  });

  return {
    totalCount: images.length,
    withAlt,
    withEmptyAlt: emptyAlt,
    withoutAlt,
    oversizedImages: oversized,
    modernFormatCount: modernFormat,
    responsiveImageCount: responsive,
    lazyLoadedCount: lazyLoaded,
    heroImageDetected: !!heroImage,
    heroImageUrl: heroImage,
    logoDetected,
    iconCount,
    backgroundImageCount: bgImageCount,
    withDimensionAttributes: withDimensions,
    withFetchPriority: withFetchPriority,
  };
}

// ─── 8. Security Extraction ───────────────────────────────────────────────────

function extractSecurity(
  $: cheerio.CheerioAPI,
  url: string,
  headers: Record<string, string>
): SecurityData {
  const parsedUrl = new URL(url);
  const httpsEnabled = parsedUrl.protocol === "https:";

  // Mixed content
  let mixedCount = 0;
  if (httpsEnabled) {
    mixedCount = $("img[src^='http:'], script[src^='http:'], link[href^='http:'], iframe[src^='http:']").length;
  }

  // Headers
  const hsts = headers["strict-transport-security"] || null;
  const csp = headers["content-security-policy"] || null;
  const xfo = headers["x-frame-options"] || null;
  const xcto = !!headers["x-content-type-options"];
  const referrerPolicy = headers["referrer-policy"] || null;
  const permissionsPolicy = !!headers["permissions-policy"];

  // Server version exposure
  const serverHeader = headers["server"] || null;
  const exposedVersion = serverHeader ?
    /\d+\.\d+/.test(serverHeader) : false;

  // Cookie security (from Set-Cookie headers)
  const setCookie = headers["set-cookie"] || "";
  const cookieFlags: { secure: boolean; sameSite: boolean; httpOnly: boolean }[] = [];
  if (setCookie) {
    const cookies = setCookie.split(/,(?=\s*[a-zA-Z_]+=)/);
    for (const cookie of cookies) {
      const lower = cookie.toLowerCase();
      cookieFlags.push({
        secure: lower.includes("secure"),
        sameSite: lower.includes("samesite"),
        httpOnly: lower.includes("httponly"),
      });
    }
  }

  return {
    httpsEnabled,
    hstsPresent: !!hsts,
    hstsValue: hsts,
    cspPresent: !!csp,
    cspValue: csp ? csp.slice(0, 200) : null,
    xFrameOptionsPresent: !!xfo,
    xFrameOptionsValue: xfo,
    xContentTypeOptionsPresent: xcto,
    referrerPolicyPresent: !!referrerPolicy,
    referrerPolicyValue: referrerPolicy,
    permissionsPolicyPresent: permissionsPolicy,
    mixedContentCount: mixedCount,
    cookieSecurityFlags: cookieFlags,
    exposedServerVersion: exposedVersion,
    serverHeader,
  };
}

// ─── 9. AI/LLM Visibility Extraction ─────────────────────────────────────────

function extractAiVisibility(
  $: cheerio.CheerioAPI,
  html: string,
  url: string
): AiVisibilityData {
  // Schema richness
  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      if (data["@type"]) schemaTypes.push(data["@type"]);
      if (Array.isArray(data["@graph"])) {
        for (const item of data["@graph"]) {
          if (item["@type"]) schemaTypes.push(item["@type"]);
        }
      }
    } catch { /* skip */ }
  });
  const schemaRichness = schemaTypes.length;

  // Semantic HTML score (0-100)
  const semanticScore = Math.min(100,
    ($("header").length > 0 ? 15 : 0) +
    ($("nav").length > 0 ? 15 : 0) +
    ($("main").length > 0 ? 20 : 0) +
    ($("footer").length > 0 ? 10 : 0) +
    ($("article").length > 0 ? 15 : 0) +
    ($("section").length > 0 ? 10 : 0) +
    ($("aside").length > 0 ? 5 : 0) +
    ($("figure").length > 0 ? 5 : 0) +
    ($("figcaption").length > 0 ? 5 : 0)
  );

  // Content structure clarity
  const h2Count = $("h2").length;
  const pCount = $("p").length;
  const listCount = $("ul, ol").length;
  const structureClarity = Math.min(100,
    Math.min(h2Count, 5) * 10 +
    Math.min(pCount, 10) * 3 +
    Math.min(listCount, 3) * 5
  );

  // Keyword stuffing detection
  const bodyText = $("body").text();
  const words = bodyText.split(/\s+/).filter(w => w.length > 2);
  const wordFreq: Record<string, number> = {};
  for (const w of words) {
    const lower = w.toLowerCase();
    if (lower.length < 3 || STOP_WORDS.has(lower)) continue;
    wordFreq[lower] = (wordFreq[lower] || 0) + 1;
  }
  const maxFreq = Math.max(...Object.values(wordFreq), 0);
  const keywordStuffing = words.length > 0 && maxFreq / words.length > 0.05;

  // Specific schema types
  const faqSchema = schemaTypes.includes("FAQPage");
  const howToSchema = schemaTypes.includes("HowTo");
  const articleSchema = schemaTypes.some(t =>
    ["Article", "BlogPosting", "NewsArticle", "TechArticle"].includes(t)
  );

  // Clean URL
  const parsedUrl = new URL(url);
  const cleanUrl = !parsedUrl.search &&
    !/[A-Z]/.test(parsedUrl.pathname) &&
    !/_/.test(parsedUrl.pathname) &&
    !/\d{5,}/.test(parsedUrl.pathname);

  // Metadata completeness
  const metaChecks = [
    $("title").length > 0,
    $('meta[name="description"]').length > 0,
    $('meta[property="og:title"]').length > 0,
    $('meta[property="og:description"]').length > 0,
    $('meta[property="og:image"]').length > 0,
    $('meta[name="twitter:card"]').length > 0,
    $("html").attr("lang") !== undefined,
    $('link[rel="canonical"]').length > 0,
    schemaTypes.length > 0,
    $('meta[name="viewport"]').length > 0,
  ];
  const metadataScore = Math.round((metaChecks.filter(Boolean).length / metaChecks.length) * 100);

  return {
    llmsTxtDetected: false, // Requires external fetch, set at site level
    schemaRichness,
    schemaTypes,
    semanticHtmlScore: semanticScore,
    contentStructureClarity: structureClarity,
    keywordStuffingDetected: keywordStuffing,
    faqSchemaPresent: faqSchema,
    howToSchemaPresent: howToSchema,
    articleSchemaPresent: articleSchema,
    cleanUrlStructure: cleanUrl,
    metadataCompletenessScore: metadataScore,
  };
}

// ─── Site-Level Analysis ──────────────────────────────────────────────────────

export function analyzeSite(pages: PageAnalysis[]): SiteAnalysis {
  if (pages.length === 0) {
    throw new Error("No pages to analyze");
  }

  const mainPage = pages[0];
  const url = mainPage.url;

  // Aggregate word counts
  const avgWordCount = Math.round(
    pages.reduce((sum, p) => sum + p.contentQuality.wordCount, 0) / pages.length
  );
  const avgReadability = Math.round(
    pages.reduce((sum, p) => sum + p.contentQuality.readabilityScore, 0) / pages.length * 10
  ) / 10;

  // Image aggregation
  const totalImages = pages.reduce((sum, p) => sum + p.imageAnalysis.totalCount, 0);
  const totalImagesWithAlt = pages.reduce((sum, p) => sum + p.imageAnalysis.withAlt, 0);
  const altCoverage = totalImages > 0 ? Math.round((totalImagesWithAlt / totalImages) * 100) : 100;

  // Duplicate title/description detection
  const titleMap: Record<string, string[]> = {};
  const descMap: Record<string, string[]> = {};
  for (const p of pages) {
    const t = p.onPageSeo.titleContent;
    if (t) {
      if (!titleMap[t]) titleMap[t] = [];
      titleMap[t].push(p.url);
    }
    const d = p.onPageSeo.metaDescriptionContent;
    if (d) {
      if (!descMap[d]) descMap[d] = [];
      descMap[d].push(p.url);
    }
  }
  const dupTitles = Object.entries(titleMap).filter(([, urls]) => urls.length > 1).map(([t]) => t);
  const dupDescs = Object.entries(descMap).filter(([, urls]) => urls.length > 1).map(([d]) => d);

  // Schema types across site
  const allSchemaTypes = [...new Set(pages.flatMap(p => p.onPageSeo.schemaTypes))];

  // Text-to-HTML ratio
  const avgTextToHtml = pages.reduce((sum, p) => sum + p.contentQuality.textToHtmlRatio, 0) / pages.length;

  // Link counts
  const totalInternalLinks = pages.reduce((sum, p) => sum + p.onPageSeo.internalLinkCount, 0);
  const totalExternalLinks = pages.reduce((sum, p) => sum + p.onPageSeo.externalLinkCount, 0);

  // Duplicate content detection via SimHash
  const contentHashMap = new Map<string, string[]>();
  for (const p of pages) {
    const hash = p.contentQuality.duplicateContentHash;
    if (!contentHashMap.has(hash)) contentHashMap.set(hash, []);
    contentHashMap.get(hash)!.push(p.url);
  }

  // Find near-duplicates (Hamming distance <= 3)
  const duplicateGroups: string[][] = [];
  const pageHashes = pages.map(p => ({ url: p.url, hash: p.contentQuality.duplicateContentHash }));
  const processed = new Set<string>();
  for (let i = 0; i < pageHashes.length; i++) {
    if (processed.has(pageHashes[i].url)) continue;
    const group = [pageHashes[i].url];
    for (let j = i + 1; j < pageHashes.length; j++) {
      if (processed.has(pageHashes[j].url)) continue;
      if (hammingDistance(pageHashes[i].hash, pageHashes[j].hash) <= 3) {
        group.push(pageHashes[j].url);
        processed.add(pageHashes[j].url);
      }
    }
    if (group.length > 1) {
      duplicateGroups.push(group);
      processed.add(pageHashes[i].url);
    }
  }

  // Page types
  const pageTypes: Record<string, number> = {};
  for (const p of pages) {
    const type = p.siteStructure.pageType;
    pageTypes[type] = (pageTypes[type] || 0) + 1;
  }

  // Average performance metrics
  const avgPerf: Partial<PerformanceData> = {
    htmlSizeBytes: Math.round(pages.reduce((s, p) => s + p.performance.htmlSizeBytes, 0) / pages.length),
    externalScriptCount: Math.round(pages.reduce((s, p) => s + p.performance.externalScriptCount, 0) / pages.length),
    renderBlockingScripts: Math.round(pages.reduce((s, p) => s + p.performance.renderBlockingScripts, 0) / pages.length),
    imageCount: Math.round(pages.reduce((s, p) => s + p.performance.imageCount, 0) / pages.length),
    thirdPartyScriptCount: Math.round(pages.reduce((s, p) => s + p.performance.thirdPartyScriptCount, 0) / pages.length),
  };

  return {
    url,
    analyzedAt: new Date().toISOString(),
    pageCount: pages.length,
    pages,
    aggregated: {
      avgWordCount,
      avgReadabilityScore: avgReadability,
      totalImageCount: totalImages,
      totalImagesWithAlt,
      altCoveragePercent: altCoverage,
      uniqueTitles: Object.keys(titleMap).length,
      uniqueDescriptions: Object.keys(descMap).length,
      duplicateTitles: dupTitles,
      duplicateDescriptions: dupDescs,
      schemaTypesUsed: allSchemaTypes,
      avgTextToHtmlRatio: Math.round(avgTextToHtml * 1000) / 1000,
      totalInternalLinks,
      totalExternalLinks,
      contentHashMap,
      duplicateContentPages: duplicateGroups,
      pageTypes,
      avgPerformanceMetrics: avgPerf,
    },
  };
}

// ─── Findings Generator ──────────────────────────────────────────────────────

export function generateFindings(site: SiteAnalysis): EngineFinding[] {
  const findings: EngineFinding[] = [];
  const main = site.pages[0];
  let id = 0;
  const f = (
    severity: EngineFinding["severity"],
    category: EngineFinding["category"],
    title: string,
    description: string,
    impact: number,
    effort: number
  ) => {
    findings.push({ id: `eng-${++id}`, severity, category, title, description, impact, effort });
  };

  // ─── Performance Findings ─────────────────────────────────────────
  const perf = main.performance;

  if (perf.htmlSizeBytes > 500000) {
    f("error", "performance", "Příliš velký HTML soubor", `HTML stránky má ${Math.round(perf.htmlSizeBytes / 1024)} KB. Doporučeno je pod 100 KB pro rychlé načtení.`, 8, 5);
  } else if (perf.htmlSizeBytes > 200000) {
    f("warning", "performance", "Velký HTML soubor", `HTML má ${Math.round(perf.htmlSizeBytes / 1024)} KB. Zvažte minifikaci a odstranění zbytečného kódu.`, 5, 3);
  }

  if (perf.renderBlockingScripts > 0) {
    f("error", "performance", "Blokující skripty v hlavičce", `${perf.renderBlockingScripts} skript(ů) v <head> bez async/defer blokuje vykreslení stránky. Přidejte async nebo defer atribut.`, 9, 3);
  }

  if (perf.externalScriptCount > 15) {
    f("warning", "performance", "Příliš mnoho externích skriptů", `Stránka načítá ${perf.externalScriptCount} externích skriptů. Zvažte sloučení nebo odložené načítání.`, 7, 6);
  }

  if (perf.thirdPartyScriptCount > 5) {
    f("warning", "performance", "Mnoho skriptů třetích stran", `${perf.thirdPartyScriptCount} skriptů třetích stran zpomaluje načítání. Auditujte, které jsou nezbytné.`, 7, 4);
  }

  if (perf.inlineCssSizeBytes > 50000) {
    f("warning", "performance", "Velký inline CSS", `Inline CSS zabírá ${Math.round(perf.inlineCssSizeBytes / 1024)} KB. Přesuňte do externích souborů.`, 4, 4);
  }

  if (perf.imageCount > 0 && perf.lazyLoadingCount === 0) {
    f("warning", "performance", "Chybí lazy loading obrázků", `Žádný z ${perf.imageCount} obrázků nepoužívá loading="lazy". Obrázky mimo viewport by měly být lazy-loaded.`, 6, 2);
  }

  if (perf.preloadHints === 0) {
    f("notice", "performance", "Žádné preload hinty", "Zvažte přidání <link rel=\"preload\"> pro kritické zdroje (fonty, hero obrázek).", 4, 2);
  }

  if (!perf.compressionDetected) {
    f("error", "performance", "Chybí komprese textu", "Server nepoužívá gzip/brotli kompresi. To může výrazně zpomalit načítání.", 8, 2);
  }

  if (!perf.cacheControlPresent) {
    f("warning", "performance", "Chybí Cache-Control hlavička", "Server nenastavuje Cache-Control. Správné cachování výrazně zrychlí opakované návštěvy.", 6, 3);
  }

  if (!perf.fontDisplayUsed) {
    f("notice", "performance", "Chybí font-display strategie", "Fonty nemají nastavenou font-display vlastnost. Použijte font-display: swap pro rychlejší vykreslení textu.", 3, 2);
  }

  if (!perf.aboveFoldImageOptimized && perf.imageCount > 0) {
    f("notice", "performance", "Hero obrázek není optimalizován", "Hlavní obrázek nemá fetchpriority=\"high\" ani preload. To zpomaluje LCP.", 5, 1);
  }

  if (!perf.criticalCssDetected) {
    f("notice", "performance", "Chybí critical CSS", "Kritické CSS není vloženo inline v hlavičce. To může zpomalit první vykreslení.", 4, 5);
  }

  // ─── SEO Findings ──────────────────────────────────────────────────
  const seo = main.onPageSeo;

  if (!seo.titlePresent) {
    f("error", "seo", "Chybí title tag", "Stránka nemá <title> tag. Title je nejdůležitější on-page SEO faktor.", 10, 1);
  } else if (seo.titleLength < 30) {
    f("warning", "seo", "Příliš krátký title", `Title má ${seo.titleLength} znaků. Doporučeno je 50–60 znaků pro maximální CTR ve vyhledávání.`, 7, 1);
  } else if (seo.titleLength > 65) {
    f("warning", "seo", "Příliš dlouhý title", `Title má ${seo.titleLength} znaků. Google ořízne po ~60 znacích.`, 5, 1);
  }

  if (!seo.metaDescriptionPresent) {
    f("error", "seo", "Chybí meta description", "Stránka nemá meta description. Vyhledávače ji zobrazují ve výsledcích.", 9, 1);
  } else if (seo.metaDescriptionLength < 100) {
    f("warning", "seo", "Krátký meta description", `Description má ${seo.metaDescriptionLength} znaků. Doporučeno je 140–160.`, 5, 1);
  } else if (seo.metaDescriptionLength > 170) {
    f("warning", "seo", "Příliš dlouhý meta description", `Description má ${seo.metaDescriptionLength} znaků. Bude oříznut ve výsledcích.`, 3, 1);
  }

  if (!seo.h1Present) {
    f("error", "seo", "Chybí H1 nadpis", "Stránka nemá nadpis H1. Každá stránka by měla mít právě jeden H1.", 8, 1);
  } else if (seo.h1Count > 1) {
    f("warning", "seo", "Více H1 nadpisů", `Nalezeno ${seo.h1Count} H1 tagů. Doporučen je právě jeden H1 na stránku.`, 5, 2);
  }

  if (!seo.headingHierarchyValid) {
    f("warning", "seo", "Porušená hierarchie nadpisů", "Nadpisy přeskakují úrovně (např. H1 → H3). Používejte sekvenční úrovně.", 4, 2);
  }

  if (!seo.canonicalPresent) {
    f("warning", "seo", "Chybí canonical tag", "Stránka nemá kanonický URL. To může způsobit problémy s duplicitním obsahem.", 6, 1);
  }

  if (seo.hasNoindex) {
    f("error", "seo", "Stránka nastavena na noindex", "Meta robots obsahuje noindex – stránka se nezobrazí ve výsledcích vyhledávání.", 10, 1);
  }

  if (!seo.ogTitle || !seo.ogDescription || !seo.ogImage) {
    const missing = [!seo.ogTitle && "title", !seo.ogDescription && "description", !seo.ogImage && "image"].filter(Boolean);
    f("warning", "seo", "Neúplné Open Graph tagy", `Chybí OG ${missing.join(", ")}. Sdílení na sociálních sítích nebude mít náhled.`, 5, 1);
  }

  if (!seo.twitterCard) {
    f("notice", "seo", "Chybí Twitter Card", "Stránka nemá Twitter Card meta tagy. Tweety s odkazy nebudou mít bohatý náhled.", 3, 1);
  }

  if (seo.schemaJsonLdCount === 0) {
    f("warning", "seo", "Chybí strukturovaná data", "Žádný Schema.org markup (JSON-LD). Přidejte jej pro bohaté výsledky ve vyhledávání.", 7, 4);
  }

  if (seo.imageAltCoverage < 50 && main.imageAnalysis.totalCount > 0) {
    f("error", "seo", "Špatné pokrytí alt textů", `Pouze ${seo.imageAltCoverage}% obrázků má alt text. To poškozuje SEO i přístupnost.`, 8, 3);
  } else if (seo.imageAltCoverage < 90 && main.imageAnalysis.totalCount > 0) {
    f("warning", "seo", "Neúplné alt texty", `${seo.imageAltCoverage}% obrázků má alt text. Doplňte chybějící.`, 5, 2);
  }

  if (!seo.viewportPresent) {
    f("error", "seo", "Chybí viewport meta tag", "Stránka nemá nastavený viewport. Na mobilních zařízeních se zobrazí špatně.", 9, 1);
  }

  if (!seo.langAttribute) {
    f("warning", "seo", "Chybí atribut lang", "HTML element nemá atribut lang. Pomáhá vyhledávačům i čtečkám obrazovky.", 4, 1);
  }

  if (seo.internalLinkCount < 3) {
    f("warning", "seo", "Málo interních odkazů", `Pouze ${seo.internalLinkCount} interních odkazů. Interní prolinkování zlepšuje SEO.`, 5, 3);
  }

  if (!seo.breadcrumbMarkup) {
    f("notice", "seo", "Chybí breadcrumb navigace", "Drobečková navigace se strukturovanými daty zlepšuje orientaci i výsledky ve vyhledávání.", 4, 4);
  }

  if (!seo.faqMarkup && main.contentQuality.faqPresent) {
    f("warning", "seo", "FAQ bez strukturovaných dat", "Stránka má FAQ sekci, ale chybí FAQPage schema markup. Přidejte jej pro bohaté výsledky.", 6, 3);
  }

  if (seo.socialMediaLinks.length === 0) {
    f("notice", "seo", "Chybí odkazy na sociální sítě", "Žádné odkazy na sociální profily. Sociální signály pomáhají budovat důvěru.", 3, 1);
  }

  // Duplicate titles/descriptions (site-level)
  if (site.aggregated.duplicateTitles.length > 0) {
    f("warning", "seo", "Duplicitní titulky stránek", `${site.aggregated.duplicateTitles.length} title tag(ů) se opakuje na více stránkách. Každá stránka by měla mít unikátní title.`, 7, 3);
  }

  if (site.aggregated.duplicateDescriptions.length > 0) {
    f("warning", "seo", "Duplicitní meta descriptions", `${site.aggregated.duplicateDescriptions.length} description(s) se opakuje. Každá stránka by měla mít unikátní popis.`, 6, 3);
  }

  // ─── Security Findings ──────────────────────────────────────────────
  const sec = main.security;

  if (!sec.httpsEnabled) {
    f("error", "security", "Web nepoužívá HTTPS", "Stránka není zabezpečena SSL/TLS certifikátem. HTTPS je nezbytné pro důvěru i SEO.", 10, 2);
  }

  if (sec.mixedContentCount > 0) {
    f("error", "security", "Smíšený obsah (mixed content)", `${sec.mixedContentCount} zdroj(ů) se načítá přes HTTP na HTTPS stránce. To snižuje bezpečnost.`, 8, 3);
  }

  if (!sec.hstsPresent) {
    f("warning", "security", "Chybí HSTS hlavička", "Server nenastavuje Strict-Transport-Security. HSTS vynucuje HTTPS v prohlížečích.", 7, 2);
  }

  if (!sec.cspPresent) {
    f("warning", "security", "Chybí Content-Security-Policy", "CSP hlavička chrání proti XSS a injection útokům. Doporučeno nastavit.", 7, 5);
  }

  if (!sec.xFrameOptionsPresent) {
    f("warning", "security", "Riziko clickjackingu", "Chybí X-Frame-Options nebo CSP frame-ancestors. Stránka může být vložena do cizího iframe.", 6, 2);
  }

  if (!sec.xContentTypeOptionsPresent) {
    f("notice", "security", "Chybí X-Content-Type-Options", "Přidejte hlavičku s hodnotou 'nosniff' pro prevenci MIME type sniffingu.", 3, 1);
  }

  if (!sec.referrerPolicyPresent) {
    f("notice", "security", "Chybí Referrer-Policy", "Bez Referrer-Policy mohou URL informace unikat ke třetím stranám.", 3, 1);
  }

  if (!sec.permissionsPolicyPresent) {
    f("notice", "security", "Chybí Permissions-Policy", "Zvažte přidání Permissions-Policy pro kontrolu funkcí prohlížeče (kamera, mikrofon, geolokace).", 3, 2);
  }

  if (sec.exposedServerVersion) {
    f("notice", "security", "Odhalená verze serveru", `Server hlavička \"${sec.serverHeader}\" odhaluje verzi softwaru. To usnadňuje cílené útoky.`, 4, 1);
  }

  if (sec.cookieSecurityFlags.length > 0) {
    const insecure = sec.cookieSecurityFlags.filter(c => !c.secure || !c.httpOnly);
    if (insecure.length > 0) {
      f("warning", "security", "Nezabezpečené cookies", `${insecure.length} cookie(s) nemá nastavené Secure nebo HttpOnly příznaky.`, 6, 2);
    }
  }

  // ─── Accessibility Findings ─────────────────────────────────────────
  const a11y = main.accessibility;

  if (a11y.imageAltMissing > 0) {
    f("error", "accessibility", "Obrázky bez alt textu", `${a11y.imageAltMissing} obrázek(ů) nemá alt text. To je problém pro uživatele čteček obrazovky.`, 8, 2);
  }

  if (a11y.formInputCount > 0 && a11y.formLabelAssociation < a11y.formInputCount) {
    f("warning", "accessibility", "Formulářové pole bez popisků", `${a11y.formInputCount - a11y.formLabelAssociation} vstupní(ch) polí nemá přidružený <label>. To ztěžuje vyplnění formuláře.`, 7, 2);
  }

  if (a11y.ariaLandmarks.length === 0) {
    f("warning", "accessibility", "Chybí ARIA landmarks", "Žádné ARIA role (navigation, main, banner). Přidejte je pro lepší navigaci čtečkami.", 5, 3);
  }

  const semCount = Object.values(a11y.semanticElements).filter(v => v > 0).length;
  if (semCount < 3) {
    f("warning", "accessibility", "Nedostatečný sémantický HTML", `Použito pouze ${semCount}/7 sémantických elementů. Používejte header, nav, main, footer, article, section.`, 6, 4);
  }

  if (!a11y.headingHierarchyValid) {
    f("warning", "accessibility", "Přeskočené úrovně nadpisů", `Nadpisy přeskakují úrovně (${a11y.skippedHeadingLevels.join(", ")}). To mate čtečky obrazovky.`, 5, 2);
  }

  if (a11y.badLinkTexts.length > 0) {
    f("warning", "accessibility", "Špatné texty odkazů", `Nalezeny obecné texty odkazů: \"${a11y.badLinkTexts.join('", "')}". Používejte popisné texty.`, 5, 2);
  }

  if (!a11y.langDeclared) {
    f("warning", "accessibility", "Chybí deklarace jazyka", "HTML element nemá atribut lang. Čtečky obrazovky nebudou vědět, jakým jazykem číst.", 6, 1);
  }

  if (!a11y.skipNavPresent) {
    f("notice", "accessibility", "Chybí odkaz pro přeskočení navigace", "Přidejte 'skip to content' odkaz pro uživatele klávesnice.", 4, 2);
  }

  if (a11y.focusVisibleIssues) {
    f("warning", "accessibility", "Potlačený focus indikátor", "CSS obsahuje outline:none bez náhrady. Uživatelé klávesnice nevidí, kde se nacházejí.", 6, 2);
  }

  if (a11y.tabIndexIssues > 0) {
    f("notice", "accessibility", "Problémy s tabindex", `${a11y.tabIndexIssues} element(ů) má kladný tabindex. To narušuje přirozené pořadí navigace.`, 4, 2);
  }

  const failingContrast = a11y.colorContrastEstimates.filter(c => !c.passes);
  if (failingContrast.length > 0) {
    f("warning", "accessibility", "Nedostatečný barevný kontrast", `${failingContrast.length} kombinace barev nesplňuje poměr 4.5:1 pro WCAG AA. Zhoršuje čitelnost.`, 7, 3);
  }

  // ─── Content Findings ───────────────────────────────────────────────
  const content = main.contentQuality;

  if (content.isThinContent) {
    f("error", "content", "Příliš málo obsahu", `Stránka má pouze ~${content.wordCount} slov. Doporučeno je alespoň 300 slov pro kvalitní SEO.`, 8, 5);
  }

  if (content.readabilityScore < 30) {
    f("warning", "content", "Obtížně čitelný obsah", `Flesch-Kincaid skóre čitelnosti je ${content.readabilityScore}. Zjednodušte jazyk pro širší publikum.`, 5, 5);
  }

  if (content.textToHtmlRatio < 0.1) {
    f("warning", "content", "Nízký poměr textu k HTML", `Pouze ${Math.round(content.textToHtmlRatio * 100)}% stránky je viditelný text. Přidejte více obsahu.`, 5, 5);
  }

  if (content.ctaCount === 0) {
    f("warning", "content", "Chybí výzva k akci (CTA)", "Na stránce nejsou žádná CTA tlačítka. Návštěvníci nevědí, co mají dělat dál.", 8, 2);
  } else if (!content.ctaInHero) {
    f("notice", "content", "CTA chybí v hero sekci", "V horní části stránky (hero) není žádná výzva k akci. Přidejte CTA pro okamžitý engagement.", 5, 2);
  }

  if (!content.contactInfoPresent) {
    f("warning", "content", "Chybí kontaktní údaje", "Na stránce není telefon ani e-mail. Kontaktní informace budují důvěru.", 7, 1);
  }

  if (!content.testimonialPresent) {
    f("warning", "content", "Chybí reference a hodnocení", "Žádné testimonials ani recenze. Sociální důkaz výrazně zvyšuje konverze.", 7, 5);
  }

  if (!content.faqPresent) {
    f("notice", "content", "Chybí FAQ sekce", "FAQ odpovídá na časté otázky zákazníků a zlepšuje SEO i AI viditelnost.", 5, 4);
  }

  if (!content.authorInfoPresent && !content.aboutPageLinked) {
    f("notice", "content", "Slabé E-E-A-T signály", "Chybí informace o autorovi nebo odkaz na stránku O nás. Google hodnotí odbornost a důvěryhodnost.", 5, 4);
  }

  if (content.contentFreshnessYear && content.contentFreshnessYear < new Date().getFullYear() - 1) {
    f("warning", "content", "Zastaralý copyright", `Rok v copyrightě je ${content.contentFreshnessYear}. Aktualizujte na ${new Date().getFullYear()}.`, 4, 1);
  }

  // Site-level duplicate content
  if (site.aggregated.duplicateContentPages.length > 0) {
    f("warning", "content", "Duplicitní obsah mezi stránkami", `${site.aggregated.duplicateContentPages.length} skupina(y) stránek má velmi podobný obsah. To škodí SEO.`, 7, 6);
  }

  if (content.listUsageCount === 0 && content.wordCount > 200) {
    f("notice", "content", "Žádné seznamy v obsahu", "Obsah nepoužívá odrážkové ani číslované seznamy. Seznamy zlepšují čitelnost a skenování.", 3, 2);
  }

  if (content.mediaRichness < 0.5 && content.wordCount > 300) {
    f("notice", "content", "Málo médií v obsahu", "Poměr obrázků/videí k textu je nízký. Vizuální obsah zvyšuje engagement.", 4, 4);
  }

  // ─── Structure Findings ─────────────────────────────────────────────
  const struct = main.siteStructure;

  if (struct.headerNavLinks.length === 0) {
    f("error", "structure", "Chybí hlavní navigace", "V hlavičce stránky nejsou žádné navigační odkazy. Návštěvníci se nemohou orientovat.", 9, 3);
  } else if (struct.headerNavLinks.length < 3) {
    f("warning", "structure", "Minimální navigace", `Pouze ${struct.headerNavLinks.length} odkaz(y) v hlavní navigaci. Zvažte rozšíření.`, 5, 2);
  }

  if (!struct.breadcrumbPresent && struct.urlDirectoryDepth > 1) {
    f("notice", "structure", "Chybí drobečková navigace", "Na vnořených stránkách chybí breadcrumbs. Pomáhají orientaci i SEO.", 4, 3);
  }

  if (!struct.searchFunctionalityPresent && site.pageCount > 10) {
    f("notice", "structure", "Chybí vyhledávání", "Web s více než 10 stránkami by měl mít vyhledávání pro snadnou navigaci.", 4, 5);
  }

  if (struct.footerNavLinks.length === 0) {
    f("notice", "structure", "Prázdná patička", "Patička neobsahuje žádné odkazy. Footer je důležitý pro navigaci a důvěru.", 4, 2);
  }

  if (!struct.mobileNavPattern) {
    f("notice", "structure", "Nezjištěn mobilní navigační vzor", "Hamburger menu ani off-canvas navigace nebyly detekovány. Ověřte mobilní UX.", 4, 3);
  }

  if (struct.socialProofElements === 0) {
    f("notice", "structure", "Chybí sociální důkaz", "Žádné elementy sociálního důkazu (testimonials, hodnocení, loga partnerů).", 5, 4);
  }

  // ─── Image Findings ─────────────────────────────────────────────────
  const img = main.imageAnalysis;

  if (img.totalCount > 0 && img.modernFormatCount === 0) {
    f("warning", "images", "Žádné moderní formáty obrázků", "Stránka nepoužívá WebP nebo AVIF. Moderní formáty jsou o 30-50% menší.", 6, 4);
  }

  if (img.totalCount > 5 && img.responsiveImageCount === 0) {
    f("warning", "images", "Chybí responsivní obrázky", "Žádný obrázek nepoužívá srcset. Na mobilech se načítají zbytečně velké soubory.", 6, 4);
  }

  if (img.totalCount > 3 && img.withDimensionAttributes === 0) {
    f("warning", "images", "Chybí rozměry obrázků", "Obrázky nemají width/height atributy. To způsobuje layout shift (CLS).", 7, 2);
  }

  if (img.totalCount > 0 && img.withFetchPriority === 0) {
    f("notice", "images", "Chybí fetchpriority na LCP obrázku", "Hlavní obrázek nemá fetchpriority=\"high\". Přidejte pro rychlejší LCP.", 4, 1);
  }

  if (img.backgroundImageCount > 3) {
    f("notice", "images", "Mnoho CSS background obrázků", `${img.backgroundImageCount} CSS obrázků na pozadí. Ty nelze lazy-loadovat ani optimalizovat srcsetem.`, 3, 5);
  }

  // ─── AI Visibility Findings ─────────────────────────────────────────
  const ai = main.aiVisibility;

  if (ai.semanticHtmlScore < 40) {
    f("warning", "ai-visibility", "Slabý sémantický HTML", `Skóre sémantického HTML je ${ai.semanticHtmlScore}/100. AI systémy potřebují dobře strukturovaný HTML.`, 6, 4);
  }

  if (ai.contentStructureClarity < 30) {
    f("warning", "ai-visibility", "Nejasná struktura obsahu", "Obsah nemá dostatek nadpisů a strukturovaných sekcí pro AI sumarizaci.", 5, 4);
  }

  if (ai.keywordStuffingDetected) {
    f("warning", "ai-visibility", "Podezření na keyword stuffing", "Jeden keyword se opakuje s hustotou > 5%. AI systémy to penalizují jako nekvalitní obsah.", 6, 3);
  }

  if (!ai.faqSchemaPresent) {
    f("notice", "ai-visibility", "Chybí FAQ schema", "FAQPage schema markup umožňuje AI asistentům přímo odpovídat na otázky z vašeho webu.", 5, 3);
  }

  if (!ai.articleSchemaPresent && main.siteStructure.pageType === "blog-post") {
    f("notice", "ai-visibility", "Chybí Article schema", "Blog post nemá Article/BlogPosting schema. AI systémy lépe indexují strukturovaný obsah.", 4, 3);
  }

  if (ai.metadataCompletenessScore < 70) {
    f("warning", "ai-visibility", "Neúplná metadata", `Skóre kompletnosti metadat je ${ai.metadataCompletenessScore}/100. Doplňte chybějící meta tagy.`, 5, 2);
  }

  if (ai.schemaRichness === 0) {
    f("warning", "ai-visibility", "Žádná Schema.org data", "Web nemá žádná strukturovaná data. AI systémy je používají pro pochopení kontextu.", 6, 4);
  }

  if (!ai.cleanUrlStructure) {
    f("notice", "ai-visibility", "URL struktura není optimální", "URL obsahuje parametry, velká písmena nebo podtržítka. Čisté URL zlepšují čitelnost pro AI.", 3, 3);
  }

  return findings;
}
