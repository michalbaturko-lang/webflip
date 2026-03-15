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
}

export interface CrawlResult {
  success: boolean;
  pages: CrawledPage[];
  assets?: ExtractedAssets;
  error?: string;
}

/**
 * Crawl a website via Cloudflare Browser Rendering /crawl endpoint.
 * The API is async: POST returns a job ID, then we poll GET for results.
 */
export async function crawlWebsite(url: string): Promise<CrawlResult> {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!apiToken || !accountId) {
    throw new Error("Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID");
  }

  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/crawl`;
  const headers = {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };

  try {
    // Step 1: Start crawl job
    const startResponse = await fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ url, limit: 10 }),
    });

    if (!startResponse.ok) {
      const errorBody = await startResponse.text();
      return {
        success: false,
        pages: [],
        error: `Cloudflare API error ${startResponse.status}: ${errorBody}`,
      };
    }

    const startData = await startResponse.json();
    if (!startData.success) {
      return {
        success: false,
        pages: [],
        error: startData.errors?.[0]?.message || "Failed to start crawl",
      };
    }

    const jobId = startData.result;
    if (!jobId || typeof jobId !== "string") {
      return {
        success: false,
        pages: [],
        error: "No job ID returned from crawl API",
      };
    }

    // Step 2: Poll for results (max 60s, every 3s)
    const maxAttempts = 20;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, 3000));

      const pollResponse = await fetch(`${baseUrl}/${jobId}`, { headers });
      if (!pollResponse.ok) continue;

      const pollData = await pollResponse.json();
      if (!pollData.success) continue;

      const result = pollData.result;
      if (!result || result.status !== "completed") continue;

      // Extract pages from records
      const records = result.records || [];
      const pages: CrawledPage[] = records
        .filter((r: Record<string, unknown>) => r.html)
        .map((record: Record<string, unknown>) => {
          const html = (record.html as string) || "";
          const metadata = (record.metadata as Record<string, string>) || {};
          return {
            url: (record.url as string) || "",
            title: metadata.title || extractTitle(html),
            markdown: htmlToSimpleMarkdown(html),
            html,
          };
        });

      if (pages.length === 0) {
        return {
          success: false,
          pages: [],
          error: "Crawl completed but no pages with content found",
        };
      }

      // Extract assets from the main page HTML
      const assets = extractAssetsFromHtml(pages[0].html, url);

      return { success: true, pages, assets };
    }

    return {
      success: false,
      pages: [],
      error: "Crawl timed out after 60 seconds",
    };
  } catch (err) {
    return {
      success: false,
      pages: [],
      error: err instanceof Error ? err.message : "Unknown crawl error",
    };
  }
}

/**
 * Extract visual assets (logo, favicon, images, CSS colors) from HTML.
 */
function extractAssetsFromHtml(html: string, baseUrl: string): ExtractedAssets {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    base = new URL("https://example.com");
  }

  const resolve = (src: string): string => {
    try {
      return new URL(src, base).href;
    } catch {
      return src;
    }
  };

  // Extract logo: first img in header/nav
  let logo: string | undefined;
  const headerMatch = html.match(/<(?:header|nav)[^>]*>([\s\S]*?)<\/(?:header|nav)>/i);
  if (headerMatch) {
    const logoImg = headerMatch[1].match(/<img[^>]*src="([^"]*)"[^>]*>/i);
    if (logoImg) logo = resolve(logoImg[1]);
  }

  // Extract favicon
  let favicon: string | undefined;
  const faviconMatch = html.match(/<link[^>]*rel="(?:icon|shortcut icon|apple-touch-icon)"[^>]*href="([^"]*)"[^>]*>/i);
  if (faviconMatch) favicon = resolve(faviconMatch[1]);

  // Extract all images (deduplicated)
  const imgRegex = /<img[^>]*\bsrc="([^"]+)"[^>]*>/gi;
  const altRegex = /\balt="([^"]*)"/i;
  const seen = new Set<string>();
  const images: { url: string; alt: string }[] = [];
  let m;
  while ((m = imgRegex.exec(html)) !== null) {
    const imgUrl = resolve(m[1]);
    if (seen.has(imgUrl)) continue;
    seen.add(imgUrl);
    const altMatch = m[0].match(altRegex);
    images.push({ url: imgUrl, alt: altMatch?.[1] || "" });
    if (images.length >= 30) break;
  }

  // Extract colors from inline styles and <style> blocks
  const colorRegex = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]+\)/g;
  const styleBlocks = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  const inlineStyles = html.match(/style="([^"]*)"/gi) || [];
  const colorSet = new Set<string>();
  for (const block of [...styleBlocks, ...inlineStyles]) {
    const matches = block.match(colorRegex) || [];
    for (const c of matches) colorSet.add(c);
  }

  // Extract company name from <title> or og:site_name
  let companyName: string | undefined;
  const ogSiteName = html.match(/<meta[^>]*property="og:site_name"[^>]*content="([^"]*)"[^>]*>/i);
  if (ogSiteName) {
    companyName = ogSiteName[1];
  } else {
    const title = extractTitle(html);
    if (title !== "Untitled") {
      // Use first part before separator
      companyName = title.split(/[|\-–—]/)[0].trim();
    }
  }

  return {
    logo,
    favicon,
    images: images.slice(0, 20),
    colors: Array.from(colorSet).slice(0, 20),
    companyName,
  };
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1]?.trim() || "Untitled";
}

/**
 * Simple HTML to markdown converter (no external deps).
 * Extracts text content with basic structure preservation.
 */
function htmlToSimpleMarkdown(html: string): string {
  let md = html;

  // Remove script and style tags with content
  md = md.replace(/<script[\s\S]*?<\/script>/gi, "");
  md = md.replace(/<style[\s\S]*?<\/style>/gi, "");
  md = md.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  // Convert headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n");
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n");
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n");
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n");
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, "\n##### $1\n");
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, "\n###### $1\n");

  // Convert paragraphs and line breaks
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n");
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<hr\s*\/?>/gi, "\n---\n");

  // Convert links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");

  // Convert bold and italic
  md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**");
  md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*");

  // Convert lists
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");
  md = md.replace(/<\/?[ou]l[^>]*>/gi, "\n");

  // Convert images
  md = md.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi, "![$1]($2)");
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)");

  // Remove remaining HTML tags
  md = md.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  md = md.replace(/&amp;/g, "&");
  md = md.replace(/&lt;/g, "<");
  md = md.replace(/&gt;/g, ">");
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");
  md = md.replace(/&nbsp;/g, " ");

  // Clean up whitespace
  md = md.replace(/\n{3,}/g, "\n\n");
  md = md.trim();

  return md;
}
