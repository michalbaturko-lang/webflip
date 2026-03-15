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
 * Start a crawl job via Cloudflare Browser Rendering /crawl endpoint.
 * This is a synchronous call — Cloudflare crawls and returns results directly.
 */
export async function crawlWebsite(url: string): Promise<CrawlResult> {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!apiToken || !accountId) {
    throw new Error("Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID");
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/crawl`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        scrapeOptions: {
          formats: ["markdown", "html"],
        },
        limit: 20,
        maxDepth: 2,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        pages: [],
        error: `Cloudflare API error ${response.status}: ${errorBody}`,
      };
    }

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        pages: [],
        error: data.errors?.[0]?.message || "Crawl failed",
      };
    }

    // Parse crawl results
    const pages: CrawledPage[] = (data.result || []).map((page: Record<string, unknown>) => ({
      url: (page.url as string) || "",
      title: (page.metadata as Record<string, string>)?.title || extractTitle(page.html as string || ""),
      markdown: (page.markdown as string) || "",
      html: (page.html as string) || "",
    }));

    return { success: true, pages };
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
