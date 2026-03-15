import { NextResponse } from "next/server";
import { createAnalysis, updateAnalysis } from "@/lib/supabase";
import { crawlWebsite } from "@/lib/cloudflare";
import type { ExtractedAssets } from "@/lib/cloudflare";
import { getPageSpeedData } from "@/lib/pagespeed";
import { analyzeSEO } from "@/lib/analyzers/seo";
import { analyzeSecurity } from "@/lib/analyzers/security";
import { analyzeUX } from "@/lib/analyzers/ux";
import { analyzeContent } from "@/lib/analyzers/content";
import { analyzeAIVisibility } from "@/lib/analyzers/ai-visibility";
import { generateVariants } from "@/lib/redesign";
import { generateHtmlVariants } from "@/lib/generate-html";
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

  // Store extracted assets (logo, images, colors) for variant generation
  const extractedAssets = crawlResult.assets || null;

  await updateAnalysis(token, {
    status: "analyzing",
    crawled_pages: crawledPages,
    page_count: crawledPages.length,
    extracted_assets: extractedAssets,
  });

  // ─── Stage 2: Analyze (parallel with incremental findings updates) ───
  const mainPage = crawledPages[0];
  const allHtml = crawledPages.map((p) => p.html).join("\n");
  const allMarkdown = crawledPages.map((p) => p.markdown).join("\n\n---\n\n");

  // Track live findings — update DB as each analyzer completes
  let liveFindings: Finding[] = [];
  const scores: Record<string, number> = {};

  const pushFindings = async (
    category: string,
    result: { score: number; findings: Finding[] }
  ) => {
    scores[category] = result.score;
    liveFindings = [...liveFindings, ...result.findings];
    // Update DB with partial results so polling can show them live
    const update: Record<string, unknown> = { findings: liveFindings };
    if (category === "performance") update.score_performance = result.score;
    if (category === "seo") update.score_seo = result.score;
    if (category === "security") update.score_security = result.score;
    if (category === "ux") update.score_ux = result.score;
    if (category === "content") update.score_content = result.score;
    if (category === "aiVisibility") update.score_ai_visibility = result.score;
    await updateAnalysis(token, update as any).catch(() => {});
  };

  // Run analyzers in parallel, but update DB as each completes
  await Promise.allSettled([
    getPageSpeedData(url).then(
      (data) => pushFindings("performance", { score: data.score, findings: performanceFindings(data) }),
      () => pushFindings("performance", { score: 50, findings: [{ category: "performance", severity: "info", title: "PageSpeed unavailable", description: "Could not reach Google PageSpeed API." }] })
    ),
    Promise.resolve(analyzeSEO(mainPage.html, url)).then(
      (r) => pushFindings("seo", r),
      () => pushFindings("seo", { score: 50, findings: [] })
    ),
    analyzeSecurity(mainPage.html, url).then(
      (r) => pushFindings("security", r),
      () => pushFindings("security", { score: 50, findings: [] })
    ),
    Promise.resolve(analyzeUX(mainPage.html)).then(
      (r) => pushFindings("ux", r),
      () => pushFindings("ux", { score: 50, findings: [] })
    ),
    analyzeContent(allMarkdown, allHtml, url).then(
      (r) => pushFindings("content", r),
      () => pushFindings("content", { score: 50, findings: [] })
    ),
    Promise.resolve(analyzeAIVisibility(mainPage.html)).then(
      (r) => pushFindings("aiVisibility", r),
      () => pushFindings("aiVisibility", { score: 50, findings: [] })
    ),
  ]);

  // Calculate overall score (weighted)
  const overall = Math.round(
    (scores.performance ?? 50) * 0.2 +
      (scores.seo ?? 50) * 0.2 +
      (scores.security ?? 50) * 0.15 +
      (scores.ux ?? 50) * 0.2 +
      (scores.content ?? 50) * 0.15 +
      (scores.aiVisibility ?? 50) * 0.1
  );

  await updateAnalysis(token, {
    status: "generating",
    score_performance: scores.performance ?? 50,
    score_seo: scores.seo ?? 50,
    score_security: scores.security ?? 50,
    score_ux: scores.ux ?? 50,
    score_content: scores.content ?? 50,
    score_ai_visibility: scores.aiVisibility ?? 50,
    score_overall: overall,
    analysis_results: {
      performance: { score: scores.performance ?? 50, findings: liveFindings.filter(f => f.category === "performance") },
      seo: { score: scores.seo ?? 50, findings: liveFindings.filter(f => f.category === "seo") },
      security: { score: scores.security ?? 50, findings: liveFindings.filter(f => f.category === "security") },
      ux: { score: scores.ux ?? 50, findings: liveFindings.filter(f => f.category === "ux") },
      content: { score: scores.content ?? 50, findings: liveFindings.filter(f => f.category === "content") },
      aiVisibility: { score: scores.aiVisibility ?? 50, findings: liveFindings.filter(f => f.category === "aiVisibility") },
    },
    findings: liveFindings,
    variant_progress: { current: 0, total: 3, message: "Preparing variant generation..." },
  });

  // ─── Stage 3: Generate variants (with progress) ───
  let variants: any[] = [];
  try {
    const currentAnalysis = {
      url,
      score_performance: scores.performance ?? 50,
      score_seo: scores.seo ?? 50,
      score_security: scores.security ?? 50,
      score_ux: scores.ux ?? 50,
      score_content: scores.content ?? 50,
      score_ai_visibility: scores.aiVisibility ?? 50,
      score_overall: overall,
    };
    await updateAnalysis(token, {
      variant_progress: { current: 0, total: 3, message: "Designing variant concepts..." },
    });
    variants = await generateVariants(currentAnalysis as any, allMarkdown, extractedAssets);
  } catch (err) {
    console.error("Variant generation failed:", err);
    variants = [];
  }

  // ─── Stage 4: Generate HTML previews (sequential with progress) ───
  const htmlVariants: string[] = [];
  if (variants.length > 0) {
    for (let i = 0; i < variants.length; i++) {
      await updateAnalysis(token, {
        variant_progress: {
          current: i + 1,
          total: variants.length,
          message: `Generating HTML for "${variants[i].name}"...`,
        },
      });
      try {
        const html = await generateHtmlVariants(
          {
            url,
            score_performance: scores.performance ?? 50,
            score_seo: scores.seo ?? 50,
            score_security: scores.security ?? 50,
            score_ux: scores.ux ?? 50,
            score_content: scores.content ?? 50,
            score_overall: overall,
          },
          [variants[i]],
          allMarkdown,
          extractedAssets
        );
        htmlVariants.push(html[0]);
      } catch (err) {
        console.error(`HTML generation failed for variant ${i}:`, err);
        htmlVariants.push("");
      }
    }
  }

  await updateAnalysis(token, {
    status: "complete",
    variants,
    html_variants: htmlVariants,
    variant_progress: null,
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
