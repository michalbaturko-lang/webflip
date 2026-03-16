import * as cheerio from "cheerio";
import type { Finding } from "../supabase";

// ─── Types ───

export type PageType =
  | "homepage"
  | "product-listing"
  | "product-detail"
  | "blog-listing"
  | "blog-post"
  | "about"
  | "contact"
  | "gallery"
  | "services"
  | "pricing"
  | "other";

export type SiteType =
  | "e-commerce"
  | "catalog"
  | "blog"
  | "saas"
  | "portfolio"
  | "corporate";

export interface SiteStructureResult {
  pageTypes: { url: string; type: PageType; confidence: number }[];
  siteType: SiteType;
  navigation: NavigationAnalysis;
  crawlDepth: { url: string; depth: number }[];
  findings: Finding[];
}

interface NavigationAnalysis {
  headerLinks: { text: string; href: string }[];
  footerLinks: { text: string; href: string }[];
  hasMegaMenu: boolean;
  hasBreadcrumbs: boolean;
  maxDepth: number;
}

export interface PageData {
  url: string;
  title: string;
  html: string;
  markdown: string;
}

// ─── Page Type Classification ───

// URL patterns for page type detection
const URL_PATTERNS: { pattern: RegExp; type: PageType }[] = [
  { pattern: /\/(products?|shop|store|obchod|eshop|e-shop|zbozi)\b/i, type: "product-listing" },
  { pattern: /\/(products?|shop|store|zbozi)\/[^/]+$/i, type: "product-detail" },
  { pattern: /\/(blog|articles?|news|clanky|novinky|aktuality|magazin)$/i, type: "blog-listing" },
  { pattern: /\/(blog|articles?|news|clanky|novinky|aktuality)\/[^/]+$/i, type: "blog-post" },
  { pattern: /\/(about|o-nas|o-firme|o-spolecnosti|kdo-jsme|uber-uns)\b/i, type: "about" },
  { pattern: /\/(contact|kontakt|kontakty|napiste-nam)\b/i, type: "contact" },
  { pattern: /\/(gallery|galerie|portfolio|reference|fotogalerie|nase-prace)\b/i, type: "gallery" },
  { pattern: /\/(services?|sluzby|nabidka|co-delame|nase-sluzby)\b/i, type: "services" },
  { pattern: /\/(pricing|cenik|ceny|prices?|tarif)\b/i, type: "pricing" },
];

function classifyPage(page: PageData): { type: PageType; confidence: number } {
  const $ = cheerio.load(page.html);

  // Check if homepage
  try {
    const parsed = new URL(page.url);
    if (parsed.pathname === "/" || parsed.pathname === "") {
      return { type: "homepage", confidence: 1.0 };
    }
  } catch {
    // Not a valid URL, continue with pattern matching
  }

  // URL pattern matching
  for (const { pattern, type } of URL_PATTERNS) {
    if (pattern.test(page.url)) {
      return { type, confidence: 0.8 };
    }
  }

  // Content signal analysis
  const html = page.html.toLowerCase();
  const text = page.markdown.toLowerCase();

  // Product signals
  const hasPrice = /(\$|€|£|kč|czk)\s*\d+/i.test(text) || $("[class*='price'], [itemprop='price']").length > 0;
  const hasAddToCart = $("[class*='cart'], [class*='kosik'], button:contains('Koupit'), button:contains('Přidat')").length > 0;
  if (hasPrice && hasAddToCart) return { type: "product-detail", confidence: 0.7 };
  if (hasPrice) return { type: "product-listing", confidence: 0.5 };

  // Blog post signals
  const hasDate = $("time, [datetime], [class*='date'], [class*='datum']").length > 0;
  const hasAuthor = $("[class*='author'], [rel='author'], [itemprop='author']").length > 0;
  const articleTag = $("article").length > 0;
  if (hasDate && hasAuthor && articleTag) return { type: "blog-post", confidence: 0.7 };
  if (hasDate && articleTag) return { type: "blog-post", confidence: 0.5 };

  // Contact signals
  const hasForm = $("form").length > 0;
  const hasMap = $("iframe[src*='maps'], [class*='map'], [id*='map']").length > 0;
  const hasContactInfo = /(\+?\d{3}[\s-]?\d{3}[\s-]?\d{3}|@.*\.\w{2,})/.test(text);
  if (hasForm && hasMap) return { type: "contact", confidence: 0.7 };
  if (hasForm && hasContactInfo) return { type: "contact", confidence: 0.5 };

  // Gallery signals
  const imageCount = $("img").length;
  const textLength = text.length;
  if (imageCount > 10 && textLength < 1000) return { type: "gallery", confidence: 0.6 };

  // About signals
  if (html.includes("o nás") || html.includes("about us") || html.includes("über uns")) {
    return { type: "about", confidence: 0.6 };
  }

  return { type: "other", confidence: 0.3 };
}

