/**
 * Lightweight pre-scan module that fetches a homepage and extracts
 * signals WITHOUT AI to evaluate suitability for redesign.
 */

import * as cheerio from "cheerio";
import type { Element } from "domhandler";

export interface PreScanData {
  url: string;
  domain: string;
  title: string;
  metaDescription: string;
  hasEcommerce: boolean;
  pageType: "landing" | "blog" | "portfolio" | "ecommerce" | "app" | "unknown";
  techStack: string;
  linkCount: number;
  imageCount: number;
  hasContactForm: boolean;
  hasSocialLinks: boolean;
  estimatedPageCount: number;
  language: string;
  sslValid: boolean;
  htmlSize: number;
  hasResponsiveDesign: boolean;
  contentLength: number;
  hasLogin: boolean;
  error?: string;
}

const MAX_HTML_SIZE = 500 * 1024; // 500KB
const FETCH_TIMEOUT = 10_000; // 10s

const ECOMMERCE_SIGNALS = [
  "add-to-cart",
  "add_to_cart",
  "addtocart",
  "cart",
  "checkout",
  "shopping-cart",
  "shopify",
  "woocommerce",
  "product-price",
  "buy-now",
  "buy now",
  "košík",
  "nákupní",
  "objednat",
  "do košíku",
];

const LOGIN_SIGNALS = [
  "login",
  "log-in",
  "signin",
  "sign-in",
  "sign in",
  "přihlášení",
  "přihlásit",
  "dashboard",
  "my-account",
  "my account",
  "app.login",
];

const SOCIAL_DOMAINS = [
  "facebook.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "linkedin.com",
  "youtube.com",
  "tiktok.com",
];

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function detectTechStack(html: string, $: cheerio.CheerioAPI): string {
  const lowerHtml = html.slice(0, 50_000).toLowerCase();

  if (lowerHtml.includes("wp-content") || lowerHtml.includes("wordpress"))
    return "WordPress";
  if (lowerHtml.includes("shopify") || lowerHtml.includes("cdn.shopify.com"))
    return "Shopify";
  if ($('meta[name="generator"]').attr("content")?.toLowerCase().includes("wix"))
    return "Wix";
  if (
    $('meta[name="generator"]').attr("content")?.toLowerCase().includes("squarespace")
  )
    return "Squarespace";
  if (lowerHtml.includes("webflow")) return "Webflow";
  if (lowerHtml.includes("joomla")) return "Joomla";
  if (lowerHtml.includes("drupal")) return "Drupal";
  if (lowerHtml.includes("__next") || lowerHtml.includes("_next/static"))
    return "Next.js";
  if (lowerHtml.includes("__nuxt")) return "Nuxt";
  if (lowerHtml.includes("gatsby")) return "Gatsby";

  return "custom";
}

function detectPageType(
  $: cheerio.CheerioAPI,
  hasEcommerce: boolean
): PreScanData["pageType"] {
  if (hasEcommerce) return "ecommerce";

  const bodyClasses = ($("body").attr("class") || "").toLowerCase();
  const html = $.html().toLowerCase();

  if (
    bodyClasses.includes("blog") ||
    html.includes("blog-post") ||
    html.includes("article-list") ||
    $("article").length > 3
  )
    return "blog";

  if (
    html.includes("portfolio") ||
    html.includes("gallery") ||
    html.includes("projects")
  )
    return "portfolio";

  const hasLoginForm =
    LOGIN_SIGNALS.some((s) => html.includes(s)) &&
    $('input[type="password"]').length > 0;
  if (hasLoginForm) return "app";

  return "landing";
}

function detectLanguage($: cheerio.CheerioAPI): string {
  const htmlLang = $("html").attr("lang") || "";
  if (htmlLang) return htmlLang.split("-")[0].toLowerCase();

  const metaLang =
    $('meta[http-equiv="content-language"]').attr("content") ||
    $('meta[name="language"]').attr("content") ||
    "";
  if (metaLang) return metaLang.split("-")[0].toLowerCase();

  return "unknown";
}

