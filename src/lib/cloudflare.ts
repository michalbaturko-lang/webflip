export interface CrawledPage {
  url: string;
  title: string;
  markdown: string;
  html: string;
}

export interface CrawlResult {
  success: boolean;
  pages: CrawledPage[];
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

      return { success: true, pages };
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
