/**
 * Internal Link Graph Analysis & Orphan Page Detection
 *
 * Builds a directed graph of all internal links, computes PageRank,
 * crawl depth, and detects orphan pages.
 */

import * as cheerio from "cheerio";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LinkPosition = "header" | "nav" | "sidebar" | "content" | "footer";

export interface InternalLink {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  isNavigation: boolean;
  isContentLink: boolean;
  isBreadcrumb: boolean;
  isFooter: boolean;
  position: LinkPosition;
  followable: boolean;
  sourcePageType: string;
  targetPageType: string;
}

export interface PageMetrics {
  url: string;
  inboundLinks: number;
  outboundLinks: number;
  crawlDepth: number;
  internalPageRank: number;
  anchorTextVariety: number;
  linkEquityScore: number;
}

export interface OrphanPage {
  url: string;
  type: "full" | "weak" | "unreachable";
  reason: string;
  suggestedLinkFrom: string[];
}

export interface DepthBucket {
  depth: number;
  count: number;
  urls: string[];
}

export interface AnchorTextIssue {
  url: string;
  anchorText: string;
  issue: "generic" | "empty" | "duplicate-keyword";
}

export interface LinkGraphResult {
  edges: InternalLink[];
  metrics: PageMetrics[];
  orphanPages: OrphanPage[];
  depthHistogram: DepthBucket[];
  anchorTextIssues: AnchorTextIssue[];
  anchorTextStats: {
    total: number;
    descriptive: number;
    generic: number;
    empty: number;
    descriptivePercent: number;
  };
  summary: {
    totalPages: number;
    totalInternalLinks: number;
    avgInboundLinks: number;
    avgOutboundLinks: number;
    maxCrawlDepth: number;
    orphanCount: number;
    deepPageCount: number;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GENERIC_ANCHORS = new Set([
  "zde", "here", "klikněte", "click", "více", "more", "čtěte dále",
  "read more", "odkaz", "link", "tady", "sem", "podrobnosti", "details",
  "zobrazit", "view", "otevřít", "open", "další", "next", "zpět", "back",
  "info", "informace", "více informací", "zjistit více", "learn more",
]);

const DAMPING_FACTOR = 0.85;
const PAGERANK_ITERATIONS = 20;

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export function buildLinkGraph(
  pages: { url: string; html: string; pageType?: string }[],
  siteUrl: string
): LinkGraphResult {
  const baseUrl = normalizeUrl(siteUrl);
  const pageMap = new Map<string, { html: string; pageType: string }>();

  for (const page of pages) {
    const normalized = normalizeUrl(page.url);
    pageMap.set(normalized, { html: page.html, pageType: page.pageType || "other" });
  }

  const allPageUrls = new Set(pageMap.keys());

  // 1. Extract all internal links
  const edges = extractAllLinks(pageMap, baseUrl, allPageUrls);

  // 2. Build adjacency lists
  const { inbound, outbound } = buildAdjacencyLists(edges, allPageUrls);

  // 3. Compute crawl depth via BFS
  const crawlDepths = computeCrawlDepth(outbound, baseUrl, allPageUrls);

  // 4. Compute PageRank
  const pageRank = computePageRank(outbound, allPageUrls);

  // 5. Compute per-page metrics
  const metrics = computeMetrics(allPageUrls, inbound, outbound, crawlDepths, pageRank, edges);

  // 6. Detect orphan pages
  const orphanPages = detectOrphanPages(allPageUrls, inbound, edges, crawlDepths, baseUrl);

  // 7. Crawl depth histogram
  const depthHistogram = buildDepthHistogram(crawlDepths);

  // 8. Anchor text analysis
  const { issues: anchorTextIssues, stats: anchorTextStats } = analyzeAnchorTexts(edges);

  // 9. Summary
  const inboundCounts = Array.from(allPageUrls).map(u => inbound.get(u)?.length || 0);
  const outboundCounts = Array.from(allPageUrls).map(u => outbound.get(u)?.length || 0);
  const maxDepth = Math.max(...Array.from(crawlDepths.values()));
  const deepPages = Array.from(crawlDepths.entries()).filter(([, d]) => d > 3);

  const summary = {
    totalPages: allPageUrls.size,
    totalInternalLinks: edges.length,
    avgInboundLinks: allPageUrls.size > 0 ? Math.round((inboundCounts.reduce((a, b) => a + b, 0) / allPageUrls.size) * 10) / 10 : 0,
    avgOutboundLinks: allPageUrls.size > 0 ? Math.round((outboundCounts.reduce((a, b) => a + b, 0) / allPageUrls.size) * 10) / 10 : 0,
    maxCrawlDepth: isFinite(maxDepth) ? maxDepth : 0,
    orphanCount: orphanPages.length,
    deepPageCount: deepPages.length,
  };

  return {
    edges,
    metrics,
    orphanPages,
    depthHistogram,
    anchorTextIssues,
    anchorTextStats,
    summary,
  };
}

// ─── Link Extraction ──────────────────────────────────────────────────────────

function extractAllLinks(
  pageMap: Map<string, { html: string; pageType: string }>,
  baseUrl: string,
  allPageUrls: Set<string>
): InternalLink[] {
  const edges: InternalLink[] = [];

  for (const [sourceUrl, { html, pageType: sourcePageType }] of pageMap) {
    const $ = cheerio.load(html);

    $("a[href]").each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href");
      if (!href) return;

      const resolvedUrl = resolveUrl(href, sourceUrl, baseUrl);
      if (!resolvedUrl) return;

      const normalized = normalizeUrl(resolvedUrl);

      // Only consider links to known internal pages
      // Also allow links to pages on the same domain even if not crawled
      const parsedBase = safeParseUrl(baseUrl);
      const parsedTarget = safeParseUrl(normalized);
      if (!parsedBase || !parsedTarget) return;
      if (parsedTarget.hostname !== parsedBase.hostname) return;

      // Skip self-links, anchors-only, mailto, tel, javascript
      if (normalized === normalizeUrl(sourceUrl)) return;

      const anchorText = $el.text().trim();
      const rel = ($el.attr("rel") || "").toLowerCase();
      const followable = !rel.includes("nofollow");

      // Determine position
      const position = detectLinkPosition($, el);
      const isNavigation = position === "header" || position === "nav";
      const isBreadcrumb = !!$el.closest('[class*="breadcrumb"], [aria-label*="breadcrumb"], nav[aria-label*="drobečk"], ol.breadcrumb').length;
      const isFooter = position === "footer";
      const isContentLink = position === "content" && !isBreadcrumb;

      // Determine target page type
      const targetData = pageMap.get(normalized);
      const targetPageType = targetData?.pageType || guessPageType(normalized);

      edges.push({
        sourceUrl,
        targetUrl: normalized,
        anchorText,
        isNavigation,
        isContentLink,
        isBreadcrumb,
        isFooter,
        position,
        followable,
        sourcePageType,
        targetPageType,
      });
    });
  }

