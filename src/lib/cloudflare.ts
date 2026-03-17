import type { CrawledImage, CrawledProduct, CrawledBlogPost, NavigationStructure, ExtractedAssets, PageType, SiteType } from "./supabase";

export type { ExtractedAssets };

export interface CrawledPage {
  url: string;
  title: string;
  markdown: string;
  html: string;
  pageType?: PageType;
}

export interface CrawlResult {
  success: boolean;
  pages: CrawledPage[];
  assets?: ExtractedAssets;
  error?: string;
}

export interface CrawlOptions {
  /** Called with partial pages during polling so the caller can persist progress. */
  onProgress?: (pages: CrawledPage[]) => void;
}

const CRAWL_PAGE_LIMIT = 20;

// ── Language variant deduplication ──
// Common language prefixes in URL paths (ISO 639-1 codes and common variants)
const LANG_PREFIX_PATTERN = /^\/(af|am|ar|az|be|bg|bn|bs|ca|cs|cy|da|de|el|en|es|et|eu|fa|fi|fil|fr|ga|gl|gu|ha|he|hi|hr|hu|hy|id|ig|is|it|ja|jv|ka|kk|km|kn|ko|ku|ky|lb|lo|lt|lv|mk|ml|mn|mr|ms|mt|my|nb|ne|nl|nn|no|or|pa|pl|pt|pt-br|ro|ru|rw|sd|si|sk|sl|so|sq|sr|sv|sw|ta|te|tg|th|tk|tl|tr|uk|ur|uz|vi|xh|yo|zh|zh-cn|zh-tw|zu)(\/|$)/i;

/**
 * Deduplicate language variants — keep only the primary language version of each page.
 * For example, if we have /heavy-duty-shelving, /fr/heavy-duty-shelving, /de/heavy-duty-shelving,
 * we keep only the root (non-prefixed) version.
 */
function deduplicateLanguageVariants(pages: CrawledPage[], baseUrl: string): CrawledPage[] {
  let base: URL;
  try { base = new URL(baseUrl); } catch { return pages; }

  // Group pages by their "canonical path" (path without language prefix)
  const canonicalGroups = new Map<string, CrawledPage[]>();

  for (const page of pages) {
    try {
      const pageUrl = new URL(page.url);
      // Only process pages from the same domain
      if (pageUrl.hostname !== base.hostname) {
        // Keep external pages as-is
        const key = `__external__${page.url}`;
        canonicalGroups.set(key, [page]);
        continue;
      }

      const path = pageUrl.pathname;
      const langMatch = path.match(LANG_PREFIX_PATTERN);

      let canonicalPath: string;
      if (langMatch) {
        // Strip the language prefix to get canonical path
        canonicalPath = path.replace(LANG_PREFIX_PATTERN, '/');
        if (canonicalPath === '') canonicalPath = '/';
      } else {
        canonicalPath = path;
      }

      // Normalize trailing slashes for grouping
      canonicalPath = canonicalPath.replace(/\/+$/, '') || '/';

      const existing = canonicalGroups.get(canonicalPath) || [];
      existing.push(page);
      canonicalGroups.set(canonicalPath, existing);
    } catch {
      // If URL parsing fails, keep the page
      canonicalGroups.set(`__fallback__${page.url}`, [page]);
    }
  }

  // From each group, pick the best page (prefer root/English version, then first found)
  const deduplicated: CrawledPage[] = [];

  for (const [, group] of canonicalGroups) {
    if (group.length === 1) {
      deduplicated.push(group[0]);
      continue;
    }

    // Prefer the version without language prefix (root URL)
    const rootVersion = group.find(p => {
      try {
        const path = new URL(p.url).pathname;
        return !LANG_PREFIX_PATTERN.test(path);
      } catch { return false; }
    });

    // Fallback: prefer English version
    const enVersion = group.find(p => {
      try {
        return /^\/(en)(\/|$)/i.test(new URL(p.url).pathname);
      } catch { return false; }
    });

    deduplicated.push(rootVersion || enVersion || group[0]);

    if (group.length > 1) {
      console.log(`[crawl] Deduplicated ${group.length} language variants for path, kept: ${(rootVersion || enVersion || group[0]).url}`);
    }
  }

  console.log(`[crawl] Language dedup: ${pages.length} pages → ${deduplicated.length} unique pages`);
  return deduplicated;
}

// ── Page type classification by URL patterns ──

const PAGE_TYPE_PATTERNS: { type: PageType; patterns: RegExp[] }[] = [
  { type: "product-listing", patterns: [/\/products?\/?$/i, /\/shop\/?$/i, /\/catalog\/?$/i, /\/store\/?$/i, /\/collection/i, /\/kategori/i, /\/category/i, /\/produkty\/?$/i, /\/zbozi\/?$/i, /\/sortiment\/?$/i] },
  { type: "product-detail", patterns: [/\/products?\/[^/]+$/i, /\/shop\/[^/]+$/i, /\/item\/[^/]+$/i, /\/zbozi\/[^/]+$/i, /\/produkt\/[^/]+$/i] },
  { type: "blog-listing", patterns: [/\/blog\/?$/i, /\/news\/?$/i, /\/articles?\/?$/i, /\/aktuality\/?$/i, /\/clanky\/?$/i, /\/novinky\/?$/i, /\/magazine\/?$/i] },
  { type: "blog-post", patterns: [/\/blog\/[^/]+$/i, /\/news\/[^/]+$/i, /\/articles?\/[^/]+$/i, /\/aktuality\/[^/]+$/i, /\/clanky\/[^/]+$/i] },
  { type: "about", patterns: [/\/about/i, /\/o-nas/i, /\/o-firme/i, /\/ueber-uns/i, /\/about-us/i, /\/company/i, /\/team/i, /\/tym/i] },
  { type: "contact", patterns: [/\/contact/i, /\/kontakt/i, /\/get-in-touch/i] },
  { type: "gallery", patterns: [/\/gallery/i, /\/galerie/i, /\/portfolio/i, /\/fotogalerie/i, /\/projects?/i, /\/realizace/i, /\/reference/i] },
  { type: "services", patterns: [/\/services/i, /\/sluzby/i, /\/dienstleistungen/i, /\/what-we-do/i, /\/nabidka/i] },
  { type: "pricing", patterns: [/\/pricing/i, /\/ceny/i, /\/ceník/i, /\/plans?/i, /\/preise/i] },
];