// ─── Website Type Detection ───

function detectSiteType(pageTypes: { url: string; type: PageType; confidence: number }[]): SiteType {
  const typeCounts = new Map<PageType, number>();
  for (const pt of pageTypes) {
    typeCounts.set(pt.type, (typeCounts.get(pt.type) || 0) + 1);
  }

  const total = pageTypes.length;
  const productPages = (typeCounts.get("product-listing") || 0) + (typeCounts.get("product-detail") || 0);
  const blogPages = (typeCounts.get("blog-listing") || 0) + (typeCounts.get("blog-post") || 0);
  const hasServices = typeCounts.has("services");
  const hasPricing = typeCounts.has("pricing");
  const hasGallery = typeCounts.has("gallery");

  // E-commerce: > 30% product pages
  if (productPages > total * 0.3) return "e-commerce";
  // Catalog: some product pages but not dominant
  if (productPages > 0 && productPages >= 2) return "catalog";
  // Blog: > 40% blog pages
  if (blogPages > total * 0.4) return "blog";
  // SaaS: has services + pricing
  if (hasServices && hasPricing) return "saas";
  // Portfolio: has gallery
  if (hasGallery) return "portfolio";
  // Default
  return "corporate";
}

// ─── Navigation Analysis ───

function analyzeNavigation(html: string, pages: PageData[], siteUrl: string): NavigationAnalysis {
  const $ = cheerio.load(html);

  // Header links
  const headerLinks: { text: string; href: string }[] = [];
  $("header a, nav a, [role='navigation'] a").each((_, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr("href") || "";
    if (text && href && text.length < 50) {
      headerLinks.push({ text, href });
    }
  });

  // Footer links
  const footerLinks: { text: string; href: string }[] = [];
  $("footer a").each((_, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr("href") || "";
    if (text && href && text.length < 50) {
      footerLinks.push({ text, href });
    }
  });

  // Mega menu detection
  const hasMegaMenu =
    $("[class*='mega'], [class*='dropdown'] [class*='dropdown'], nav ul ul").length > 0 ||
    $("nav li").filter((_, el) => $(el).find("ul").length > 0).length > 3;

  // Breadcrumbs
  const hasBreadcrumbs =
    $("[class*='breadcrumb'], nav[aria-label*='breadcrumb'], [itemtype*='BreadcrumbList']").length > 0;

  // Navigation depth
  let maxDepth = 0;
  $("nav").each((_, nav) => {
    const nestedLists = $(nav).find("ul ul").length;
    maxDepth = Math.max(maxDepth, nestedLists + 1);
  });

  return {
    headerLinks: headerLinks.slice(0, 50), // Limit
    footerLinks: footerLinks.slice(0, 50),
    hasMegaMenu,
    hasBreadcrumbs,
    maxDepth,
  };
}

// ─── Crawl Depth (BFS from homepage) ───

function calculateCrawlDepth(pages: PageData[], siteUrl: string): { url: string; depth: number }[] {
  if (pages.length === 0) return [];

  let siteDomain: string;
  try {
    siteDomain = new URL(siteUrl).hostname;
  } catch {
    siteDomain = "";
  }

  // Build adjacency from link extraction
  const pageUrlSet = new Set(pages.map((p) => normalizeUrl(p.url)));
  const adjacency = new Map<string, Set<string>>();

  for (const page of pages) {
    const $ = cheerio.load(page.html);
    const normalizedPageUrl = normalizeUrl(page.url);
    const links = new Set<string>();

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      try {
        const resolved = new URL(href, page.url);
        if (resolved.hostname === siteDomain) {
          const normalized = normalizeUrl(resolved.toString());
          if (pageUrlSet.has(normalized)) {
            links.add(normalized);
          }
        }
      } catch {
        // Skip invalid URLs
      }
    });

    adjacency.set(normalizedPageUrl, links);
  }

  // BFS from homepage
  const homepageUrl = normalizeUrl(pages[0].url);
  const depths = new Map<string, number>();
  depths.set(homepageUrl, 0);

  const queue: string[] = [homepageUrl];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depths.get(current) || 0;
    const neighbors = adjacency.get(current) || new Set();

    for (const neighbor of neighbors) {
      if (!depths.has(neighbor)) {
        depths.set(neighbor, currentDepth + 1);
        queue.push(neighbor);
      }
    }
  }

  // Pages not reachable from homepage
  for (const url of pageUrlSet) {
    if (!depths.has(url)) {
      depths.set(url, Infinity);
    }
  }

  return [...depths.entries()].map(([url, depth]) => ({ url, depth }));
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname.replace(/\/$/, "");
  } catch {
    return url.replace(/\/$/, "");
  }
}