  return edges;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function detectLinkPosition($: cheerio.CheerioAPI, el: any): LinkPosition {
  const $el = $(el);

  if ($el.closest("header, [role='banner'], nav.main-nav, .site-header, #header").length) {
    return "header";
  }
  if ($el.closest("nav, [role='navigation'], .nav, .navbar, .menu, .navigation").length) {
    return "nav";
  }
  if ($el.closest("aside, [role='complementary'], .sidebar, #sidebar, .widget-area").length) {
    return "sidebar";
  }
  if ($el.closest("footer, [role='contentinfo'], .site-footer, #footer, .footer").length) {
    return "footer";
  }

  return "content";
}

// ─── Adjacency Lists ─────────────────────────────────────────────────────────

function buildAdjacencyLists(edges: InternalLink[], allPageUrls: Set<string>) {
  const inbound = new Map<string, InternalLink[]>();
  const outbound = new Map<string, InternalLink[]>();

  for (const url of allPageUrls) {
    inbound.set(url, []);
    outbound.set(url, []);
  }

  for (const edge of edges) {
    outbound.get(edge.sourceUrl)?.push(edge);
    // Inbound: only track if target is a known page
    if (allPageUrls.has(edge.targetUrl)) {
      inbound.get(edge.targetUrl)?.push(edge);
    }
  }

  return { inbound, outbound };
}

// ─── Crawl Depth (BFS) ───────────────────────────────────────────────────────

function computeCrawlDepth(
  outbound: Map<string, InternalLink[]>,
  startUrl: string,
  allPageUrls: Set<string>
): Map<string, number> {
  const depths = new Map<string, number>();
  const normalizedStart = normalizeUrl(startUrl);

  // Find the homepage — try exact match first, then match by path "/"
  let homepageUrl = normalizedStart;
  if (!allPageUrls.has(homepageUrl)) {
    for (const url of allPageUrls) {
      const parsed = safeParseUrl(url);
      if (parsed && (parsed.pathname === "/" || parsed.pathname === "")) {
        homepageUrl = url;
        break;
      }
    }
    // If still not found, use first page
    if (!allPageUrls.has(homepageUrl)) {
      homepageUrl = allPageUrls.values().next().value || normalizedStart;
    }
  }

  const queue: { url: string; depth: number }[] = [{ url: homepageUrl, depth: 0 }];
  depths.set(homepageUrl, 0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const links = outbound.get(current.url) || [];

    for (const link of links) {
      if (!depths.has(link.targetUrl) && allPageUrls.has(link.targetUrl)) {
        depths.set(link.targetUrl, current.depth + 1);
        queue.push({ url: link.targetUrl, depth: current.depth + 1 });
      }
    }
  }

  // Pages not reachable get depth Infinity
  for (const url of allPageUrls) {
    if (!depths.has(url)) {
      depths.set(url, Infinity);
    }
  }

  return depths;
}

// ─── PageRank ─────────────────────────────────────────────────────────────────

function computePageRank(
  outbound: Map<string, InternalLink[]>,
  allPageUrls: Set<string>
): Map<string, number> {
  const n = allPageUrls.size;
  if (n === 0) return new Map();

  const urls = Array.from(allPageUrls);
  const urlIndex = new Map<string, number>();
  urls.forEach((url, i) => urlIndex.set(url, i));

  // Build outbound target counts (unique targets only)
  const outLinks: Set<number>[] = urls.map(() => new Set<number>());
  for (const [sourceUrl, links] of outbound) {
    const srcIdx = urlIndex.get(sourceUrl);
    if (srcIdx === undefined) continue;
    for (const link of links) {
      const tgtIdx = urlIndex.get(link.targetUrl);
      if (tgtIdx !== undefined && link.followable) {
        outLinks[srcIdx].add(tgtIdx);
      }
    }
  }

  // Initialize PageRank
  let pr = new Float64Array(n).fill(1 / n);
  const newPr = new Float64Array(n);

  for (let iter = 0; iter < PAGERANK_ITERATIONS; iter++) {
    newPr.fill((1 - DAMPING_FACTOR) / n);

    for (let i = 0; i < n; i++) {
      const outCount = outLinks[i].size;
      if (outCount === 0) {
        // Dangling node: distribute evenly
        const share = pr[i] / n;
        for (let j = 0; j < n; j++) {
          newPr[j] += DAMPING_FACTOR * share;
        }
      } else {
        const share = pr[i] / outCount;
        for (const j of outLinks[i]) {
          newPr[j] += DAMPING_FACTOR * share;
        }
      }
    }

    pr = new Float64Array(newPr);
  }

  // Normalize to 0-100
  const maxPr = Math.max(...pr);
  const minPr = Math.min(...pr);
  const range = maxPr - minPr || 1;

  const result = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    result.set(urls[i], Math.round(((pr[i] - minPr) / range) * 100 * 10) / 10);
  }