function classifyPageType(pageUrl: string, html: string): PageType {
  try {
    const urlObj = new URL(pageUrl);
    const path = urlObj.pathname;

    // Homepage detection
    if (path === "/" || path === "" || path === "/index.html" || path === "/index.php") {
      return "homepage";
    }

    // URL-based classification
    for (const { type, patterns } of PAGE_TYPE_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(path)) return type;
      }
    }

    // Content-based classification for product pages
    const lowerHtml = html.toLowerCase();
    if (lowerHtml.includes("add to cart") || lowerHtml.includes("přidat do košíku") ||
        lowerHtml.includes("buy now") || lowerHtml.includes("koupit") ||
        lowerHtml.includes("price") && lowerHtml.includes("product")) {
      return "product-detail";
    }

    return "other";
  } catch {
    return "other";
  }
}

// ── Page priority for intelligent crawl ordering ──

function getPagePriority(url: string, pageType: PageType): number {
  // Lower number = higher priority
  switch (pageType) {
    case "homepage": return 0;
    case "services": return 1;
    case "product-listing": return 2;
    case "about": return 3;
    case "gallery": return 4;
    case "blog-listing": return 5;
    case "pricing": return 6;
    case "contact": return 7;
    case "product-detail": return 8;
    case "blog-post": return 9;
    case "other": return 10;
  }
}

// ── Site type detection from page types ──

function detectSiteType(pageTypes: Record<string, PageType>): SiteType {
  const types = Object.values(pageTypes);
  const productPages = types.filter(t => t === "product-listing" || t === "product-detail").length;
  const blogPages = types.filter(t => t === "blog-listing" || t === "blog-post").length;
  const galleryPages = types.filter(t => t === "gallery").length;
  const servicePages = types.filter(t => t === "services").length;
  const pricingPages = types.filter(t => t === "pricing").length;

  if (productPages >= 3) return "e-commerce";
  if (productPages >= 1) return "catalog";
  if (blogPages >= 3) return "blog";
  if (galleryPages >= 2 || (galleryPages >= 1 && servicePages === 0)) return "portfolio";
  if (pricingPages >= 1) return "saas";
  return "corporate";
}

/**
 * Smart crawl: homepage-first strategy with targeted subpage fetching.
 *
 * Instead of blindly letting Cloudflare /crawl follow random links (which wastes
 * budget on language variants), we:
 *   1. Fetch the homepage via /content to get full HTML
 *   2. Extract all internal links from the homepage
 *   3. Filter out language variants, duplicates, and low-value URLs
 *   4. Prioritize links by page type (services > products > about > blog > …)
 *   5. Fetch top N subpages in parallel via /content
 *   6. Report progress via onProgress callback
 */
export async function crawlWebsite(url: string, options?: CrawlOptions): Promise<CrawlResult> {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!apiToken || !accountId) {
    console.error("[crawl] Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID");
    throw new Error("Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID");
  }

  const cfBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering`;
  const headers = {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };

  try {
    // ── Step 1: Fetch homepage ──
    console.log(`[crawl] Step 1: Fetching homepage ${url}`);
    const homePage = await fetchSinglePage(url, headers, cfBase);
    if (!homePage) {
      return { success: false, pages: [], error: "Failed to fetch homepage" };
    }
    console.log(`[crawl] Homepage fetched: "${homePage.title}" (${homePage.html.length} chars)`);

    const pages: CrawledPage[] = [homePage];
    if (options?.onProgress) options.onProgress([...pages]);

    // ── Step 2: Extract & prioritize internal links ──
    let siteBase: URL;
    try { siteBase = new URL(url); } catch { siteBase = new URL("https://example.com"); }

    const internalLinks = extractInternalLinks(homePage.html, siteBase);
    console.log(`[crawl] Found ${internalLinks.length} internal links on homepage`);

    // Filter out language variants and low-value URLs
    const filteredLinks = filterAndPrioritizeLinks(internalLinks, siteBase);
    console.log(`[crawl] After filtering: ${filteredLinks.length} unique, high-value links`);

    if (filteredLinks.length === 0) {
      const assets = extractAllAssets(pages, url);
      return { success: true, pages, assets };
    }

    // ── Step 3: Fetch subpages in parallel batches ──
    const maxSubpages = Math.min(filteredLinks.length, CRAWL_PAGE_LIMIT - 1);
    const linksToFetch = filteredLinks.slice(0, maxSubpages);
    console.log(`[crawl] Step 3: Fetching ${linksToFetch.length} subpages...`);

    // Fetch in batches of 5 to avoid overwhelming the API
    const BATCH_SIZE = 5;
    const fetchedUrls = new Set<string>([normalizeUrl(url)]);
    let langVariantsFound = 0;

    for (let i = 0; i < linksToFetch.length; i += BATCH_SIZE) {
      const batch = linksToFetch.slice(i, i + BATCH_SIZE);
      const batchPromises = batch
        .filter(link => !fetchedUrls.has(normalizeUrl(link)))
        .map(async (link) => {
          fetchedUrls.add(normalizeUrl(link));
          return fetchSinglePage(link, headers, cfBase);
        });

      const results = await Promise.allSettled(batchPromises);
      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          pages.push(result.value);
        }
      }

      console.log(`[crawl] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${pages.length} pages total`);
      if (options?.onProgress) options.onProgress([...pages]);
    }

    // ── Step 4: Detect language variants from the pages we have ──
    // Scan all pages for language variant links to report them
    for (const page of pages) {
      const pageLinks = extractInternalLinks(page.html, siteBase);
      for (const link of pageLinks) {
        try {
          const linkPath = new URL(link).pathname;
          if (LANG_PREFIX_PATTERN.test(linkPath)) {
            langVariantsFound++;
          }
        } catch { /* ignore */ }
      }
    }
    if (langVariantsFound > 0) {
      console.log(`[crawl] Detected ${langVariantsFound} language variant links (skipped)`);
    }

    // Sort by page type priority
    pages.sort((a, b) => {
      const aPriority = getPagePriority(a.url, a.pageType || "other");
      const bPriority = getPagePriority(b.url, b.pageType || "other");
      return aPriority - bPriority;
    });

    console.log(`[crawl] Done. ${pages.length} unique pages crawled.`);
    const assets = extractAllAssets(pages, url);
    return { success: true, pages, assets };

  } catch (err) {
    console.error("[crawl] Unexpected error:", err);
    return {
      success: false,
      pages: [],
      error: err instanceof Error ? err.message : "Unknown crawl error",
    };
  }
}

// ── Helper: Fetch a single page via Cloudflare /content endpoint ──

async function fetchSinglePage(
  pageUrl: string,
  headers: Record<string, string>,
  cfBase: string,
): Promise<CrawledPage | null> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${cfBase}/content`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url: pageUrl }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`[crawl] /content ${pageUrl} → ${response.status}`);
      return null;
    }

    const body = await response.text();
    let html: string;

    try {
      const data = JSON.parse(body);
      // CF returns { success, result: "<html>..." } or { html: "..." }
      html = (typeof data.result === "string" ? data.result : "") || (data.html as string) || "";
    } catch {
      // Raw HTML response
      if (body.includes("<html") || body.includes("<!DOCTYPE") || body.includes("<head")) {
        html = body;
      } else {
        return null;
      }
    }

    if (!html || html.length < 100) return null;

    return {
      url: pageUrl,
      title: extractTitle(html),
      markdown: htmlToSimpleMarkdown(html),
      html,
      pageType: classifyPageType(pageUrl, html),
    };
  } catch (err) {
    console.warn(`[crawl] Failed to fetch ${pageUrl}:`, (err as Error).message || err);
    return null;
  }
}

