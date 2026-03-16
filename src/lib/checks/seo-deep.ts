import * as cheerio from "cheerio";
import type { Finding } from "../supabase";

// ─── Types ───

export interface SeoDeepResult {
  duplicateTitles: { title: string; pages: string[] }[];
  duplicateDescriptions: { description: string; pages: string[] }[];
  internalLinking: InternalLinkingAnalysis;
  structuredData: StructuredDataResult[];
  mobileFriendliness: MobileFriendlinessResult;
  canonicalHreflang: CanonicalHreflangResult;
  findings: Finding[];
}

interface InternalLinkingAnalysis {
  orphanPages: string[];
  pagesWithExcessiveLinks: { url: string; linkCount: number }[];
  genericAnchors: number;
  totalInternalLinks: number;
}

interface StructuredDataResult {
  type: string;
  valid: boolean;
  missingProperties: string[];
}

interface MobileFriendlinessResult {
  hasViewport: boolean;
  viewportCorrect: boolean;
  smallTextCount: number;
  smallTapTargets: number;
  hasHorizontalScroll: boolean;
}

interface CanonicalHreflangResult {
  hasSelfCanonical: boolean;
  canonicalValid: boolean;
  canonicalUrl: string | null;
  hreflangTags: { lang: string; url: string }[];
  hreflangReciprocal: boolean;
}

export interface PageInfo {
  url: string;
  title: string;
  html: string;
  markdown: string;
}

// ─── Levenshtein Distance ───

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Optimization: skip if strings are very different in length
  if (Math.abs(a.length - b.length) > 10) return Math.abs(a.length - b.length);

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// ─── Duplicate Title/Description Detection ───

function detectDuplicateTitles(pages: PageInfo[]): { title: string; pages: string[] }[] {
  const titleMap = new Map<string, string[]>();

  for (const page of pages) {
    const $ = cheerio.load(page.html);
    const title = $("title").text().trim();
    if (!title) continue;

    // Check for exact matches
    if (titleMap.has(title)) {
      titleMap.get(title)!.push(page.url);
    } else {
      titleMap.set(title, [page.url]);
    }
  }

  // Find exact duplicates
  const duplicates: { title: string; pages: string[] }[] = [];
  for (const [title, urls] of titleMap) {
    if (urls.length > 1) {
      duplicates.push({ title, pages: urls });
    }
  }

  // Check for similar titles (Levenshtein < 5)
  const titles = [...titleMap.entries()].filter(([, urls]) => urls.length === 1);
  for (let i = 0; i < titles.length; i++) {
    for (let j = i + 1; j < titles.length; j++) {
      const dist = levenshtein(titles[i][0].toLowerCase(), titles[j][0].toLowerCase());
      if (dist > 0 && dist < 5) {
        duplicates.push({
          title: `"${titles[i][0]}" ≈ "${titles[j][0]}"`,
          pages: [...titles[i][1], ...titles[j][1]],
        });
      }
    }
  }

  return duplicates;
}

function detectDuplicateDescriptions(pages: PageInfo[]): { description: string; pages: string[] }[] {
  const descMap = new Map<string, string[]>();

  for (const page of pages) {
    const $ = cheerio.load(page.html);
    const desc = $('meta[name="description"]').attr("content")?.trim();
    if (!desc) continue;

    if (descMap.has(desc)) {
      descMap.get(desc)!.push(page.url);
    } else {
      descMap.set(desc, [page.url]);
    }
  }

  const duplicates: { description: string; pages: string[] }[] = [];
  for (const [desc, urls] of descMap) {
    if (urls.length > 1) {
      duplicates.push({ description: desc.slice(0, 60) + "...", pages: urls });
    }
  }

  return duplicates;
}

// ─── Internal Linking Quality ───