  return result;
}

// ─── Per-Page Metrics ─────────────────────────────────────────────────────────

function computeMetrics(
  allPageUrls: Set<string>,
  inbound: Map<string, InternalLink[]>,
  outbound: Map<string, InternalLink[]>,
  crawlDepths: Map<string, number>,
  pageRank: Map<string, number>,
  edges: InternalLink[]
): PageMetrics[] {
  return Array.from(allPageUrls).map(url => {
    const inLinks = inbound.get(url) || [];
    const outLinks = outbound.get(url) || [];

    // Anchor text variety: unique anchor texts pointing to this page
    const anchors = new Set(inLinks.map(l => l.anchorText.toLowerCase()).filter(Boolean));
    const anchorTextVariety = anchors.size;

    // Link equity score: weighted inbound links
    // Content links = 3, nav links = 1, footer links = 0.5, breadcrumb = 0.5
    let linkEquity = 0;
    for (const link of inLinks) {
      if (!link.followable) continue;
      if (link.isContentLink) linkEquity += 3;
      else if (link.isNavigation) linkEquity += 1;
      else if (link.isBreadcrumb) linkEquity += 0.5;
      else if (link.isFooter) linkEquity += 0.5;
      else linkEquity += 1;
    }

    const depth = crawlDepths.get(url) ?? Infinity;

    return {
      url,
      inboundLinks: inLinks.length,
      outboundLinks: outLinks.length,
      crawlDepth: isFinite(depth) ? depth : -1,
      internalPageRank: pageRank.get(url) ?? 0,
      anchorTextVariety,
      linkEquityScore: Math.round(linkEquity * 10) / 10,
    };
  });
}

