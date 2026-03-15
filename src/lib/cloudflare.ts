export interface CrawledPage {
  url: string;
  title: string;
  markdown: string;
  html: string;
}

export interface ExtractedAssets {
  logo?: string;
  favicon?: string;
  images: { url: string; alt: string }[];
  colors: string[];
  companyName?: string;
  metaDescription?: string;
  socialLinks: string[];
  navLinks: { text: string; href: string }[];
  phoneNumbers: string[];
  emails: string[];
  address?: string;
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

const CRAWL_PAGE_LIMIT = 5;

/**
 * Crawl a website via Cloudflare Browser Rendering /crawl endpoint.
 * The API is async: POST returns a job ID, then we poll GET for results.
 */
export async function crawlWebsite(url: string, options?: CrawlOptions): Promise<CrawlResult> {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!apiToken || !accountId) {
    console.error("[crawl] Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID");
    throw new Error("Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID");
  }

  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering`;
  const headers = {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };

  try {
    // Step 1: Start crawl job
    console.log(`[crawl] Starting crawl for ${url} (limit: ${CRAWL_PAGE_LIMIT})`);
    const startResponse = await fetch(`${baseUrl}/crawl`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url, limit: CRAWL_PAGE_LIMIT }),
    });

    const startBody = await startResponse.text();
    console.log(`[crawl] Start response status=${startResponse.status}, body=${startBody.slice(0, 500)}`);

    if (!startResponse.ok) {
      return {
        success: false,
        pages: [],
        error: `Cloudflare API error ${startResponse.status}: ${startBody}`,
      };
    }

    let startData: Record<string, unknown>;
    try {
      startData = JSON.parse(startBody);
    } catch {
      return { success: false, pages: [], error: `Invalid JSON from crawl API: ${startBody.slice(0, 200)}` };
    }

    if (!startData.success) {
      const errors = startData.errors as Array<{ message?: string }> | undefined;
      console.error("[crawl] API returned success=false:", errors);
      return {
        success: false,
        pages: [],
        error: errors?.[0]?.message || "Failed to start crawl",
      };
    }

    const jobId = startData.result;
    console.log(`[crawl] Job started, jobId=${jobId}, type=${typeof jobId}`);

    if (!jobId || typeof jobId !== "string") {
      // Some CF API versions return the result directly (not a job ID)
      if (startData.result && typeof startData.result === "object") {
        console.log("[crawl] Result is an object, checking for inline data:", JSON.stringify(startData.result).slice(0, 300));
        const resultObj = startData.result as Record<string, unknown>;
        const inlineRecords = (resultObj.records || resultObj.pages || []) as Record<string, unknown>[];
        if (Array.isArray(inlineRecords) && inlineRecords.length > 0) {
          const pages = extractPagesFromRecords(inlineRecords, url);
          if (pages.length > 0) {
            console.log(`[crawl] Got ${pages.length} pages from inline result`);
            const allHtml = pages.map((p) => p.html).join("\n");
            const assets = extractAssetsFromHtml(allHtml, url);
            return { success: true, pages, assets };
          }
        }
      }
      return {
        success: false,
        pages: [],
        error: `No job ID returned from crawl API. Result type: ${typeof startData.result}, value: ${JSON.stringify(startData.result).slice(0, 200)}`,
      };
    }

    // Step 2: Poll for results (max ~80s, every 4s)
    const maxAttempts = 20;
    const pollInterval = 4000;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, pollInterval));

      let pollResponse: Response;
      try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 10000);
        pollResponse = await fetch(`${baseUrl}/crawl/${jobId}`, { headers, signal: controller.signal });
      } catch (err) {
        console.warn(`[crawl] Poll attempt ${attempt + 1} network error:`, err);
        continue;
      }

      const pollBody = await pollResponse.text();
      console.log(`[crawl] Poll attempt ${attempt + 1}: status=${pollResponse.status}, body=${pollBody.slice(0, 300)}`);

      if (!pollResponse.ok) continue;

      let pollData: Record<string, unknown>;
      try {
        pollData = JSON.parse(pollBody);
      } catch {
        console.warn(`[crawl] Poll returned invalid JSON`);
        continue;
      }
      if (!pollData.success) continue;

      const result = pollData.result as Record<string, unknown> | undefined;
      if (!result) continue;

      console.log(`[crawl] Poll result status=${result.status}, records=${((result.records as unknown[]) || []).length}`);

      // Extract any available records for progress reporting
      const records = (result.records || []) as Record<string, unknown>[];
      if (records.length > 0 && options?.onProgress) {
        const partialPages = extractPagesFromRecords(records, url);
        if (partialPages.length > 0) {
          options.onProgress(partialPages);
        }
      }

      if (result.status !== "completed") continue;

      // Final extraction from completed results
      const pages = extractPagesFromRecords(records, url);
      console.log(`[crawl] Completed. Pages with content: ${pages.length}`);

      if (pages.length === 0) {
        return {
          success: false,
          pages: [],
          error: "Crawl completed but no pages with content found",
        };
      }

      // Extract assets from ALL pages, not just the first one
      const allHtml = pages.map((p) => p.html).join("\n");
      const assets = extractAssetsFromHtml(allHtml, url);
      return { success: true, pages, assets };
    }

    console.error(`[crawl] Timed out after ${maxAttempts} poll attempts (~${maxAttempts * pollInterval / 1000}s)`);
    return {
      success: false,
      pages: [],
      error: `Crawl timed out after ${maxAttempts * pollInterval / 1000} seconds`,
    };
  } catch (err) {
    console.error("[crawl] Unexpected error:", err);
    return {
      success: false,
      pages: [],
      error: err instanceof Error ? err.message : "Unknown crawl error",
    };
  }
}

function extractPagesFromRecords(records: Record<string, unknown>[], baseUrl: string): CrawledPage[] {
  return records
    .filter((r) => r.html)
    .map((record) => {
      const html = (record.html as string) || "";
      const metadata = (record.metadata as Record<string, string>) || {};
      return {
        url: (record.url as string) || baseUrl,
        title: metadata.title || extractTitle(html),
        markdown: htmlToSimpleMarkdown(html),
        html,
      };
    });
}

/**
 * Extract visual assets, contact info, navigation, and social links from HTML.
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

  // ---------- All images (deduplicated, absolute URLs) ----------
  const imgRegex = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  const seen = new Set<string>();
  const images: { url: string; alt: string }[] = [];
  let m;
  while ((m = imgRegex.exec(html)) !== null) {
    const rawSrc = m[1];
    if (rawSrc.startsWith("data:") || rawSrc.includes("1x1") || rawSrc.includes("pixel")) continue;

    const imgUrl = resolve(rawSrc);
    if (seen.has(imgUrl)) continue;
    seen.add(imgUrl);
    const altMatch = m[0].match(/\balt=["']([^"']*)["']/i);
    images.push({ url: imgUrl, alt: altMatch?.[1] || "" });

    // Also extract highest-res srcset image
    const srcsetMatch = m[0].match(/\bsrcset=["']([^"']*)["']/i);
    if (srcsetMatch) {
      const srcsetParts = srcsetMatch[1].split(",").map((s) => s.trim().split(/\s+/));
      const highRes = srcsetParts.sort((a, b) => {
        const aW = parseInt(a[1]) || 0;
        const bW = parseInt(b[1]) || 0;
        return bW - aW;
      })[0];
      if (highRes?.[0]) {
        const hiUrl = resolve(highRes[0]);
        if (!seen.has(hiUrl)) {
          seen.add(hiUrl);
          images.push({ url: hiUrl, alt: altMatch?.[1] || "" });
        }
      }
    }

    if (images.length >= 30) break;
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
    images: images.slice(0, 20),
    colors: Array.from(colorSet).slice(0, 20),
    companyName,
    metaDescription,
    socialLinks,
    navLinks: navLinks.slice(0, 10),
    phoneNumbers: phoneNumbers.slice(0, 3),
    emails: emails.slice(0, 3),
    address,
  };
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

  // Convert lists (handle ordered lists with numbers)
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content) => {
    let counter = 1;
    return "\n" + content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, () => {
      // We need the match text, so we use a workaround
      return "";
    }) + "\n";
  });
  // Actually, let's handle lists more carefully
  // First, convert ordered lists
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