// ── Helper: Extract internal links from HTML ──

function extractInternalLinks(html: string, base: URL): string[] {
  const linkRegex = /<a\b[^>]*\bhref=["']([^"'#]+)["'][^>]*>/gi;
  const links = new Set<string>();
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1].trim();
    if (!href || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;

    try {
      const resolved = new URL(href, base);
      // Only same-domain links
      if (resolved.hostname !== base.hostname) continue;
      // Strip hash and query for cleaner URLs
      resolved.hash = "";
      const clean = resolved.toString();
      links.add(clean);
    } catch { /* ignore malformed URLs */ }
  }

  return Array.from(links);
}

// ── Helper: Filter out language variants and prioritize links ──

function filterAndPrioritizeLinks(links: string[], base: URL): string[] {
  const seen = new Set<string>();
  const scoredLinks: { url: string; priority: number }[] = [];

  // Always skip these patterns
  const SKIP_PATTERNS = [
    /\/wp-content\//i, /\/wp-admin\//i, /\/wp-includes\//i,
    /\/feed\/?$/i, /\/xmlrpc\.php/i, /\/wp-json\//i,
    /\/tag\//i, /\/author\//i, /\/page\/\d+/i,
    /\.(jpg|jpeg|png|gif|svg|webp|pdf|zip|css|js)$/i,
    /\/\?/,  // Query-string URLs
    /\/cart\/?$/i, /\/checkout\/?$/i, /\/login\/?$/i, /\/register\/?$/i,
    /\/privacy/i, /\/terms/i, /\/cookie/i, /\/gdpr/i, /\/impressum/i,
    /\/sitemap/i, /\/search/i,
  ];

  for (const link of links) {
    try {
      const linkUrl = new URL(link);
      const path = linkUrl.pathname;

      // Skip language variants
      if (LANG_PREFIX_PATTERN.test(path)) continue;

      // Skip known low-value patterns
      if (SKIP_PATTERNS.some(p => p.test(path))) continue;

      // Skip homepage (already fetched)
      if (path === "/" || path === "" || path === "/index.html" || path === "/index.php") continue;

      // Normalize for dedup
      const normalized = normalizeUrl(link);
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      // Score by page type
      const pageType = classifyPageType(link, "");
      const priority = getPagePriority(link, pageType);

      scoredLinks.push({ url: link, priority });
    } catch { /* ignore */ }
  }

  // Sort by priority (lower = more important)
  scoredLinks.sort((a, b) => a.priority - b.priority);

  return scoredLinks.map(l => l.url);
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Remove trailing slash, lowercase host, strip hash
    return `${u.protocol}//${u.hostname}${u.pathname.replace(/\/+$/, '') || '/'}`;
  } catch {
    return url;
  }
}

function extractPagesFromRecords(records: Record<string, unknown>[], baseUrl: string): CrawledPage[] {
  return records
    .filter((r) => r.html)
    .map((record) => {
      const html = (record.html as string) || "";
      const metadata = (record.metadata as Record<string, string>) || {};
      const pageUrl = (record.url as string) || baseUrl;
      return {
        url: pageUrl,
        title: metadata.title || extractTitle(html),
        markdown: htmlToSimpleMarkdown(html),
        html,
        pageType: classifyPageType(pageUrl, html),
      };
    });
}

/**
 * Extract all assets from crawled pages with enhanced image/product/blog extraction.
 */
function extractAllAssets(pages: CrawledPage[], baseUrl: string): ExtractedAssets {
  const allHtml = pages.map((p) => p.html).join("\n");
  const assets = extractAssetsFromHtml(allHtml, baseUrl);

  // Build page type map
  const pageTypes: Record<string, PageType> = {};
  for (const page of pages) {
    if (page.pageType) {
      pageTypes[page.url] = page.pageType;
    }
  }
  assets.pageTypes = pageTypes;

  // Detect site type
  assets.siteType = detectSiteType(pageTypes);
  console.log(`[crawl] Detected site type: ${assets.siteType}`);

  // Extract products from product pages
  const productPages = pages.filter(p => p.pageType === "product-detail" || p.pageType === "product-listing");
  if (productPages.length > 0) {
    assets.products = extractProducts(productPages, baseUrl);
    console.log(`[crawl] Extracted ${assets.products.length} products`);
  }

  // Extract blog posts from blog pages
  const blogPages = pages.filter(p => p.pageType === "blog-listing" || p.pageType === "blog-post");
  if (blogPages.length > 0) {
    assets.blogPosts = extractBlogPosts(blogPages, baseUrl);
    console.log(`[crawl] Extracted ${assets.blogPosts.length} blog posts`);
  }

  // Extract navigation structure (header + footer)
  const homePage = pages.find(p => p.pageType === "homepage") || pages[0];
  if (homePage) {
    assets.navigation = extractNavigationStructure(homePage.html, baseUrl);
  }

  // Find hero image (largest/most prominent image from homepage)
  if (!assets.heroImageUrl) {
    const heroImage = findHeroImage(homePage?.html || "", baseUrl, assets.images);
    if (heroImage) {
      assets.heroImageUrl = heroImage;
    }
  }

  return assets;
}

/**
 * Extract products from product pages.
 */
function extractProducts(pages: CrawledPage[], baseUrl: string): CrawledProduct[] {
  const products: CrawledProduct[] = [];
  let base: URL;
  try { base = new URL(baseUrl); } catch { base = new URL("https://example.com"); }
  const resolve = (src: string): string => {
    if (!src || src.startsWith("data:")) return src;
    try { return new URL(src, base).href; } catch { return src; }
  };

  for (const page of pages) {
    const html = page.html;

    if (page.pageType === "product-detail") {
      // Extract single product from detail page
      const name = extractProductName(html) || page.title;
      const description = extractProductDescription(html);
      const price = extractPrice(html);
      const imageUrl = extractProductImage(html, resolve);

      if (name && name !== "Untitled") {
        products.push({ name, description, price, imageUrl, url: page.url });
      }
    } else if (page.pageType === "product-listing") {
      // Extract multiple products from listing page
      const listingProducts = extractProductsFromListing(html, resolve, page.url);
      products.push(...listingProducts);
    }
  }

  return products.slice(0, 30);
}

