import { NextResponse } from "next/server";
import { createAnalysis, updateAnalysis } from "@/lib/supabase";
import { crawlWebsite } from "@/lib/cloudflare";
import { getPageSpeedData } from "@/lib/pagespeed";
import { analyzeSEO } from "@/lib/analyzers/seo";
import { analyzeSecurity } from "@/lib/analyzers/security";
import { analyzeUX } from "@/lib/analyzers/ux";
import { analyzeContent } from "@/lib/analyzers/content";
import { analyzeAIVisibility } from "@/lib/analyzers/ai-visibility";
import { generateVariants } from "@/lib/redesign";
import type { Finding } from "@/lib/supabase";

// Vercel Free = 10s, Pro = 60s. Pipeline needs ~45s for crawl+analyze+generate.
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    const normalizedUrl = parsedUrl.toString();

    // Generate unique token
    const token =
      btoa(normalizedUrl).replace(/[/+=]/g, "").slice(0, 12) +
      Date.now().toString(36);

    // Create DB record
    await createAnalysis(normalizedUrl, token);
    await updateAnalysis(token, { status: "crawling" });

    // Start async pipeline (don't await — return token immediately)
    runPipeline(normalizedUrl, token).catch((err) => {
      console.error(`Pipeline error for ${token}:`, err);
      updateAnalysis(token, {
        status: "error",
        error_message: err instanceof Error ? err.message : "Unknown error",
      }).catch(console.error);
    });

    return NextResponse.json({ token, status: "crawling" });
  } catch (err) {
    console.error("POST /api/analyze error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Full analysis pipeline — runs async after returning the token.
 */
async function runPipeline(url: string, token: string) {
  // ─── Stage 1: Crawl ───
  const crawlResult = await crawlWebsite(url);
  if (!crawlResult.success || crawlResult.pages.length === 0) {
    throw new Error(crawlResult.error || "Crawl returned no pages");
  }

  // Store crawled pages (truncate HTML to save space)
  const crawledPages = crawlResult.pages.map((p) => ({
    url: p.url,
    title: p.title,
    markdown: p.markdown.slice(0, 20000),
    html: p.html.slice(0, 50000),
  }));

  await updateAnalysis(token, {
    status: "analyzing",
    crawled_pages: crawledPages,
    page_count: crawledPages.length,
  });

  // ─── Stage 2: Analyze (parallel) ───
  const mainPage = crawledPages[0];
  const allHtml = crawledPages.map((p) => p.html).join("\n");
  const allMarkdown = crawledPages.map((p) => p.markdown).join("\n\n---\n\n");

  const [
    performanceResult,
    seoResult,
    securityResult,
    uxResult,
    contentResult,
    aiVisibilityResult,
  ] = await Promise.allSettled([
    getPageSpeedData(url),
    Promise.resolve(analyzeSEO(mainPage.html, url)),
    analyzeSecurity(mainPage.html, url),
    Promise.resolve(analyzeUX(mainPage.html)),
    analyzeContent(allMarkdown, allHtml, url),
    Promise.resolve(analyzeAIVisibility(mainPage.html)),
  ]);

  // Extract results (use defaults on failure)
  const performance =
    performanceResult.status === "fulfilled"
      ? { score: performanceResult.value.score, findings: performanceFindings(performanceResult.value) }
      : { score: 50, findings: [{ category: "performance", severity: "info" as const, title: "PageSpeed unavailable", description: "Could not reach Google PageSpeed API." }] };

  const seo =
    seoResult.status === "fulfilled" ? seoResult.value : { score: 50, findings: [] };

  const security =
    securityResult.status === "fulfilled" ? securityResult.value : { score: 50, findings: [] };

  const ux =
    uxResult.status === "fulfilled" ? uxResult.value : { score: 50, findings: [] };

  const content =
    contentResult.status === "fulfilled" ? contentResult.value : { score: 50, findings: [] };

  const aiVisibility =
    aiVisibilityResult.status === "fulfilled" ? aiVisibilityResult.value : { score: 50, findings: [] };

  // Calculate overall score (weighted)
  const overall = Math.round(
    performance.score * 0.2 +
      seo.score * 0.2 +
      security.score * 0.15 +
      ux.score * 0.2 +
      content.score * 0.15 +
      aiVisibility.score * 0.1
  );

  // Collect all findings
  const allFindings: Finding[] = [
    ...performance.findings,
    ...seo.findings,
    ...security.findings,
    ...ux.findings,
    ...content.findings,
    ...aiVisibility.findings,
  ];

  await updateAnalysis(token, {
    status: "generating",
    score_performance: performance.score,
    score_seo: seo.score,
    score_security: security.score,
    score_ux: ux.score,
    score_content: content.score,
    score_ai_visibility: aiVisibility.score,
    score_overall: overall,
    analysis_results: {
      performance,
      seo,
      security,
      ux,
      content,
      aiVisibility,
    },
    findings: allFindings,
  });

  // ─── Stage 3: Generate variants ───
  let variants: any[] = [];
  try {
    const currentAnalysis = {
      url,
      score_performance: performance.score,
      score_seo: seo.score,
      score_security: security.score,
      score_ux: ux.score,
      score_content: content.score,
      score_ai_visibility: aiVisibility.score,
      score_overall: overall,
    };
    variants = await generateVariants(currentAnalysis as any, allMarkdown);
  } catch (err) {
    console.error("Variant generation failed:", err);
    variants = [];
  }

  await updateAnalysis(token, {
    status: "complete",
    variants,
    completed_at: new Date().toISOString(),
  });
}

/**
 * Convert PageSpeed data into findings.
 */
function performanceFindings(data: Awaited<ReturnType<typeof getPageSpeedData>>): Finding[] {
  const findings: Finding[] = [];

  // Core Web Vitals
  if (data.metrics.lcp > 4000) {
    findings.push({ category: "performance", severity: "critical", title: "Slow LCP", description: `Largest Contentful Paint is ${(data.metrics.lcp / 1000).toFixed(1)}s. Should be under 2.5s.` });
  } else if (data.metrics.lcp > 2500) {
    findings.push({ category: "performance", severity: "warning", title: "LCP needs improvement", description: `LCP is ${(data.metrics.lcp / 1000).toFixed(1)}s. Target: under 2.5s.` });
  } else {
    findings.push({ category: "performance", severity: "ok", title: "Good LCP", description: `LCP is ${(data.metrics.lcp / 1000).toFixed(1)}s — fast.` });
  }

  if (data.metrics.cls > 0.25) {
    findings.push({ category: "performance", severity: "critical", title: "High layout shift", description: `CLS is ${data.metrics.cls.toFixed(3)}. Should be under 0.1.` });
  } else if (data.metrics.cls > 0.1) {
    findings.push({ category: "performance", severity: "warning", title: "CLS needs improvement", description: `CLS is ${data.metrics.cls.toFixed(3)}. Target: under 0.1.` });
  }

  if (data.metrics.fcp > 3000) {
    findings.push({ category: "performance", severity: "warning", title: "Slow First Paint", description: `FCP is ${(data.metrics.fcp / 1000).toFixed(1)}s. Users see blank screen too long.` });
  }

  if (data.metrics.tbt > 600) {
    findings.push({ category: "performance", severity: "warning", title: "High blocking time", description: `Total Blocking Time is ${Math.round(data.metrics.tbt)}ms. Page feels unresponsive.` });
  }

  // Page size
  const sizeMB = data.totalSize / (1024 * 1024);
  if (sizeMB > 5) {
    findings.push({ category: "performance", severity: "critical", title: "Very large page", description: `Page is ${sizeMB.toFixed(1)}MB. Should be under 3MB for mobile.` });
  } else if (sizeMB > 3) {
    findings.push({ category: "performance", severity: "warning", title: "Large page size", description: `Page is ${sizeMB.toFixed(1)}MB. Consider optimizing assets.` });
  }

  // Optimization checks
  if (!data.usesCompression) {
    findings.push({ category: "performance", severity: "warning", title: "No text compression", description: "Enable gzip/brotli compression to reduce transfer size." });
  }
  if (!data.usesWebP) {
    findings.push({ category: "performance", severity: "warning", title: "No modern image formats", description: "Use WebP/AVIF instead of JPEG/PNG for smaller image sizes." });
  }
  if (!data.hasLazyImages) {
    findings.push({ category: "performance", severity: "info", title: "No lazy loading", description: "Offscreen images could be lazy loaded to speed up initial load." });
  }

  // Opportunities from PageSpeed
  for (const opp of data.opportunities.slice(0, 3)) {
    findings.push({ category: "performance", severity: "info", title: opp.title, description: `${opp.description} (potential saving: ${opp.savings})` });
  }

  return findings;
}