// ─── Main Export ───

export function analyzeSiteStructure(pages: PageData[], siteUrl: string): SiteStructureResult {
  const findings: Finding[] = [];

  if (pages.length === 0) {
    return {
      pageTypes: [],
      siteType: "corporate",
      navigation: { headerLinks: [], footerLinks: [], hasMegaMenu: false, hasBreadcrumbs: false, maxDepth: 0 },
      crawlDepth: [],
      findings: [],
    };
  }

  const mainPage = pages[0];

  // 1. Page type classification
  const pageTypes = pages.map((page) => {
    const { type, confidence } = classifyPage(page);
    return { url: page.url, type, confidence };
  });

  // 2. Site type detection
  const siteType = detectSiteType(pageTypes);
  findings.push({
    category: "content",
    severity: "ok",
    title: "Typ webu identifikován",
    description: `Web byl klasifikován jako "${translateSiteType(siteType)}" na základě analýzy ${pages.length} stránek.`,
  });

  // 3. Navigation analysis
  const navigation = analyzeNavigation(mainPage.html, pages, siteUrl);

  if (navigation.headerLinks.length === 0) {
    findings.push({
      category: "ux",
      severity: "critical",
      title: "Chybí navigace v hlavičce",
      description: "V hlavičce stránky nebyly nalezeny žádné navigační odkazy. Přidejte hlavní navigaci, protože bez ní uživatelé nemohou procházet web a odcházejí.",
    });
  } else if (navigation.headerLinks.length < 3) {
    findings.push({
      category: "ux",
      severity: "warning",
      title: "Nedostatečná navigace",
      description: `Pouze ${navigation.headerLinks.length} odkaz(y) v navigaci. Rozšiřte navigaci alespoň na 4–6 položek, aby uživatelé snadno našli důležité sekce webu.`,
    });
  }

  if (!navigation.hasBreadcrumbs && pages.length > 3) {
    findings.push({
      category: "ux",
      severity: "info",
      title: "Chybí drobečková navigace",
      description: "Web nemá breadcrumbs (drobečkovou navigaci). Přidejte ji, protože pomáhá uživatelům pochopit hierarchii stránek a Google ji zobrazuje ve výsledcích vyhledávání.",
    });
  }

  if (navigation.footerLinks.length === 0) {
    findings.push({
      category: "ux",
      severity: "info",
      title: "Prázdná patička",
      description: "V patičce nebyly nalezeny žádné odkazy. Přidejte důležité odkazy (kontakt, právní info, mapa stránek), protože uživatelé často hledají doplňkové informace ve footeru.",
    });
  }

  // 4. Crawl depth
  const crawlDepth = calculateCrawlDepth(pages, siteUrl);
  const deepPages = crawlDepth.filter((p) => p.depth > 3 && p.depth < Infinity);
  const veryDeepPages = crawlDepth.filter((p) => p.depth > 5 && p.depth < Infinity);
  const unreachablePages = crawlDepth.filter((p) => p.depth === Infinity);

  if (veryDeepPages.length > 0) {
    findings.push({
      category: "seo",
      severity: "warning",
      title: "Příliš hluboké stránky",
      description: `${veryDeepPages.length} stránek vyžaduje více než 5 kliknutí z hlavní stránky. Přesuňte důležité stránky blíže k hlavní stránce, protože vyhledávače hlouběji zanořené stránky indexují méně často.`,
    });
  } else if (deepPages.length > 0) {
    findings.push({
      category: "seo",
      severity: "info",
      title: "Hluboko zanořené stránky",
      description: `${deepPages.length} stránek je vzdáleno více než 3 kliknutí od hlavní stránky. Zvažte přidání přímých odkazů pro lepší dostupnost a indexaci.`,
    });
  }

  if (unreachablePages.length > 0) {
    findings.push({
      category: "seo",
      severity: "warning",
      title: "Nedostupné stránky",
      description: `${unreachablePages.length} stránek není dosažitelných z hlavní stránky přes interní odkazy. Přidejte odkazy vedoucí k těmto stránkám, protože jinak je vyhledávače nemusí najít.`,
    });
  }

  return {
    pageTypes,
    siteType,
    navigation,
    crawlDepth,
    findings,
  };
}

// ─── Helpers ───

function translateSiteType(type: SiteType): string {
  const translations: Record<SiteType, string> = {
    "e-commerce": "E-shop",
    catalog: "Katalog produktů",
    blog: "Blog / Magazín",
    saas: "SaaS / Služby",
    portfolio: "Portfolio",
    corporate: "Firemní web",
  };
  return translations[type] || type;
}