// ─── Orphan Page Detection ────────────────────────────────────────────────────

function detectOrphanPages(
  allPageUrls: Set<string>,
  inbound: Map<string, InternalLink[]>,
  edges: InternalLink[],
  crawlDepths: Map<string, number>,
  baseUrl: string
): OrphanPage[] {
  const orphans: OrphanPage[] = [];
  const normalizedBase = normalizeUrl(baseUrl);

  for (const url of allPageUrls) {
    // Skip homepage
    const parsed = safeParseUrl(url);
    if (!parsed) continue;
    if (url === normalizedBase || parsed.pathname === "/" || parsed.pathname === "") continue;

    const inLinks = inbound.get(url) || [];
    const depth = crawlDepths.get(url) ?? Infinity;

    if (inLinks.length === 0) {
      // Full orphan: zero internal links
      orphans.push({
        url,
        type: "full",
        reason: "Stránka nemá žádné interní odkazy — je neviditelná pro vyhledávače.",
        suggestedLinkFrom: suggestLinkSources(url, allPageUrls, baseUrl),
      });
    } else if (!isFinite(depth)) {
      // Unreachable through navigation
      orphans.push({
        url,
        type: "unreachable",
        reason: "Stránka je nedostupná přes navigaci z hlavní stránky.",
        suggestedLinkFrom: suggestLinkSources(url, allPageUrls, baseUrl),
      });
    } else {
      // Check for weak orphan — only nav/footer links, no content links
      const hasContentLink = inLinks.some(l => l.isContentLink);
      const hasNavOrFooterOnly = inLinks.every(l => l.isNavigation || l.isFooter || l.isBreadcrumb);

      if (!hasContentLink && hasNavOrFooterOnly && inLinks.length <= 2) {
        orphans.push({
          url,
          type: "weak",
          reason: "Stránka má pouze navigační/patičkové odkazy — chybí kontextové odkazy z obsahu.",
          suggestedLinkFrom: suggestLinkSources(url, allPageUrls, baseUrl),
        });
      }
    }
  }

  return orphans;
}

function suggestLinkSources(
  targetUrl: string,
  allPageUrls: Set<string>,
  baseUrl: string
): string[] {
  const suggestions: string[] = [];
  const targetParts = extractUrlParts(targetUrl);

  for (const candidateUrl of allPageUrls) {
    if (candidateUrl === targetUrl) continue;
    if (suggestions.length >= 3) break;

    const candidateParts = extractUrlParts(candidateUrl);

    // Suggest pages with similar URL structure (shared path prefix)
    if (targetParts.pathSegments.length > 1 && candidateParts.pathSegments.length > 1) {
      if (targetParts.pathSegments[0] === candidateParts.pathSegments[0]) {
        suggestions.push(candidateUrl);
        continue;
      }
    }

    // Suggest homepage
    const parsed = safeParseUrl(candidateUrl);
    if (parsed && (parsed.pathname === "/" || parsed.pathname === "")) {
      suggestions.push(candidateUrl);
    }
  }

  return suggestions;
}

function extractUrlParts(url: string): { pathSegments: string[] } {
  const parsed = safeParseUrl(url);
  if (!parsed) return { pathSegments: [] };
  return {
    pathSegments: parsed.pathname.split("/").filter(Boolean),
  };
}

