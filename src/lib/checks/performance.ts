import * as cheerio from "cheerio";
import type { Finding } from "../supabase";

// ─── Types ───

export interface PerformanceResult {
  resources: ResourceAnalysis;
  images: ImageIssue[];
  caching: CachingAnalysis;
  compression: CompressionAnalysis;
  thirdParty: ThirdPartyAnalysis;
  findings: Finding[];
}

interface ResourceAnalysis {
  renderBlockingScripts: number;
  renderBlockingStylesheets: number;
  totalScripts: number;
  totalStylesheets: number;
  estimatedPageWeight: number; // bytes
}

interface ImageIssue {
  src: string;
  issue: "large" | "no-webp" | "no-srcset" | "no-lazy" | "no-dimensions";
  severity: "warning" | "error";
  details?: string;
}

interface CachingAnalysis {
  hasCacheControl: boolean;
  hasETag: boolean;
  uncachedResources: number;
}

interface CompressionAnalysis {
  hasCompression: boolean;
  encoding: string | null;
}

interface ThirdPartyAnalysis {
  totalScripts: number;
  knownSlowParties: string[];
  domains: string[];
}

// Known slow third-party patterns
const SLOW_THIRD_PARTIES: Record<string, string> = {
  "google-analytics.com": "Google Analytics",
  "googletagmanager.com": "Google Tag Manager",
  "facebook.net": "Facebook SDK",
  "connect.facebook.net": "Facebook Connect",
  "platform.twitter.com": "Twitter Widgets",
  "widgets.pinterest.com": "Pinterest",
  "snap.licdn.com": "LinkedIn Insight",
  "ads.google.com": "Google Ads",
  "doubleclick.net": "DoubleClick",
  "hotjar.com": "Hotjar",
  "mc.yandex.ru": "Yandex Metrica",
  "cdn.shopify.com": "Shopify CDN",
  "widget.intercom.io": "Intercom",
  "js.stripe.com": "Stripe",
  "maps.googleapis.com": "Google Maps",
  "maps.google.com": "Google Maps",
  "recaptcha.net": "reCAPTCHA",
  "www.youtube.com": "YouTube Embed",
  "player.vimeo.com": "Vimeo Embed",
  "disqus.com": "Disqus",
  "cdn.jsdelivr.net": "jsDelivr CDN",
  "cdnjs.cloudflare.com": "Cloudflare CDN",
  "unpkg.com": "unpkg CDN",
  "chat.tidio.co": "Tidio Chat",
  "embed.tawk.to": "Tawk.to Chat",
  "static.smartsupp.com": "Smartsupp Chat",
};

// ─── Resource Analysis ───

function analyzeResources(html: string, pageUrl: string): ResourceAnalysis {
  const $ = cheerio.load(html);

  // Render-blocking scripts: in <head>, without async or defer
  let renderBlockingScripts = 0;
  $("head script[src]").each((_, el) => {
    const hasAsync = $(el).attr("async") !== undefined;
    const hasDefer = $(el).attr("defer") !== undefined;
    const type = $(el).attr("type") || "";
    if (!hasAsync && !hasDefer && type !== "module") {
      renderBlockingScripts++;
    }
  });

  // Render-blocking stylesheets
  let renderBlockingStylesheets = 0;
  $('head link[rel="stylesheet"]').each((_, el) => {
    const media = $(el).attr("media") || "all";
    if (media === "all" || media === "screen" || !media) {
      renderBlockingStylesheets++;
    }
  });

  const totalScripts = $("script[src]").length;
  const totalStylesheets = $('link[rel="stylesheet"]').length;

  // Estimate page weight
  const htmlSize = Buffer.byteLength(html, "utf-8");

  // Rough estimates for external resources
  const estimatedCssSize = totalStylesheets * 30000; // ~30KB average
  const estimatedJsSize = totalScripts * 50000; // ~50KB average
  const estimatedPageWeight = htmlSize + estimatedCssSize + estimatedJsSize;

  return {
    renderBlockingScripts,
    renderBlockingStylesheets,
    totalScripts,
    totalStylesheets,
    estimatedPageWeight,
  };
}

// ─── Image Optimization ───