function extractProductName(html: string): string {
  // Try Schema.org product name
  const schemaMatch = html.match(/"@type"\s*:\s*"Product"[\s\S]*?"name"\s*:\s*"([^"]+)"/i);
  if (schemaMatch) return schemaMatch[1];

  // Try og:title
  const ogMatch = html.match(/<meta\b[^>]*\bproperty=["']og:title["'][^>]*\bcontent=["']([^"']*)["']/i)
    || html.match(/<meta\b[^>]*\bcontent=["']([^"']*)["'][^>]*\bproperty=["']og:title["']/i);
  if (ogMatch) return ogMatch[1];

  // Try h1
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) return h1Match[1].replace(/<[^>]+>/g, "").trim();

  return "";
}

function extractProductDescription(html: string): string {
  // Try Schema.org description
  const schemaMatch = html.match(/"@type"\s*:\s*"Product"[\s\S]*?"description"\s*:\s*"([^"]+)"/i);
  if (schemaMatch) return schemaMatch[1].slice(0, 300);

  // Try meta description
  const metaMatch = html.match(/<meta\b[^>]*\bname=["']description["'][^>]*\bcontent=["']([^"']*)["']/i)
    || html.match(/<meta\b[^>]*\bcontent=["']([^"']*)["'][^>]*\bname=["']description["']/i);
  if (metaMatch) return metaMatch[1].slice(0, 300);

  return "";
}

function extractPrice(html: string): string | undefined {
  // Schema.org price
  const schemaPrice = html.match(/"price"\s*:\s*"?([0-9.,]+)"?/i);
  const schemaCurrency = html.match(/"priceCurrency"\s*:\s*"([^"]+)"/i);
  if (schemaPrice) {
    return `${schemaPrice[1]} ${schemaCurrency?.[1] || ""}`.trim();
  }

  // Common price patterns
  const priceMatch = html.match(/(?:class=["'][^"']*price[^"']*["'][^>]*>)\s*([^<]*\d+[.,]?\d*\s*(?:Kč|CZK|€|EUR|\$|USD)[^<]*)/i);
  if (priceMatch) return priceMatch[1].trim();

  return undefined;
}

function extractProductImage(html: string, resolve: (src: string) => string): string | undefined {
  // Schema.org image
  const schemaImg = html.match(/"@type"\s*:\s*"Product"[\s\S]*?"image"\s*:\s*"([^"]+)"/i);
  if (schemaImg) return resolve(schemaImg[1]);

  // OG image
  const ogImg = html.match(/<meta\b[^>]*\bproperty=["']og:image["'][^>]*\bcontent=["']([^"']*)["']/i)
    || html.match(/<meta\b[^>]*\bcontent=["']([^"']*)["'][^>]*\bproperty=["']og:image["']/i);
  if (ogImg) return resolve(ogImg[1]);

  // First large image in main content area
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (mainMatch) {
    const imgMatch = mainMatch[1].match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
    if (imgMatch && !imgMatch[1].startsWith("data:")) return resolve(imgMatch[1]);
  }

  return undefined;
}

function extractProductsFromListing(html: string, resolve: (src: string) => string, pageUrl: string): CrawledProduct[] {
  const products: CrawledProduct[] = [];

  // Look for product cards/items in listing
  const productCardPatterns = [
    /<(?:div|article|li)\b[^>]*class=["'][^"']*(?:product|item|card)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|article|li)>/gi,
  ];

  for (const pattern of productCardPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null && products.length < 20) {
      const card = match[1];

      // Extract name from heading or link
      const nameMatch = card.match(/<(?:h[1-6]|a)[^>]*>([\s\S]*?)<\/(?:h[1-6]|a)>/i);
      const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, "").trim() : "";
      if (!name || name.length < 2 || name.length > 200) continue;

      // Extract image
      const imgMatch = card.match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
      const imageUrl = imgMatch && !imgMatch[1].startsWith("data:") ? resolve(imgMatch[1]) : undefined;

      // Extract link
      const linkMatch = card.match(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i);
      const url = linkMatch ? resolve(linkMatch[1]) : undefined;

      // Extract description
      const descMatch = card.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim().slice(0, 200) : "";

      // Extract price
      const priceMatch = card.match(/(?:price|cena)[^"']*["'][^>]*>\s*([^<]+)/i)
        || card.match(/(\d+[.,]?\d*\s*(?:Kč|CZK|€|EUR|\$|USD))/i);
      const price = priceMatch ? priceMatch[1].trim() : undefined;

      products.push({ name, description, price, imageUrl, url });
    }
  }

  return products;
}

/**
 * Extract real blog posts from blog pages.
 */
function extractBlogPosts(pages: CrawledPage[], baseUrl: string): CrawledBlogPost[] {
  const posts: CrawledBlogPost[] = [];
  let base: URL;
  try { base = new URL(baseUrl); } catch { base = new URL("https://example.com"); }
  const resolve = (src: string): string => {
    if (!src || src.startsWith("data:")) return src;
    try { return new URL(src, base).href; } catch { return src; }
  };

  for (const page of pages) {
    if (page.pageType === "blog-listing") {
      // Extract multiple posts from listing
      const listingPosts = extractBlogPostsFromListing(page.html, resolve, page.url);
      posts.push(...listingPosts);
    } else if (page.pageType === "blog-post") {
      // Extract single post detail
      const title = page.title;
      const dateMatch = page.html.match(/<time[^>]*datetime=["']([^"']+)["']/i)
        || page.html.match(/(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : undefined;

      const authorMatch = page.html.match(/(?:author|autor)[^"']*["'][^>]*>\s*([^<]+)/i);
      const author = authorMatch ? authorMatch[1].trim() : undefined;

      // Featured image
      const ogImg = page.html.match(/<meta\b[^>]*\bproperty=["']og:image["'][^>]*\bcontent=["']([^"']*)["']/i)
        || page.html.match(/<meta\b[^>]*\bcontent=["']([^"']*)["'][^>]*\bproperty=["']og:image["']/i);
      const featuredImage = ogImg ? resolve(ogImg[1]) : undefined;

      // Excerpt from meta description or first paragraph
      const metaDesc = page.html.match(/<meta\b[^>]*\bname=["']description["'][^>]*\bcontent=["']([^"']*)["']/i);
      const firstP = page.html.match(/<article[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i)
        || page.html.match(/<main[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
      const excerpt = metaDesc?.[1] || firstP?.[1]?.replace(/<[^>]+>/g, "").trim().slice(0, 200) || "";

      if (title && title !== "Untitled") {
        posts.push({ title, date, author, featuredImage, excerpt, url: page.url });
      }
    }
  }

  return posts.slice(0, 10);
}

function extractBlogPostsFromListing(html: string, resolve: (src: string) => string, pageUrl: string): CrawledBlogPost[] {
  const posts: CrawledBlogPost[] = [];

  // Look for article cards
  const articlePatterns = [
    /<article\b[^>]*>([\s\S]*?)<\/article>/gi,
    /<(?:div|li)\b[^>]*class=["'][^"']*(?:post|article|blog|news|entry)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|li)>/gi,
  ];

  for (const pattern of articlePatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null && posts.length < 10) {
      const card = match[1] || match[2] || match[0];

      // Title from heading
      const titleMatch = card.match(/<(?:h[1-6])[^>]*>([\s\S]*?)<\/(?:h[1-6])>/i);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";
      if (!title || title.length < 3 || title.length > 200) continue;

      // Date
      const dateMatch = card.match(/<time[^>]*datetime=["']([^"']+)["']/i)
        || card.match(/(\d{1,2}[./]\s?\d{1,2}[./]\s?\d{2,4})/);
      const date = dateMatch ? dateMatch[1] : undefined;

      // Image
      const imgMatch = card.match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
      const featuredImage = imgMatch && !imgMatch[1].startsWith("data:") ? resolve(imgMatch[1]) : undefined;

      // Excerpt
      const excerptMatch = card.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      const excerpt = excerptMatch ? excerptMatch[1].replace(/<[^>]+>/g, "").trim().slice(0, 200) : "";

      // Link
      const linkMatch = card.match(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i);
      const url = linkMatch ? resolve(linkMatch[1]) : undefined;

      // Author
      const authorMatch = card.match(/(?:author|autor)[^"']*["'][^>]*>\s*([^<]+)/i);
      const author = authorMatch ? authorMatch[1].trim() : undefined;

      posts.push({ title, date, author, featuredImage, excerpt, url });
    }
    if (posts.length > 0) break; // Use first matching pattern
  }

  return posts;
}

/**
 * Extract full navigation structure from HTML.
 */
function extractNavigationStructure(html: string, baseUrl: string): NavigationStructure {
  let base: URL;
  try { base = new URL(baseUrl); } catch { base = new URL("https://example.com"); }
  const resolve = (src: string): string => {
    if (!src || src.startsWith("data:") || src.startsWith("javascript:")) return "";
    try { return new URL(src, base).href; } catch { return src; }
  };

  const extractLinks = (content: string): { text: string; href: string }[] => {
    const links: { text: string; href: string }[] = [];
    const linkRegex = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const href = match[1];
      const text = match[2].replace(/<[^>]+>/g, "").trim();
      if (text && text.length < 60 && !href.startsWith("javascript:") && !href.startsWith("#")) {
        const resolved = resolve(href);
        if (resolved) links.push({ text, href: resolved });
      }
    }
    return links;
  };

  // Header navigation
  const headerMatches = html.match(/<(?:header|nav)\b[^>]*>([\s\S]*?)<\/(?:header|nav)>/gi) || [];
  const headerContent = headerMatches.map(m => m).join("\n");
  const headerLinks = extractLinks(headerContent).slice(0, 15);

  // Footer navigation
  const footerMatches = html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/gi) || [];
  const footerContent = footerMatches.map(m => m).join("\n");
  const footerLinks = extractLinks(footerContent).slice(0, 20);

  return { header: headerLinks, footer: footerLinks };
}

/**
 * Find the best hero image candidate from homepage HTML.
 */
function findHeroImage(html: string, baseUrl: string, images: CrawledImage[]): string | undefined {
  let base: URL;
  try { base = new URL(baseUrl); } catch { base = new URL("https://example.com"); }
  const resolve = (src: string): string => {
    if (!src || src.startsWith("data:")) return src;
    try { return new URL(src, base).href; } catch { return src; }
  };

  const isExcluded = (url: string): boolean => {
    const lower = url.toLowerCase();
    return lower.includes("logo") || lower.includes("icon") || lower.includes("favicon") ||
           lower.startsWith("data:") || lower.includes(".svg") || lower.includes("sprite");
  };

  // 1st priority: OG image (best quality hero candidate)
  const ogImg = html.match(/<meta\b[^>]*\bproperty=["']og:image["'][^>]*\bcontent=["']([^"']*)["']/i)
    || html.match(/<meta\b[^>]*\bcontent=["']([^"']*)["'][^>]*\bproperty=["']og:image["']/i);
  if (ogImg?.[1] && !isExcluded(ogImg[1])) return resolve(ogImg[1]);

  // 2nd priority: Largest image >800px width from crawled images
  const largeImages = images
    .filter(img => !isExcluded(img.url) && img.width && img.width > 800)
    .sort((a, b) => (b.width || 0) - (a.width || 0));
  if (largeImages.length > 0) return largeImages[0].url;

  // 3rd priority: First relevant image (hero context, then background, then content)
  const heroImg = images.find(img => img.context === "hero" && !isExcluded(img.url));
  if (heroImg) return heroImg.url;

  const bgImg = images.find(img => img.context === "background" && !isExcluded(img.url));
  if (bgImg) return bgImg.url;

  // Fallback: hero/banner section in HTML
  const heroSection = html.match(/<(?:section|div)\b[^>]*(?:class|id)=["'][^"']*(?:hero|banner|jumbotron|slider|carousel)[^"']*["'][^>]*>([\s\S]*?)<\/(?:section|div)>/i);
  if (heroSection) {
    const bgMatch = heroSection[0].match(/background(?:-image)?\s*:\s*url\(['"]?([^'")\s]+)['"]?\)/i);
    if (bgMatch && !isExcluded(bgMatch[1])) return resolve(bgMatch[1]);

    const imgMatch = heroSection[1].match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
    if (imgMatch && !isExcluded(imgMatch[1])) return resolve(imgMatch[1]);
  }

  // Last resort: first content image
  const contentImg = images.find(img => img.context === "content" && !isExcluded(img.url));
  if (contentImg) return contentImg.url;

  return undefined;
}

/**
 * Extract visual assets, contact info, navigation, and social links from HTML.
 * Enhanced with image context classification and rich metadata.
 */
function extractAssetsFromHtml(html: string, baseUrl: string): ExtractedAssets {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    base = new URL("https://example.com");
  }

  const resolve = (src: string): string => {
    if (!src || src.startsWith("data:")) return src;
    try {
      return new URL(src, base).href;
    } catch {
      return src;
    }
  };

  // ---------- Logo extraction (fixed: handle attribute order correctly) ----------
  let logo: string | undefined;

  // Find header/nav content — use a greedy match to capture larger nav blocks
  const headerMatches = html.match(/<(?:header|nav)\b[^>]*>([\s\S]*?)<\/(?:header|nav)>/gi) || [];
  const headerContent = headerMatches.map((m) => m).join("\n");

  if (headerContent) {
    // Strategy 1a: img with "logo" anywhere in its attributes, capture src
    const logoImgMatch = headerContent.match(/<img\b[^>]*\blogo\b[^>]*>/i);
    if (logoImgMatch) {
      const srcMatch = logoImgMatch[0].match(/\bsrc=["']([^"']+)["']/i);
      if (srcMatch) logo = resolve(srcMatch[1]);
    }

    // Strategy 1b: img where src URL contains "logo"
    if (!logo) {
      const srcLogoMatch = headerContent.match(/<img\b[^>]*\bsrc=["']([^"']*logo[^"']*)["'][^>]*>/i);
      if (srcLogoMatch) logo = resolve(srcLogoMatch[1]);
    }

    // Strategy 1c: first img in header (fallback)
    if (!logo) {
      const firstImg = headerContent.match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
      if (firstImg) logo = resolve(firstImg[1]);
    }
  }

  // Strategy 2: Any img with "logo" in attributes anywhere on page
  if (!logo) {
    const logoGlobalMatch = html.match(/<img\b[^>]*\blogo\b[^>]*>/i);
    if (logoGlobalMatch) {
      const srcMatch = logoGlobalMatch[0].match(/\bsrc=["']([^"']+)["']/i);
      if (srcMatch) logo = resolve(srcMatch[1]);
    }
    if (!logo) {
      const srcLogoGlobal = html.match(/<img\b[^>]*\bsrc=["']([^"']*logo[^"']*)["'][^>]*>/i);
      if (srcLogoGlobal) logo = resolve(srcLogoGlobal[1]);
    }
  }

  // Strategy 3: SVG logo in header — try to find a sibling img
  if (!logo && headerContent) {
    const svgLogo = headerContent.match(/<a[^>]*>[\s\S]*?<svg[\s\S]*?<\/svg>/i);
    if (svgLogo) {
      const siblingImg = headerContent.match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
      if (siblingImg) logo = resolve(siblingImg[1]);
    }
  }

  // ---------- Favicon extraction ----------
  let favicon: string | undefined;
  const faviconPatterns = [
    /<link\b[^>]*\brel=["'](?:icon|shortcut icon)["'][^>]*\bhref=["']([^"']*)["'][^>]*>/i,
    /<link\b[^>]*\bhref=["']([^"']*)["'][^>]*\brel=["'](?:icon|shortcut icon)["'][^>]*>/i,
    /<link\b[^>]*\brel=["']apple-touch-icon["'][^>]*\bhref=["']([^"']*)["'][^>]*>/i,
  ];
  for (const pattern of faviconPatterns) {
    const match = html.match(pattern);
    if (match) {
      favicon = resolve(match[1]);
      break;
    }
  }
  if (!favicon) {
    favicon = resolve("/favicon.ico");
  }

  // ---------- Meta description / OG description ----------
  let metaDescription: string | undefined;
  const metaDescMatch = html.match(/<meta\b[^>]*\bname=["']description["'][^>]*\bcontent=["']([^"']*)["'][^>]*>/i)
    || html.match(/<meta\b[^>]*\bcontent=["']([^"']*)["'][^>]*\bname=["']description["'][^>]*>/i);
  if (metaDescMatch) {
    metaDescription = metaDescMatch[1];
  }
  if (!metaDescription) {
    const ogDescMatch = html.match(/<meta\b[^>]*\bproperty=["']og:description["'][^>]*\bcontent=["']([^"']*)["'][^>]*>/i)
      || html.match(/<meta\b[^>]*\bcontent=["']([^"']*)["'][^>]*\bproperty=["']og:description["'][^>]*>/i);
    if (ogDescMatch) metaDescription = ogDescMatch[1];
  }

  // ---------- Enhanced image extraction with context ----------
  const images = extractImagesWithContext(html, resolve);

  // ---------- Hero image from OG ----------
  let heroImageUrl: string | undefined;
  const ogImgMatch = html.match(/<meta\b[^>]*\bproperty=["']og:image["'][^>]*\bcontent=["']([^"']*)["']/i)
    || html.match(/<meta\b[^>]*\bcontent=["']([^"']*)["'][^>]*\bproperty=["']og:image["']/i);
  if (ogImgMatch?.[1] && !ogImgMatch[1].includes("logo")) {
    heroImageUrl = resolve(ogImgMatch[1]);
  }

  // ---------- CSS colors extraction ----------
  const colorRegex = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]+\)/g;
  const styleBlocks = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  const inlineStyles = html.match(/style=["']([^"']*)["']/gi) || [];
  const colorSet = new Set<string>();
  for (const block of [...styleBlocks, ...inlineStyles]) {
    const matches = block.match(colorRegex) || [];
    for (const c of matches) {
      if (c === "#fff" || c === "#000" || c === "#ffffff" || c === "#000000") continue;
      if (c.includes("rgba(0,0,0,0)") || c.includes("rgba(0, 0, 0, 0)")) continue;
      colorSet.add(c);
    }
  }

  // ---------- Company name extraction ----------
  let companyName: string | undefined;

  // Strategy 1: og:site_name
  const ogSiteName = html.match(/<meta\b[^>]*\bproperty=["']og:site_name["'][^>]*\bcontent=["']([^"']*)["'][^>]*>/i)
    || html.match(/<meta\b[^>]*\bcontent=["']([^"']*)["'][^>]*\bproperty=["']og:site_name["'][^>]*>/i);
  if (ogSiteName) {
    companyName = ogSiteName[1];
  }

  // Strategy 2: application-name meta
  if (!companyName) {
    const appName = html.match(/<meta\b[^>]*\bname=["']application-name["'][^>]*\bcontent=["']([^"']*)["'][^>]*>/i);
    if (appName) companyName = appName[1];
  }

  // Strategy 3: Schema.org organization name
  if (!companyName) {
    const schemaName = html.match(/"name"\s*:\s*"([^"]+)"/);
    if (schemaName && schemaName[1].length < 60) companyName = schemaName[1];
  }

  // Strategy 4: title tag — first part before separator
  if (!companyName) {
    const title = extractTitle(html);
    if (title !== "Untitled") {
      companyName = title.split(/[|\-–—:]/)[0].trim();
    }
  }

  // ---------- Social media links extraction ----------
  const socialDomains = ["facebook.com", "instagram.com", "twitter.com", "x.com", "linkedin.com", "youtube.com", "tiktok.com", "pinterest.com"];
  const socialLinks: string[] = [];
  const linkHrefRegex = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi;
  let linkMatch;
  const seenSocial = new Set<string>();
  while ((linkMatch = linkHrefRegex.exec(html)) !== null) {
    const href = linkMatch[1];
    for (const domain of socialDomains) {
      if (href.includes(domain) && !seenSocial.has(domain)) {
        seenSocial.add(domain);
        socialLinks.push(href);
        break;
      }
    }
  }

  // ---------- Navigation links extraction ----------
  const navLinks: { text: string; href: string }[] = [];
  if (headerContent) {
    const navLinkRegex = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let navMatch;
    while ((navMatch = navLinkRegex.exec(headerContent)) !== null) {
      const href = navMatch[1];
      // Clean HTML from link text
      const text = navMatch[2].replace(/<[^>]+>/g, "").trim();
      if (text && text.length < 50 && !href.startsWith("javascript:") && !href.startsWith("#")) {
        navLinks.push({ text, href: resolve(href) });
      }
    }
  }

  // ---------- Contact info extraction ----------
  const phoneNumbers: string[] = [];
  const emails: string[] = [];
  let address: string | undefined;

  // Phone numbers (international and local formats)
  const phoneRegex = /(?:\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3}[\s.-]?\d{3,4}/g;
  const telLinkRegex = /<a\b[^>]*\bhref=["']tel:([^"']+)["'][^>]*>/gi;
  const phoneSet = new Set<string>();

  let telMatch;
  while ((telMatch = telLinkRegex.exec(html)) !== null) {
    const phone = telMatch[1].replace(/\s/g, "");
    if (!phoneSet.has(phone) && phone.length >= 9) {
      phoneSet.add(phone);
      phoneNumbers.push(phone);
    }
  }

  // Also look for phone numbers in text
  const plainText = html.replace(/<[^>]+>/g, " ");
  let phoneTextMatch;
  while ((phoneTextMatch = phoneRegex.exec(plainText)) !== null) {
    const phone = phoneTextMatch[0].replace(/[\s()-]/g, "");
    if (!phoneSet.has(phone) && phone.length >= 9 && phone.length <= 15) {
      phoneSet.add(phone);
      phoneNumbers.push(phoneTextMatch[0].trim());
    }
    if (phoneNumbers.length >= 3) break;
  }

  // Emails
  const mailtoRegex = /<a\b[^>]*\bhref=["']mailto:([^"'?]+)[^"']*["'][^>]*>/gi;
  const emailSet = new Set<string>();
  let mailMatch;
  while ((mailMatch = mailtoRegex.exec(html)) !== null) {
    const email = mailMatch[1].toLowerCase();
    if (!emailSet.has(email)) {
      emailSet.add(email);
      emails.push(email);
    }
  }
  // Also look for emails in text
  const emailTextRegex = /[\w.+-]+@[\w.-]+\.\w{2,}/g;
  let emailTextMatch;
  while ((emailTextMatch = emailTextRegex.exec(plainText)) !== null) {
    const email = emailTextMatch[0].toLowerCase();
    if (!emailSet.has(email) && !email.includes("example.") && !email.includes("wixpress")) {
      emailSet.add(email);
      emails.push(email);
    }
    if (emails.length >= 3) break;
  }

  // Address: look for common address patterns near "address" or in structured data
  const addressMatch = html.match(/"streetAddress"\s*:\s*"([^"]+)"/i)
    || html.match(/"address"\s*:\s*\{[^}]*"streetAddress"\s*:\s*"([^"]+)"/i);
  if (addressMatch) {
    address = addressMatch[1];
  }

  return {
    logo,
    favicon,
    images: images.slice(0, 50),
    colors: Array.from(colorSet).slice(0, 20),
    companyName,
    metaDescription,
    socialLinks,
    navLinks: navLinks.slice(0, 15),
    phoneNumbers: phoneNumbers.slice(0, 3),
    emails: emails.slice(0, 3),
    address,
    heroImageUrl,
  };
}

/**
 * Extract images with context — classifies each image by its purpose.
 */
function extractImagesWithContext(html: string, resolve: (src: string) => string): CrawledImage[] {
  const images: CrawledImage[] = [];
  const seen = new Set<string>();

  // Identify section contexts by scanning for section/div with recognizable IDs/classes
  const sectionRegex = /<(?:section|div|article)\b[^>]*(?:class|id)=["']([^"']+)["'][^>]*>([\s\S]*?)<\/(?:section|div|article)>/gi;
  let sectionMatch;

  // First pass: extract images within identified sections
  while ((sectionMatch = sectionRegex.exec(html)) !== null) {
    const sectionId = sectionMatch[1].toLowerCase();
    const sectionContent = sectionMatch[2];

    // Determine section type
    let sectionName = "other";
    if (sectionId.match(/hero|banner|jumbotron|slider|carousel/)) sectionName = "hero";
    else if (sectionId.match(/product|shop|catalog|item/)) sectionName = "product";
    else if (sectionId.match(/gallery|portfolio|photo|image/)) sectionName = "gallery";
    else if (sectionId.match(/about|team|company/)) sectionName = "about";
    else if (sectionId.match(/blog|news|article|post/)) sectionName = "blog";
    else if (sectionId.match(/service|feature|offer/)) sectionName = "services";

    extractImagesFromContent(sectionContent, sectionName, resolve, images, seen);
  }

  // Second pass: extract all remaining images from the full HTML
  extractImagesFromContent(html, "content", resolve, images, seen);

  return images;
}

function extractImagesFromContent(
  content: string,
  defaultSection: string,
  resolve: (src: string) => string,
  images: CrawledImage[],
  seen: Set<string>
): void {
  const imgRegex = /<img\b([^>]*)>/gi;
  let m;

  while ((m = imgRegex.exec(content)) !== null && images.length < 60) {
    const attrs = m[1];

    // Extract src
    const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const rawSrc = srcMatch[1];
    if (rawSrc.startsWith("data:") || rawSrc.includes("1x1") || rawSrc.includes("pixel") || rawSrc.includes("spacer")) continue;

    const imgUrl = resolve(rawSrc);
    if (seen.has(imgUrl)) continue;
    seen.add(imgUrl);

    // Extract alt
    const altMatch = attrs.match(/\balt=["']([^"']*)["']/i);
    const alt = altMatch?.[1] || "";

    // Classify image context
    let context: CrawledImage["context"] = "other";
    const lowerSrc = rawSrc.toLowerCase();
    const lowerAlt = alt.toLowerCase();
    const lowerAttrs = attrs.toLowerCase();

    if (lowerSrc.includes("logo") || lowerAlt.includes("logo") || lowerAttrs.includes("logo")) {
      context = "logo";
    } else if (lowerSrc.includes("icon") || lowerAlt.includes("icon") || lowerAttrs.includes("icon") ||
               (attrs.match(/width=["'](\d+)["']/i)?.[1] && parseInt(attrs.match(/width=["'](\d+)["']/i)![1]) <= 48)) {
      context = "icon";
    } else if (defaultSection === "hero" || lowerAttrs.includes("hero") || lowerAttrs.includes("banner")) {
      context = "hero";
    } else if (defaultSection === "product" || lowerAttrs.includes("product")) {
      context = "product";
    } else if (defaultSection === "gallery" || lowerAttrs.includes("gallery") || lowerAttrs.includes("lightbox")) {
      context = "gallery";
    } else if (lowerSrc.includes("bg") || lowerSrc.includes("background")) {
      context = "background";
    } else {
      context = "content";
    }

    // Extract dimensions
    const widthMatch = attrs.match(/\bwidth=["'](\d+)["']/i);
    const heightMatch = attrs.match(/\bheight=["'](\d+)["']/i);
    const width = widthMatch ? parseInt(widthMatch[1]) : undefined;
    const height = heightMatch ? parseInt(heightMatch[1]) : undefined;
    const aspectRatio = width && height ? `${width}:${height}` : undefined;

    // Get highest resolution from srcset
    const srcsetMatch = attrs.match(/\bsrcset=["']([^"']*)["']/i);
    let bestUrl = imgUrl;
    if (srcsetMatch) {
      const srcsetParts = srcsetMatch[1].split(",").map((s) => s.trim().split(/\s+/));
      const highRes = srcsetParts.sort((a, b) => {
        const aW = parseInt(a[1]) || 0;
        const bW = parseInt(b[1]) || 0;
        return bW - aW;
      })[0];
      if (highRes?.[0]) {
        const hiUrl = resolve(highRes[0]);
        if (hiUrl && !seen.has(hiUrl)) {
          bestUrl = hiUrl;
          seen.add(hiUrl);
        }
      }
    }

    // Get surrounding text for context
    const surroundingText = extractSurroundingText(content, m.index, m[0].length);

    images.push({
      url: bestUrl,
      alt,
      context,
      section: defaultSection,
      surroundingText,
      width,
      height,
      aspectRatio,
    });
  }
}

function extractSurroundingText(html: string, imgIndex: number, imgLength: number): string | undefined {
  // Look for text within 200 chars before and after the image
  const before = html.slice(Math.max(0, imgIndex - 200), imgIndex);
  const after = html.slice(imgIndex + imgLength, imgIndex + imgLength + 200);
  const nearbyText = (before + " " + after)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  return nearbyText || undefined;
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1]?.trim() || "Untitled";
}

/**
 * Enhanced HTML to markdown converter.
 * Handles tables, blockquotes, code blocks, and more semantic elements.
 */
function htmlToSimpleMarkdown(html: string): string {
  let md = html;

  // Remove script, style, noscript, svg, and template tags with content
  md = md.replace(/<script[\s\S]*?<\/script>/gi, "");
  md = md.replace(/<style[\s\S]*?<\/style>/gi, "");
  md = md.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  md = md.replace(/<svg[\s\S]*?<\/svg>/gi, "");
  md = md.replace(/<template[\s\S]*?<\/template>/gi, "");

  // Convert headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n");
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n");
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n");
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n");
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, "\n##### $1\n");
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, "\n###### $1\n");

  // Convert blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    const lines = content.replace(/<[^>]+>/g, "").trim().split("\n");
    return "\n" + lines.map((l: string) => `> ${l.trim()}`).join("\n") + "\n";
  });

  // Convert code blocks
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, "\n```\n$1\n```\n");
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "\n```\n$1\n```\n");
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");

  // Convert tables
  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableContent) => {
    const rows: string[] = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    let isFirstRow = true;
    while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
      const cells: string[] = [];
      const cellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        cells.push(cellMatch[1].replace(/<[^>]+>/g, "").trim());
      }
      if (cells.length > 0) {
        rows.push("| " + cells.join(" | ") + " |");
        if (isFirstRow) {
          rows.push("| " + cells.map(() => "---").join(" | ") + " |");
          isFirstRow = false;
        }
      }
    }
    return rows.length > 0 ? "\n" + rows.join("\n") + "\n" : "";
  });

  // Convert definition lists
  md = md.replace(/<dt[^>]*>([\s\S]*?)<\/dt>/gi, "\n**$1**\n");
  md = md.replace(/<dd[^>]*>([\s\S]*?)<\/dd>/gi, ": $1\n");

  // Convert paragraphs and line breaks
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n");
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<hr\s*\/?>/gi, "\n---\n");

  // Convert links
  md = md.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");

  // Convert bold and italic
  md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**");
  md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*");
  md = md.replace(/<(del|s|strike)[^>]*>([\s\S]*?)<\/\1>/gi, "~~$2~~");
  md = md.replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, "==$1==");
  md = md.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, "$1");
  md = md.replace(/<sub[^>]*>([\s\S]*?)<\/sub>/gi, "$1");
  md = md.replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi, "$1");

  // Convert ordered lists
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, listContent) => {
    let counter = 0;
    return "\n" + listContent.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_: string, itemContent: string) => {
      counter++;
      return `${counter}. ${itemContent.replace(/<[^>]+>/g, "").trim()}\n`;
    }) + "\n";
  });

  // Then unordered lists
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");
  md = md.replace(/<\/?[ou]l[^>]*>/gi, "\n");

  // Convert images
  md = md.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*\/?>/gi, "![$1]($2)");
  md = md.replace(/<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, "![$2]($1)");
  md = md.replace(/<img[^>]*src=["']([^"']*)["'][^>]*\/?>/gi, "![]($1)");

  // Convert figure/figcaption
  md = md.replace(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/gi, "*$1*\n");
  md = md.replace(/<\/?figure[^>]*>/gi, "\n");

  // Convert semantic sections to visual separators
  md = md.replace(/<\/?(?:section|article|aside|details|summary|dialog|main|header|footer|nav)[^>]*>/gi, "\n");
  md = md.replace(/<\/?(?:div|span|form|fieldset|legend)[^>]*>/gi, "");

  // Remove remaining HTML tags
  md = md.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  md = md.replace(/&amp;/g, "&");
  md = md.replace(/&lt;/g, "<");
  md = md.replace(/&gt;/g, ">");
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");
  md = md.replace(/&nbsp;/g, " ");
  md = md.replace(/&rsquo;/g, "'");
  md = md.replace(/&lsquo;/g, "'");
  md = md.replace(/&rdquo;/g, '"');
  md = md.replace(/&ldquo;/g, '"');
  md = md.replace(/&mdash;/g, "—");
  md = md.replace(/&ndash;/g, "–");
  md = md.replace(/&hellip;/g, "…");
  md = md.replace(/&copy;/g, "©");
  md = md.replace(/&reg;/g, "®");
  md = md.replace(/&trade;/g, "™");
  md = md.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));

  // Clean up whitespace
  md = md.replace(/[ \t]+/g, " ");
  md = md.replace(/\n{3,}/g, "\n\n");
  md = md.trim();

  return md;
}