function estimatePageCount($: cheerio.CheerioAPI, domain: string): number {
  // Count unique internal navigation links
  const internalLinks = new Set<string>();
  $("nav a[href], header a[href], .menu a[href], .nav a[href]").each((_: number, el: Element) => {
    const href = $(el).attr("href") || "";
    if (
      href.startsWith("/") ||
      href.includes(domain)
    ) {
      // Normalize: strip hash and query
      const path = href.split("?")[0].split("#")[0];
      if (path && path !== "/") {
        internalLinks.add(path);
      }
    }
  });

  // +1 for homepage
  return Math.max(1, internalLinks.size + 1);
}

/**
 * Perform a lightweight pre-scan of a URL.
 * Fetches homepage HTML (max 500KB, 10s timeout) and extracts signals.
 */
export async function preScan(inputUrl: string): Promise<PreScanData> {
  // Normalize URL
  let url = inputUrl.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  const domain = extractDomain(url);
  const sslValid = url.startsWith("https://");

  const base: Omit<PreScanData, "error"> = {
    url,
    domain,
    title: "",
    metaDescription: "",
    hasEcommerce: false,
    pageType: "unknown",
    techStack: "unknown",
    linkCount: 0,
    imageCount: 0,
    hasContactForm: false,
    hasSocialLinks: false,
    estimatedPageCount: 1,
    language: "unknown",
    sslValid,
    htmlSize: 0,
    hasResponsiveDesign: false,
    contentLength: 0,
    hasLogin: false,
  };

  let html: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; WebflipperBot/1.0; +https://webflipper.app)",
        Accept: "text/html",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { ...base, error: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return { ...base, error: `Not HTML: ${contentType}` };
    }

    // Read with size limit
    const buffer = await response.arrayBuffer();
    const limited = buffer.slice(0, MAX_HTML_SIZE);
    html = new TextDecoder("utf-8").decode(limited);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return { ...base, error: message };
  }

  base.htmlSize = html.length;

  const $ = cheerio.load(html);

  // Extract basic metadata
  base.title = $("title").first().text().trim().slice(0, 200);
  base.metaDescription = (
    $('meta[name="description"]').attr("content") || ""
  )
    .trim()
    .slice(0, 500);

  // Content length (text only)
  base.contentLength = $("body").text().replace(/\s+/g, " ").trim().length;

  // Ecommerce detection
  const lowerHtml = html.toLowerCase();
  base.hasEcommerce = ECOMMERCE_SIGNALS.some((s) => lowerHtml.includes(s));

  // Login detection
  base.hasLogin =
    LOGIN_SIGNALS.some((s) => lowerHtml.includes(s)) &&
    $('input[type="password"]').length > 0;

  // Page type
  base.pageType = detectPageType($, base.hasEcommerce);

  // Tech stack
  base.techStack = detectTechStack(html, $);

  // Counts
  base.linkCount = $("a[href]").length;
  base.imageCount = $("img").length;

  // Contact form
  base.hasContactForm =
    $("form").length > 0 &&
    ($('input[type="email"]').length > 0 ||
      $('input[name*="email"]').length > 0 ||
      $("textarea").length > 0);

  // Social links
  base.hasSocialLinks = $("a[href]")
    .toArray()
    .some((el: Element) => {
      const href = $(el).attr("href") || "";
      return SOCIAL_DOMAINS.some((d) => href.includes(d));
    });

  // Estimated page count
  base.estimatedPageCount = estimatePageCount($, domain);

  // Language
  base.language = detectLanguage($);

  // Responsive design
  base.hasResponsiveDesign =
    $('meta[name="viewport"]').length > 0 ||
    lowerHtml.includes("@media") ||
    lowerHtml.includes("responsive");

  return base;
}