function analyzeImages(html: string): ImageIssue[] {
  const $ = cheerio.load(html);
  const issues: ImageIssue[] = [];
  let hasAnyWebP = false;
  let belowFoldCount = 0;
  let imageIndex = 0;

  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || "";
    const srcset = $(el).attr("srcset");
    const loading = $(el).attr("loading");
    const width = $(el).attr("width");
    const height = $(el).attr("height");

    imageIndex++;
    // Consider first 2 images as "above fold"
    const isBelowFold = imageIndex > 2;
    if (isBelowFold) belowFoldCount++;

    // Check for WebP/AVIF
    if (src.match(/\.(webp|avif)$/i) || srcset?.match(/\.(webp|avif)/i)) {
      hasAnyWebP = true;
    }

    // Check srcset
    if (!srcset && !src.includes("data:") && src.length > 0) {
      issues.push({
        src: src.slice(0, 80),
        issue: "no-srcset",
        severity: "warning",
        details: "Přidejte srcset pro responzivní obrázky",
      });
    }

    // Check lazy loading on below-fold images
    if (isBelowFold && loading !== "lazy" && !src.includes("data:")) {
      issues.push({
        src: src.slice(0, 80),
        issue: "no-lazy",
        severity: "warning",
        details: "Přidejte loading=\"lazy\" pro obrázky mimo viditelnou oblast",
      });
    }

    // Missing width/height (CLS risk)
    if (!width || !height) {
      if (!src.includes("data:") && src.length > 0) {
        issues.push({
          src: src.slice(0, 80),
          issue: "no-dimensions",
          severity: "warning",
          details: "Přidejte atributy width a height pro prevenci posunů layoutu (CLS)",
        });
      }
    }
  });

  // Check <picture> elements for WebP/AVIF sources
  $("picture source[type]").each((_, el) => {
    const type = $(el).attr("type") || "";
    if (type.includes("webp") || type.includes("avif")) {
      hasAnyWebP = true;
    }
  });

  // Add a general finding if no modern formats detected
  if (!hasAnyWebP && $("img").length > 0) {
    issues.push({
      src: "all-images",
      issue: "no-webp",
      severity: "warning",
      details: "Žádné obrázky v moderním formátu WebP/AVIF",
    });
  }

  return issues;
}

// ─── Caching Analysis (from headers if available) ───

function analyzeCaching(headers?: Record<string, string>): CachingAnalysis {
  if (!headers) {
    return { hasCacheControl: false, hasETag: false, uncachedResources: 0 };
  }

  const cacheControl = headers["cache-control"] || "";
  const etag = headers["etag"] || "";

  return {
    hasCacheControl: cacheControl.length > 0,
    hasETag: etag.length > 0,
    uncachedResources: cacheControl.includes("no-store") || cacheControl.includes("no-cache") ? 1 : 0,
  };
}

// ─── Compression Analysis ───

function analyzeCompression(headers?: Record<string, string>): CompressionAnalysis {
  if (!headers) {
    return { hasCompression: false, encoding: null };
  }

  const encoding = headers["content-encoding"] || null;
  return {
    hasCompression: !!encoding && (encoding.includes("gzip") || encoding.includes("br") || encoding.includes("deflate")),
    encoding,
  };
}

// ─── Third-Party Impact ───

function analyzeThirdParty(html: string, pageUrl: string): ThirdPartyAnalysis {
  const $ = cheerio.load(html);
  let pageDomain: string;
  try {
    pageDomain = new URL(pageUrl).hostname;
  } catch {
    pageDomain = "";
  }

  const thirdPartyDomains = new Set<string>();
  const knownSlowParties: string[] = [];

  // Collect all external script/link domains
  $("script[src], link[href], iframe[src]").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("href") || "";
    try {
      const srcUrl = new URL(src, pageUrl);
      if (srcUrl.hostname && srcUrl.hostname !== pageDomain && !srcUrl.hostname.includes(pageDomain)) {
        thirdPartyDomains.add(srcUrl.hostname);

        // Check against known slow parties
        for (const [pattern, name] of Object.entries(SLOW_THIRD_PARTIES)) {
          if (srcUrl.hostname.includes(pattern) && !knownSlowParties.includes(name)) {
            knownSlowParties.push(name);
          }
        }
      }
    } catch {
      // Skip invalid URLs
    }
  });

  return {
    totalScripts: thirdPartyDomains.size,
    knownSlowParties,
    domains: [...thirdPartyDomains],
  };
}

// ─── Main Export ───