function analyzeInternalLinking(pages: PageInfo[], siteUrl: string): InternalLinkingAnalysis {
  let siteDomain: string;
  try {
    siteDomain = new URL(siteUrl).hostname;
  } catch {
    siteDomain = "";
  }

  const pageUrls = new Set(pages.map((p) => p.url));
  const inboundLinks = new Map<string, number>();
  const pagesWithExcessiveLinks: { url: string; linkCount: number }[] = [];
  let genericAnchors = 0;
  let totalInternalLinks = 0;

  // Initialize inbound count
  for (const url of pageUrls) {
    inboundLinks.set(url, 0);
  }

  // Generic anchor text patterns
  const genericPatterns = /^(click here|read more|learn more|here|more|link|details|klikněte zde|více|zjistit více|detail|odkaz|čtěte dále|sem|tady)$/i;

  for (const page of pages) {
    const $ = cheerio.load(page.html);
    let internalLinkCount = 0;

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();

      // Determine if internal
      let isInternal = false;
      try {
        if (href.startsWith("/") || href.startsWith("#")) {
          isInternal = true;
        } else {
          const linkUrl = new URL(href, page.url);
          isInternal = linkUrl.hostname === siteDomain;
        }
      } catch {
        isInternal = href.startsWith("/");
      }

      if (isInternal) {
        internalLinkCount++;
        totalInternalLinks++;

        // Resolve full URL for inbound tracking
        try {
          const fullUrl = new URL(href, page.url).toString().replace(/\/$/, "");
          for (const pageUrl of pageUrls) {
            if (pageUrl.replace(/\/$/, "") === fullUrl) {
              inboundLinks.set(pageUrl, (inboundLinks.get(pageUrl) || 0) + 1);
            }
          }
        } catch {
          // Skip
        }

        // Check anchor text
        if (text && genericPatterns.test(text)) {
          genericAnchors++;
        }
      }
    });

    if (internalLinkCount > 100) {
      pagesWithExcessiveLinks.push({ url: page.url, linkCount: internalLinkCount });
    }
  }

  // Find orphan pages (no inbound links, excluding homepage)
  const orphanPages: string[] = [];
  for (const [url, count] of inboundLinks) {
    if (count === 0) {
      try {
        const parsed = new URL(url);
        if (parsed.pathname !== "/" && parsed.pathname !== "") {
          orphanPages.push(url);
        }
      } catch {
        if (!url.endsWith("/")) orphanPages.push(url);
      }
    }
  }

  return {
    orphanPages,
    pagesWithExcessiveLinks,
    genericAnchors,
    totalInternalLinks,
  };
}

// ─── Structured Data Validation ───

const REQUIRED_PROPERTIES: Record<string, string[]> = {
  Product: ["name", "image"],
  Article: ["headline", "author"],
  NewsArticle: ["headline", "author", "datePublished"],
  BlogPosting: ["headline", "author"],
  Organization: ["name"],
  LocalBusiness: ["name", "address"],
  Person: ["name"],
  Event: ["name", "startDate", "location"],
  Recipe: ["name", "image"],
  FAQPage: ["mainEntity"],
  BreadcrumbList: ["itemListElement"],
  WebSite: ["name", "url"],
  WebPage: ["name"],
};

function validateStructuredData(html: string): StructuredDataResult[] {
  const $ = cheerio.load(html);
  const results: StructuredDataResult[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const content = $(el).text().trim();
      const data = JSON.parse(content);

      const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];

      for (const item of items) {
        const type = (item["@type"] || "Unknown").replace("schema:", "");
        const requiredProps = REQUIRED_PROPERTIES[type];

        if (requiredProps) {
          const missing = requiredProps.filter((prop) => !item[prop] && !item[`schema:${prop}`]);
          results.push({
            type,
            valid: missing.length === 0,
            missingProperties: missing,
          });
        } else {
          results.push({
            type,
            valid: true,
            missingProperties: [],
          });
        }
      }
    } catch {
      results.push({
        type: "Invalid JSON-LD",
        valid: false,
        missingProperties: ["valid JSON"],
      });
    }
  });

  return results;
}

// ─── Mobile Friendliness ───