// ─── Depth Histogram ──────────────────────────────────────────────────────────

function buildDepthHistogram(crawlDepths: Map<string, number>): DepthBucket[] {
  const buckets = new Map<number, string[]>();

  for (const [url, depth] of crawlDepths) {
    const d = isFinite(depth) ? depth : -1; // -1 = unreachable
    if (!buckets.has(d)) buckets.set(d, []);
    buckets.get(d)!.push(url);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([depth, urls]) => ({ depth, count: urls.length, urls }));
}

// ─── Anchor Text Analysis ─────────────────────────────────────────────────────

function analyzeAnchorTexts(edges: InternalLink[]): {
  issues: AnchorTextIssue[];
  stats: LinkGraphResult["anchorTextStats"];
} {
  const issues: AnchorTextIssue[] = [];
  let descriptive = 0;
  let generic = 0;
  let empty = 0;

  // Track anchor texts per target URL for keyword cannibalization
  const anchorsByTarget = new Map<string, string[]>();

  for (const edge of edges) {
    const text = edge.anchorText.trim().toLowerCase();

    if (!text || text.length === 0) {
      empty++;
      issues.push({ url: edge.sourceUrl, anchorText: "(prázdný)", issue: "empty" });
    } else if (GENERIC_ANCHORS.has(text)) {
      generic++;
      issues.push({ url: edge.sourceUrl, anchorText: edge.anchorText, issue: "generic" });
    } else {
      descriptive++;
    }

    if (text) {
      if (!anchorsByTarget.has(edge.targetUrl)) anchorsByTarget.set(edge.targetUrl, []);
      anchorsByTarget.get(edge.targetUrl)!.push(text);
    }
  }

  // Detect keyword cannibalization: same anchor text pointing to different URLs
  const anchorToTargets = new Map<string, Set<string>>();
  for (const [targetUrl, anchors] of anchorsByTarget) {
    for (const anchor of anchors) {
      if (GENERIC_ANCHORS.has(anchor)) continue;
      if (!anchorToTargets.has(anchor)) anchorToTargets.set(anchor, new Set());
      anchorToTargets.get(anchor)!.add(targetUrl);
    }
  }

  for (const [anchor, targets] of anchorToTargets) {
    if (targets.size > 1) {
      for (const targetUrl of targets) {
        issues.push({ url: targetUrl, anchorText: anchor, issue: "duplicate-keyword" });
      }
    }
  }

  const total = descriptive + generic + empty;

  return {
    issues,
    stats: {
      total,
      descriptive,
      generic,
      empty,
      descriptivePercent: total > 0 ? Math.round((descriptive / total) * 100) : 0,
    },
  };
}

// ─── URL Utilities ────────────────────────────────────────────────────────────

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove trailing slash, hash, common tracking params
    let pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    if (pathname === "") pathname = "/";
    return `${parsed.protocol}//${parsed.hostname}${pathname}`.toLowerCase();
  } catch {
    return url.toLowerCase().replace(/\/+$/, "");
  }
}

function resolveUrl(href: string, sourceUrl: string, baseUrl: string): string | null {
  // Skip non-page links
  if (
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("javascript:") ||
    href.startsWith("#") ||
    href.startsWith("data:")
  ) {
    return null;
  }

  try {
    return new URL(href, sourceUrl).toString();
  } catch {
    return null;
  }
}

function safeParseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function guessPageType(url: string): string {
  const path = safeParseUrl(url)?.pathname?.toLowerCase() || "";
  if (path === "/" || path === "") return "homepage";
  if (path.includes("blog") || path.includes("clanek") || path.includes("aktuality")) return "blog-post";
  if (path.includes("produkt") || path.includes("product")) return "product-detail";
  if (path.includes("sluzb") || path.includes("service")) return "services";
  if (path.includes("kontakt") || path.includes("contact")) return "contact";
  if (path.includes("o-nas") || path.includes("about")) return "about";
  if (path.includes("cenik") || path.includes("pric")) return "pricing";
  if (path.includes("galeri") || path.includes("gallery")) return "gallery";
  return "other";
}
