import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createAnalysis, updateAnalysis } from "@/lib/supabase";
import { crawlWebsite } from "@/lib/cloudflare";
import { getPageSpeedData } from "@/lib/pagespeed";
import { analyzeSEO } from "@/lib/analyzers/seo";
import { analyzeSecurity } from "@/lib/analyzers/security";
import { analyzeUX } from "@/lib/analyzers/ux";
import { analyzeContent } from "@/lib/analyzers/content";
import { analyzeAIVisibility } from "@/lib/analyzers/ai-visibility";
import { generateVariants } from "@/lib/redesign";
import { generateHtmlVariants } from "@/lib/generate-html";
import { interpretBusiness } from "@/lib/business-interpretation";
import { analyzePage, analyzeSite, generateFindings } from "@/lib/analysis-engine";
import { calculateScores, mapToLegacyScores } from "@/lib/scoring";
import { runDeepAnalysis } from "@/lib/checks";
import type { Finding, BusinessProfile } from "@/lib/supabase";

// Vercel Pro supports up to 300s. Pipeline needs time for crawl+analyze+generate.
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, locale } = body;

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

    // Start async pipeline — waitUntil keeps the function alive after response is sent
    waitUntil(
      runPipeline(normalizedUrl, token, locale).catch(async (err) => {
        console.error(`Pipeline error for ${token}:`, err);
        try {
          await updateAnalysis(token, {
            status: "error",
            error_message: err instanceof Error ? err.message : "Unknown error",
          });
        } catch {
          console.error("Failed to update error status");
        }
      })
    );

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
async function runPipeline(url: string, token: string, locale?: string) {
  try {
  // ─── Stage 1: Crawl ───
  console.log(`[pipeline:${token}] Stage 1: Starting crawl for ${url}`);
  const crawlResult = await crawlWebsite(url, {
    onProgress: (partialPages) => {
      console.log(`[pipeline:${token}] Crawl progress: ${partialPages.length} pages so far`);
      const truncated = partialPages.map((p) => ({
        url: p.url,
        title: p.title,
        markdown: p.markdown.slice(0, 20000),
        html: p.html.slice(0, 50000),
      }));
      updateAnalysis(token, {
        crawled_pages: truncated,
        page_count: truncated.length,
      }).catch(() => {});
    },
  });
  console.log(`[pipeline:${token}] Crawl result: success=${crawlResult.success}, pages=${crawlResult.pages.length}, error=${crawlResult.error || 'none'}`);

  if (!crawlResult.success || crawlResult.pages.length === 0) {
    const errMsg = crawlResult.error || "Crawl returned no pages";
    console.error(`[pipeline:${token}] Crawl failed: ${errMsg}`);
    await updateAnalysis(token, { status: "error", error_message: errMsg }).catch(console.error);
    return;
  }

  // Store crawled pages (truncate HTML to save space)
  const crawledPages = crawlResult.pages.map((p) => ({
    url: p.url,
    title: p.title,
    markdown: p.markdown.slice(0, 20000),
    html: p.html.slice(0, 50000),
    pageType: p.pageType || "other",
  }));

  // Store extracted assets (logo, images, colors) for variant generation
  const extractedAssets = crawlResult.assets || null;

  const allMarkdown = crawledPages.map((p) => p.markdown).join("\n\n---\n\n");

  // ─── Stage 1.5: Business Interpretation ───
  // Build a deep business profile from crawled content BEFORE analysis/generation.
  // This profile drives FAQ, blog, and variant generation with real business intelligence.
  console.log(`[pipeline:${token}] Stage 1.5: Building business profile...`);
  let businessProfile: BusinessProfile | null = null;
  try {
    businessProfile = await interpretBusiness(allMarkdown, url, extractedAssets);
    console.log(`[pipeline:${token}] Business profile built: ${businessProfile.industry} / ${businessProfile.industrySegment}`);
  } catch (err) {
    console.error(`[pipeline:${token}] Business interpretation failed (non-fatal):`, err);
  }

  console.log(`[pipeline:${token}] Stage 2: Updating status to analyzing, ${crawledPages.length} pages crawled`);
  await updateAnalysis(token, {
    status: "analyzing",
    crawled_pages: crawledPages,
    page_count: crawledPages.length,
    extracted_assets: extractedAssets,
    business_profile: businessProfile,
  });

  // ─── Stage 2: Analyze (parallel with incremental findings updates) ───
  const mainPage = crawledPages[0];
  const allHtml = crawledPages.map((p) => p.html).join("\n");

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

  console.log(`[pipeline:${token}] Running 6 analyzers in parallel...`);
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

  // ─── Stage 2b: Comprehensive Analysis Engine (150+ data points) ───
  console.log(`[pipeline:${token}] Running comprehensive analysis engine...`);
  let engineFindings: Finding[] = [];
  try {
    // Run the new analysis engine on all crawled pages
    const pageAnalyses = crawledPages.map((p) => analyzePage(p.html, p.url));
    const siteAnalysis = analyzeSite(pageAnalyses);
    const rawEngineFindings = generateFindings(siteAnalysis);

    // Calculate new comprehensive scores
    const scoringResult = calculateScores(siteAnalysis, rawEngineFindings);
    const legacyScores = mapToLegacyScores(scoringResult);

    // Map engine findings to legacy Finding format for backward compatibility
    engineFindings = rawEngineFindings.map((ef) => ({
      category: ef.category === "ai-visibility" ? "aiVisibility" : ef.category === "images" ? "performance" : ef.category === "structure" ? "ux" : ef.category,
      severity: ef.severity === "error" ? "critical" : ef.severity === "notice" ? "info" : ef.severity,
      title: ef.title,
      description: ef.description,
    }));

    // Merge engine scores with existing analyzer scores (engine takes priority for categories it covers)
    scores.performance = scores.performance ?? legacyScores.score_performance;
    scores.seo = scores.seo ?? legacyScores.score_seo;
    scores.security = scores.security ?? legacyScores.score_security;
    scores.ux = scores.ux ?? legacyScores.score_ux;
    scores.content = scores.content ?? legacyScores.score_content;
    scores.aiVisibility = scores.aiVisibility ?? legacyScores.score_ai_visibility;

    console.log(`[pipeline:${token}] Engine produced ${rawEngineFindings.length} findings, grade: ${scoringResult.grade}`);
  } catch (err) {
    console.error(`[pipeline:${token}] Analysis engine error (non-fatal):`, err);
  }

  // Merge engine findings with existing findings (deduplicate by title)
  const existingTitles = new Set(liveFindings.map(f => f.title));
  const newEngineFindings = engineFindings.filter(f => !existingTitles.has(f.title));
  liveFindings = [...liveFindings, ...newEngineFindings];

  // ─── Stage 2.5: Deep Analysis Checks ───
  console.log(`[pipeline:${token}] Running deep analysis checks...`);
  try {
    const $ = await import("cheerio").then((m) => m.load(mainPage.html));
    const deepResult = runDeepAnalysis({
      pages: crawledPages,
      siteUrl: url,
      mainPageTitle: $("title").text().trim(),
      mainPageH1: $("h1").first().text().trim(),
      mainPageMetaDesc: $('meta[name="description"]').attr("content")?.trim() || "",
      existingScores: scores,
    });

    // Merge deep analysis findings into live findings
    liveFindings = [...liveFindings, ...deepResult.findings];

    // Update scores with merged values
    scores.performance = deepResult.scores.performance;
    scores.seo = deepResult.scores.seo;
    scores.security = deepResult.scores.security;
    scores.ux = deepResult.scores.accessibility;
    scores.content = deepResult.scores.content;
    scores.aiVisibility = deepResult.scores.aiVisibility;

    console.log(`[pipeline:${token}] Deep analysis: ${deepResult.findings.length} additional findings, site type: ${deepResult.siteType}`);

    // Persist deep analysis metadata alongside business profile
    await updateAnalysis(token, {
      findings: liveFindings,
    }).catch(() => {});
  } catch (err) {
    console.error(`[pipeline:${token}] Deep analysis failed (non-fatal):`, err);
  }

  // Calculate overall score (weighted)
  const overall = Math.round(
    (scores.performance ?? 50) * 0.15 +
      (scores.seo ?? 50) * 0.25 +
      (scores.security ?? 50) * 0.10 +
      (scores.ux ?? 50) * 0.15 +
      (scores.content ?? 50) * 0.20 +
      (scores.aiVisibility ?? 50) * 0.15
  );

  console.log(`[pipeline:${token}] Analyzers done. Scores:`, scores, `Overall: ${overall}`);
  console.log(`[pipeline:${token}] Stage 3: Updating status to generating`);
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
  console.log(`[pipeline:${token}] Stage 3: Generating variant concepts...`);
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
    variants = await generateVariants(currentAnalysis as any, allMarkdown, extractedAssets, businessProfile, locale);
    console.log(`[pipeline:${token}] Generated ${variants.length} variant concepts`);
    await updateAnalysis(token, { variants }).catch(() => {});
  } catch (err) {
    console.error(`[pipeline:${token}] Variant generation failed:`, err);
    variants = [];
  }

  // ─── Stage 4: Generate HTML previews (sequential with progress) ───
  console.log(`[pipeline:${token}] Stage 4: Generating HTML previews for ${variants.length} variants...`);
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
          extractedAssets,
          businessProfile
        );
        htmlVariants.push(html[0]);
      } catch (err) {
        console.error(`HTML generation failed for variant ${i}:`, err);
        htmlVariants.push("");
      }
    }
  }

  console.log(`[pipeline:${token}] Stage 5: Marking as complete. HTML variants: ${htmlVariants.length}`);
  await updateAnalysis(token, {
    status: "complete",
    variants,
    html_variants: htmlVariants,
    variant_progress: null,
    completed_at: new Date().toISOString(),
  });
  console.log(`[pipeline:${token}] Pipeline completed successfully!`);

  } catch (err) {
    console.error(`[pipeline:${token}] FATAL pipeline error:`, err);
    await updateAnalysis(token, {
      status: "error",
      error_message: err instanceof Error ? err.message : "Pipeline failed unexpectedly",
    }).catch(console.error);
  }
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