function checkMobileFriendliness(html: string): MobileFriendlinessResult {
  const $ = cheerio.load(html);

  // Viewport
  const viewport = $('meta[name="viewport"]').attr("content") || "";
  const hasViewport = viewport.length > 0;
  const viewportCorrect = viewport.includes("width=device-width");

  // Small text detection (from inline styles)
  let smallTextCount = 0;
  $("[style]").each((_, el) => {
    const style = $(el).attr("style") || "";
    const fontSizeMatch = style.match(/font-size\s*:\s*(\d+(?:\.\d+)?)(px|pt|em|rem)/i);
    if (fontSizeMatch) {
      let size = parseFloat(fontSizeMatch[1]);
      const unit = fontSizeMatch[2].toLowerCase();
      if (unit === "pt") size *= 1.333;
      if (unit === "em" || unit === "rem") size *= 16;
      if (size < 12) smallTextCount++;
    }
  });

  // Also check style blocks for small font sizes
  $("style").each((_, el) => {
    const css = $(el).text();
    const smallFonts = css.match(/font-size\s*:\s*([0-9]+(?:\.[0-9]+)?)(px|pt)\b/gi) || [];
    for (const match of smallFonts) {
      const sizeMatch = match.match(/([0-9]+(?:\.[0-9]+)?)(px|pt)/i);
      if (sizeMatch) {
        let size = parseFloat(sizeMatch[1]);
        if (sizeMatch[2].toLowerCase() === "pt") size *= 1.333;
        if (size < 12 && size > 0) smallTextCount++;
      }
    }
  });

  // Small tap targets
  let smallTapTargets = 0;
  $("a, button, input, select, textarea").each((_, el) => {
    const style = $(el).attr("style") || "";
    const widthMatch = style.match(/width\s*:\s*(\d+)px/i);
    const heightMatch = style.match(/height\s*:\s*(\d+)px/i);
    const paddingMatch = style.match(/padding\s*:\s*(\d+)/i);

    if (widthMatch && parseInt(widthMatch[1]) < 44) smallTapTargets++;
    if (heightMatch && parseInt(heightMatch[1]) < 44) smallTapTargets++;
    if (!widthMatch && !heightMatch && paddingMatch && parseInt(paddingMatch[1]) < 8) {
      smallTapTargets++;
    }
  });

  // Horizontal scroll detection (from CSS)
  let hasHorizontalScroll = false;
  $("style").each((_, el) => {
    const css = $(el).text();
    if (css.includes("overflow-x: scroll") || css.includes("overflow-x:scroll")) {
      hasHorizontalScroll = true;
    }
  });

  // Check for fixed-width containers
  $("[style]").each((_, el) => {
    const style = $(el).attr("style") || "";
    const widthMatch = style.match(/(?:^|;)\s*width\s*:\s*(\d+)px/i);
    if (widthMatch && parseInt(widthMatch[1]) > 1200) {
      hasHorizontalScroll = true;
    }
  });

  return {
    hasViewport,
    viewportCorrect,
    smallTextCount,
    smallTapTargets,
    hasHorizontalScroll,
  };
}

// ─── Canonical & Hreflang ───

function checkCanonicalHreflang(html: string, pageUrl: string): CanonicalHreflangResult {
  const $ = cheerio.load(html);

  // Canonical
  const canonical = $('link[rel="canonical"]').attr("href") || null;
  let hasSelfCanonical = false;
  let canonicalValid = false;

  if (canonical) {
    try {
      const canonicalUrl = new URL(canonical, pageUrl);
      const currentUrl = new URL(pageUrl);
      hasSelfCanonical = canonicalUrl.pathname === currentUrl.pathname && canonicalUrl.hostname === currentUrl.hostname;
      canonicalValid = canonicalUrl.protocol === "https:" || canonicalUrl.protocol === "http:";
    } catch {
      canonicalValid = false;
    }
  }

  // Hreflang
  const hreflangTags: { lang: string; url: string }[] = [];
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const lang = $(el).attr("hreflang") || "";
    const href = $(el).attr("href") || "";
    if (lang && href) {
      hreflangTags.push({ lang, url: href });
    }
  });

  // Check reciprocal (simplified — we can only check if self-reference exists)
  const selfHreflang = hreflangTags.some((tag) => {
    try {
      const tagUrl = new URL(tag.url, pageUrl);
      const currentUrl = new URL(pageUrl);
      return tagUrl.pathname === currentUrl.pathname && tagUrl.hostname === currentUrl.hostname;
    } catch {
      return false;
    }
  });

  return {
    hasSelfCanonical,
    canonicalValid: canonical ? canonicalValid : true,
    canonicalUrl: canonical,
    hreflangTags,
    hreflangReciprocal: hreflangTags.length === 0 || selfHreflang,
  };
}