export function analyzePerformance(
  html: string,
  url: string,
  headers?: Record<string, string>
): PerformanceResult {
  const findings: Finding[] = [];

  // 1. Resource analysis
  const resources = analyzeResources(html, url);

  if (resources.renderBlockingScripts > 0) {
    findings.push({
      category: "performance",
      severity: resources.renderBlockingScripts > 3 ? "critical" : "warning",
      title: "Blokující skripty",
      description: `${resources.renderBlockingScripts} skriptů v <head> blokuje vykreslení stránky. Přidejte atribut async nebo defer, protože blokující skripty zdržují zobrazení obsahu uživateli a zhoršují metriku LCP.`,
    });
  }

  if (resources.renderBlockingStylesheets > 3) {
    findings.push({
      category: "performance",
      severity: "warning",
      title: "Mnoho blokujících stylů",
      description: `${resources.renderBlockingStylesheets} CSS souborů blokuje vykreslení. Zvažte inline kritické CSS a odložené načítání zbytku, protože každý CSS soubor musí být stažen před prvním vykreslením stránky.`,
    });
  }

  // Page weight
  const weightMB = resources.estimatedPageWeight / (1024 * 1024);
  if (weightMB > 5) {
    findings.push({
      category: "performance",
      severity: "critical",
      title: "Extrémně velká stránka",
      description: `Odhadovaná velikost stránky je ${weightMB.toFixed(1)} MB. Optimalizujte obrázky, minifikujte CSS/JS a odstraňte nepoužívané zdroje — na mobilním připojení se stránka bude načítat neúnosně dlouho.`,
    });
  } else if (weightMB > 3) {
    findings.push({
      category: "performance",
      severity: "warning",
      title: "Velká stránka",
      description: `Odhadovaná velikost stránky je ${weightMB.toFixed(1)} MB. Optimalizujte zdroje, protože Google doporučuje max. 3 MB pro dobré Core Web Vitals a rychlé načítání na mobilech.`,
    });
  }

  // 2. Image optimization
  const images = analyzeImages(html);
  const noWebP = images.filter((i) => i.issue === "no-webp");
  const noSrcset = images.filter((i) => i.issue === "no-srcset");
  const noLazy = images.filter((i) => i.issue === "no-lazy");
  const noDimensions = images.filter((i) => i.issue === "no-dimensions");

  if (noWebP.length > 0) {
    findings.push({
      category: "performance",
      severity: "warning",
      title: "Chybí moderní formáty obrázků",
      description: "Nebyly nalezeny obrázky ve formátu WebP nebo AVIF. Převeďte obrázky do moderních formátů, protože WebP je o 25–35 % menší než JPEG a výrazně zrychlí načítání stránky.",
    });
  }

  if (noSrcset.length > 3) {
    findings.push({
      category: "performance",
      severity: "warning",
      title: "Chybí responzivní obrázky",
      description: `${noSrcset.length} obrázků nemá atribut srcset. Přidejte srcset s různými rozlišeními, protože mobilní zařízení pak stahují menší soubory a šetří data i čas.`,
    });
  }

  if (noLazy.length > 3) {
    findings.push({
      category: "performance",
      severity: "warning",
      title: "Chybí lazy loading",
      description: `${noLazy.length} obrázků mimo viditelnou oblast se nenačítá líně. Přidejte loading="lazy", protože líné načítání odloží stahování obrázků, dokud je uživatel nepotřebuje vidět.`,
    });
  }

  if (noDimensions.length > 3) {
    findings.push({
      category: "performance",
      severity: "warning",
      title: "Obrázky bez rozměrů",
      description: `${noDimensions.length} obrázků nemá atributy width a height. Přidejte rozměry, protože bez nich prohlížeč nemůže rezervovat prostor a obsah "skáče" při načítání (zhoršuje CLS).`,
    });
  }

  // 3. Caching
  const caching = analyzeCaching(headers);
  if (headers && !caching.hasCacheControl) {
    findings.push({
      category: "performance",
      severity: "warning",
      title: "Chybí Cache-Control hlavička",
      description: "Server nenastavuje hlavičku Cache-Control. Přidejte správné hlavičky pro cache, protože bez nich prohlížeč stahuje soubory znovu při každé návštěvě.",
    });
  }

  // 4. Compression
  const compression = analyzeCompression(headers);
  if (headers && !compression.hasCompression) {
    findings.push({
      category: "performance",
      severity: "warning",
      title: "Chybí komprese",
      description: "Server nepoužívá gzip ani Brotli kompresi. Zapněte kompresi, protože textem jsou HTML/CSS/JS, které se kompresí zmenší o 60–80 % a výrazně zrychlí přenos.",
    });
  }

  // 5. Third-party
  const thirdParty = analyzeThirdParty(html, url);
  if (thirdParty.totalScripts > 10) {
    findings.push({
      category: "performance",
      severity: "warning",
      title: "Mnoho externích zdrojů",
      description: `Stránka načítá zdroje z ${thirdParty.totalScripts} externích domén. Omezte počet externích skriptů, protože každé DNS vyhledávání a TCP spojení zpomaluje načítání stránky.`,
    });
  } else if (thirdParty.totalScripts > 5) {
    findings.push({
      category: "performance",
      severity: "info",
      title: "Několik externích zdrojů",
      description: `Stránka používá ${thirdParty.totalScripts} externích domén. Zvažte, zda jsou všechny nezbytné.`,
    });
  }

  if (thirdParty.knownSlowParties.length > 0) {
    findings.push({
      category: "performance",
      severity: "info",
      title: "Známé pomalé třetí strany",
      description: `Nalezeny služby, které mohou zpomalovat načítání: ${thirdParty.knownSlowParties.join(", ")}. Zvažte odložené načítání těchto skriptů nebo jejich nahrazení lehčími alternativami.`,
    });
  }

  return {
    resources,
    images,
    caching,
    compression,
    thirdParty,
    findings,
  };
}