// ─── Main Export ───

export function analyzeSeoDeep(pages: PageInfo[], siteUrl: string): SeoDeepResult {
  const findings: Finding[] = [];
  const mainPage = pages[0];

  // 1. Duplicate titles
  const duplicateTitles = detectDuplicateTitles(pages);
  if (duplicateTitles.length > 0) {
    const exactDups = duplicateTitles.filter((d) => !d.title.includes("≈"));
    const similarDups = duplicateTitles.filter((d) => d.title.includes("≈"));

    if (exactDups.length > 0) {
      findings.push({
        category: "seo",
        severity: "critical",
        title: "Duplicitní titulky stránek",
        description: `${exactDups.length} skupin stránek sdílí stejný titulek. Vytvořte unikátní titulek pro každou stránku, protože duplicitní titulky zmatou vyhledávače při určování, kterou stránku zobrazit ve výsledcích.`,
      });
    }
    if (similarDups.length > 0) {
      findings.push({
        category: "seo",
        severity: "warning",
        title: "Velmi podobné titulky",
        description: `${similarDups.length} párů stránek má téměř identické titulky. Diferencujte titulky, aby vyhledávače mohly správně rozlišit obsah jednotlivých stránek.`,
      });
    }
  }

  // 2. Duplicate descriptions
  const duplicateDescriptions = detectDuplicateDescriptions(pages);
  if (duplicateDescriptions.length > 0) {
    findings.push({
      category: "seo",
      severity: "warning",
      title: "Duplicitní meta popisy",
      description: `${duplicateDescriptions.length} skupin stránek sdílí stejný meta popis. Napište unikátní popis pro každou stránku, protože meta popis se zobrazuje ve výsledcích vyhledávání a ovlivňuje míru prokliku (CTR).`,
    });
  }

  // 3. Internal linking
  const internalLinking = analyzeInternalLinking(pages, siteUrl);

  if (internalLinking.orphanPages.length > 0) {
    findings.push({
      category: "seo",
      severity: "warning",
      title: "Osiřelé stránky",
      description: `${internalLinking.orphanPages.length} stránek nemá žádné interní příchozí odkazy. Přidejte odkazy z jiných stránek, protože vyhledávače je obtížně naleznou a nepřenesou na ně "link equity".`,
    });
  }

  if (internalLinking.pagesWithExcessiveLinks.length > 0) {
    findings.push({
      category: "seo",
      severity: "warning",
      title: "Příliš mnoho interních odkazů",
      description: `${internalLinking.pagesWithExcessiveLinks.length} stránek má více než 100 interních odkazů. Omezte počet odkazů na stránce, protože příliš mnoho odkazů rozmělňuje "link equity" a může být považováno za spam.`,
    });
  }

  if (internalLinking.genericAnchors > 5) {
    findings.push({
      category: "seo",
      severity: "info",
      title: "Generické texty odkazů",
      description: `${internalLinking.genericAnchors}× nalezen generický text odkazu (např. "klikněte zde", "více"). Používejte popisné texty odkazů, protože pomáhají vyhledávačům pochopit, kam odkaz vede.`,
    });
  }

  // 4. Structured data
  const structuredData = mainPage ? validateStructuredData(mainPage.html) : [];
  const invalidSchema = structuredData.filter((s) => !s.valid);

  if (structuredData.length === 0) {
    findings.push({
      category: "seo",
      severity: "warning",
      title: "Chybí strukturovaná data",
      description: "Na stránce nebyly nalezeny žádné JSON-LD bloky. Přidejte strukturovaná data Schema.org, protože umožňují vyhledávačům zobrazit rich snippets (hodnocení, ceny, FAQ) ve výsledcích.",
    });
  } else if (invalidSchema.length > 0) {
    const missing = invalidSchema.map((s) => `${s.type}: chybí ${s.missingProperties.join(", ")}`).join("; ");
    findings.push({
      category: "seo",
      severity: "warning",
      title: "Neúplná strukturovaná data",
      description: `Nalezeny chybějící povinné vlastnosti: ${missing}. Doplňte chybějící vlastnosti, protože neúplná data nebudou vyhledávačem akceptována pro rich snippets.`,
    });
  } else {
    findings.push({
      category: "seo",
      severity: "ok",
      title: "Strukturovaná data v pořádku",
      description: `Nalezeno ${structuredData.length} platných Schema.org typů: ${structuredData.map((s) => s.type).join(", ")}.`,
    });
  }

  // 5. Mobile friendliness
  const mobileFriendliness = mainPage ? checkMobileFriendliness(mainPage.html) : { hasViewport: false, viewportCorrect: false, smallTextCount: 0, smallTapTargets: 0, hasHorizontalScroll: false };

  if (!mobileFriendliness.hasViewport) {
    findings.push({
      category: "seo",
      severity: "critical",
      title: "Chybí viewport meta tag",
      description: "Stránka nemá viewport meta tag. Přidejte <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">, protože bez něj Google nebude stránku považovat za mobilně přívětivou.",
    });
  } else if (!mobileFriendliness.viewportCorrect) {
    findings.push({
      category: "seo",
      severity: "warning",
      title: "Nesprávný viewport",
      description: "Viewport meta tag neobsahuje width=device-width. Opravte hodnotu, aby se stránka správně škálovala na mobilních zařízeních.",
    });
  }

  if (mobileFriendliness.smallTextCount > 0) {
    findings.push({
      category: "seo",
      severity: "warning",
      title: "Příliš malý text",
      description: `Nalezeno ${mobileFriendliness.smallTextCount}× text menší než 12px. Zvětšete písmo alespoň na 12px, protože malý text je na mobilech nečitelný a Google za to stránku penalizuje.`,
    });
  }

  if (mobileFriendliness.smallTapTargets > 0) {
    findings.push({
      category: "seo",
      severity: "warning",
      title: "Příliš malé klikací plochy",
      description: `${mobileFriendliness.smallTapTargets} interaktivních prvků je menších než 44×44px. Zvětšete klikací plochy, protože na dotykovém displeji je uživatelé netrefí a Google to hodnotí negativně.`,
    });
  }

  // 6. Canonical & hreflang
  const canonicalHreflang = mainPage ? checkCanonicalHreflang(mainPage.html, mainPage.url) : { hasSelfCanonical: false, canonicalValid: true, canonicalUrl: null, hreflangTags: [], hreflangReciprocal: true };

  if (canonicalHreflang.canonicalUrl && !canonicalHreflang.hasSelfCanonical) {
    findings.push({
      category: "seo",
      severity: "info",
      title: "Canonical neukazuje na sebe",
      description: `Canonical URL (${canonicalHreflang.canonicalUrl}) se liší od URL stránky. Zkontrolujte, zda je to záměr. Většina stránek by měla mít self-referencing canonical.`,
    });
  }

  if (!canonicalHreflang.canonicalValid && canonicalHreflang.canonicalUrl) {
    findings.push({
      category: "seo",
      severity: "warning",
      title: "Neplatný canonical URL",
      description: "Canonical tag obsahuje neplatný URL. Opravte hodnotu, protože neplatný canonical může způsobit problémy s indexací.",
    });
  }

  if (canonicalHreflang.hreflangTags.length > 0 && !canonicalHreflang.hreflangReciprocal) {
    findings.push({
      category: "seo",
      severity: "warning",
      title: "Chybí reciproční hreflang",
      description: "Hreflang tagy neobsahují zpětný odkaz na tuto stránku. Přidejte self-referencing hreflang, protože bez recipročních odkazů vyhledávače hreflang ignorují.",
    });
  }

  return {
    duplicateTitles,
    duplicateDescriptions,
    internalLinking,
    structuredData,
    mobileFriendliness,
    canonicalHreflang,
    findings,
  };
}
