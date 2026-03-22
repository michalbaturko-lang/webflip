/**
 * Weighted Scoring System for Webflipper Analysis
 *
 * Uses log-normal distribution for performance metrics (like Lighthouse)
 * and penalty-based scoring for other categories.
 */

import type { SiteAnalysis, EngineFinding } from "./analysis-engine";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CategoryScoreResult {
  score: number; // 0-100
  weight: number;
  findingCount: { errors: number; warnings: number; notices: number };
}

export interface ScoringResult {
  overall: number; // 0-100
  categories: {
    performance: CategoryScoreResult;
    seo: CategoryScoreResult;
    security: CategoryScoreResult;
    accessibility: CategoryScoreResult;
    content: CategoryScoreResult;
    aiVisibility: CategoryScoreResult;
  };
  grade: string; // A+, A, B, C, D, F
}

// ─── Category Weights ─────────────────────────────────────────────────────────

const WEIGHTS = {
  performance: 0.20,
  seo: 0.25,
  security: 0.15,
  accessibility: 0.15,
  content: 0.15,
  aiVisibility: 0.10,
} as const;

// ─── Log-Normal Scoring (Lighthouse-style) ────────────────────────────────────

/**
 * Attempt a log-normal CDF scoring like Lighthouse.
 * Given a metric value, median, and p10 (10th percentile),
 * compute a 0-100 score.
 */
function logNormalScore(value: number, median: number, p10: number): number {
  if (value <= 0) return 100;
  if (p10 <= 0 || median <= 0) return 50;

  // Log-normal parameters
  const logMedian = Math.log(median);
  const logP10 = Math.log(p10);
  const sigma = (logMedian - logP10) / 1.2816; // z-score at 10th percentile

  if (sigma <= 0) return 50;

  const logValue = Math.log(value);
  const z = (logMedian - logValue) / sigma;

  // Standard normal CDF approximation
  const score = standardNormalCDF(z) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function standardNormalCDF(x: number): number {
  // Approximation of the standard normal CDF
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2);
  return 0.5 * (1.0 + sign * y);
}

// ─── Category Scorers ─────────────────────────────────────────────────────────

function scorePerformance(site: SiteAnalysis): number {
  const main = site.pages[0];
  const perf = main.performance;
  let score = 100;

  // HTML size (target < 100KB, bad > 500KB)
  if (perf.htmlSizeBytes > 500000) score -= 15;
  else if (perf.htmlSizeBytes > 200000) score -= 8;
  else if (perf.htmlSizeBytes > 100000) score -= 3;

  // Render-blocking scripts
  if (perf.renderBlockingScripts > 3) score -= 15;
  else if (perf.renderBlockingScripts > 0) score -= 8;

  // External scripts
  if (perf.externalScriptCount > 20) score -= 10;
  else if (perf.externalScriptCount > 10) score -= 5;

  // Third-party scripts
  if (perf.thirdPartyScriptCount > 10) score -= 10;
  else if (perf.thirdPartyScriptCount > 5) score -= 5;

  // Images without lazy loading
  if (perf.imageCount > 3 && perf.lazyLoadingCount === 0) score -= 8;

  // No compression
  if (!perf.compressionDetected) score -= 10;

  // No cache control
  if (!perf.cacheControlPresent) score -= 5;

  // No font-display
  if (!perf.fontDisplayUsed) score -= 3;

  // No preload hints
  if (perf.preloadHints === 0) score -= 3;

  // No critical CSS
  if (!perf.criticalCssDetected) score -= 3;

  // Inline bloat
  if (perf.inlineCssSizeBytes > 50000) score -= 5;
  if (perf.inlineJsSizeBytes > 50000) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function scoreSeo(site: SiteAnalysis): number {
  const main = site.pages[0];
  const seo = main.onPageSeo;
  let score = 100;

  // Title
  if (!seo.titlePresent) score -= 15;
  else if (seo.titleLength < 30 || seo.titleLength > 65) score -= 5;

  // Meta description
  if (!seo.metaDescriptionPresent) score -= 12;
  else if (seo.metaDescriptionLength < 100 || seo.metaDescriptionLength > 170) score -= 4;

  // H1
  if (!seo.h1Present) score -= 10;
  else if (seo.h1Count > 1) score -= 5;

  // Heading hierarchy
  if (!seo.headingHierarchyValid) score -= 3;

  // Canonical
  if (!seo.canonicalPresent) score -= 5;

  // Noindex
  if (seo.hasNoindex) score -= 20;

  // Open Graph
  const ogCount = [seo.ogTitle, seo.ogDescription, seo.ogImage].filter(Boolean).length;
  if (ogCount === 0) score -= 5;
  else if (ogCount < 3) score -= 2;

  // Twitter Card
  if (!seo.twitterCard) score -= 2;

  // Schema.org
  if (seo.schemaJsonLdCount === 0) score -= 8;

  // Image alt coverage
  if (seo.imageAltCoverage < 50) score -= 10;
  else if (seo.imageAltCoverage < 90) score -= 5;

  // Viewport
  if (!seo.viewportPresent) score -= 10;

  // Language
  if (!seo.langAttribute) score -= 2;

  // Internal links
  if (seo.internalLinkCount < 3) score -= 4;

  // Duplicates (site-level)
  if (site.aggregated.duplicateTitles.length > 0) score -= 5;
  if (site.aggregated.duplicateDescriptions.length > 0) score -= 3;

  return Math.max(0, Math.min(100, score));
}

function scoreSecurity(site: SiteAnalysis): number {
  const main = site.pages[0];
  const sec = main.security;
  let score = 100;

  if (!sec.httpsEnabled) score -= 25;
  if (sec.mixedContentCount > 0) score -= 15;
  if (!sec.hstsPresent) score -= 8;
  if (!sec.cspPresent) score -= 8;
  if (!sec.xFrameOptionsPresent) score -= 5;
  if (!sec.xContentTypeOptionsPresent) score -= 3;
  if (!sec.referrerPolicyPresent) score -= 2;
  if (!sec.permissionsPolicyPresent) score -= 2;
  if (sec.exposedServerVersion) score -= 2;

  const insecureCookies = sec.cookieSecurityFlags.filter(c => !c.secure || !c.httpOnly).length;
  if (insecureCookies > 0) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function scoreAccessibility(site: SiteAnalysis): number {
  const main = site.pages[0];
  const a11y = main.accessibility;
  let score = 100;

  // Image alt
  const totalImages = a11y.imageAltPresent + a11y.imageAltMissing;
  if (totalImages > 0) {
    const altPercent = (a11y.imageAltPresent / totalImages) * 100;
    if (altPercent < 50) score -= 15;
    else if (altPercent < 90) score -= 8;
  }

  // Form labels
  if (a11y.formInputCount > 0 && a11y.formLabelAssociation < a11y.formInputCount) score -= 8;

  // Semantic elements
  const semCount = Object.values(a11y.semanticElements).filter(v => v > 0).length;
  if (semCount < 2) score -= 10;
  else if (semCount < 4) score -= 5;

  // ARIA landmarks
  if (a11y.ariaLandmarks.length === 0) score -= 5;

  // Heading hierarchy
  if (!a11y.headingHierarchyValid) score -= 5;

  // Bad link texts
  if (a11y.badLinkTexts.length > 0) score -= 5;

  // Language
  if (!a11y.langDeclared) score -= 5;

  // Skip nav
  if (!a11y.skipNavPresent) score -= 3;

  // Focus visible
  if (a11y.focusVisibleIssues) score -= 5;

  // Tab index
  if (a11y.tabIndexIssues > 0) score -= 3;

  // Contrast
  const failingContrast = a11y.colorContrastEstimates.filter(c => !c.passes).length;
  if (failingContrast > 0) score -= 8;

  return Math.max(0, Math.min(100, score));
}

function scoreContent(site: SiteAnalysis): number {
  const main = site.pages[0];
  const content = main.contentQuality;
  let score = 100;

  // Word count
  if (content.wordCount < 100) score -= 20;
  else if (content.wordCount < 300) score -= 8;

  // Readability
  if (content.readabilityScore < 30) score -= 8;

  // Text-to-HTML ratio
  if (content.textToHtmlRatio < 0.05) score -= 10;
  else if (content.textToHtmlRatio < 0.1) score -= 5;

  // CTA
  if (content.ctaCount === 0) score -= 10;
  else if (!content.ctaInHero) score -= 3;

  // Contact info
  if (!content.contactInfoPresent) score -= 8;

  // Trust signals
  if (!content.testimonialPresent) score -= 5;

  // FAQ
  if (!content.faqPresent) score -= 3;

  // E-E-A-T
  if (!content.authorInfoPresent && !content.aboutPageLinked) score -= 5;

  // Duplicate content
  if (site.aggregated.duplicateContentPages.length > 0) score -= 8;

  // Copyright freshness
  if (content.contentFreshnessYear && content.contentFreshnessYear < new Date().getFullYear() - 1) score -= 3;

  return Math.max(0, Math.min(100, score));
}

function scoreAiVisibility(site: SiteAnalysis): number {
  const main = site.pages[0];
  const ai = main.aiVisibility;
  let score = 100;

  // Semantic HTML
  if (ai.semanticHtmlScore < 30) score -= 15;
  else if (ai.semanticHtmlScore < 50) score -= 8;

  // Content structure
  if (ai.contentStructureClarity < 20) score -= 15;
  else if (ai.contentStructureClarity < 40) score -= 8;

  // Keyword stuffing
  if (ai.keywordStuffingDetected) score -= 10;

  // Schema
  if (ai.schemaRichness === 0) score -= 10;

  // FAQ schema
  if (!ai.faqSchemaPresent) score -= 5;

  // Metadata completeness
  if (ai.metadataCompletenessScore < 50) score -= 10;
  else if (ai.metadataCompletenessScore < 70) score -= 5;

  // Clean URL
  if (!ai.cleanUrlStructure) score -= 3;

  // Noindex check (from SEO data)
  if (main.onPageSeo.hasNoindex) score -= 30;

  return Math.max(0, Math.min(100, score));
}

// ─── Main Scoring Function ────────────────────────────────────────────────────

export function calculateScores(
  site: SiteAnalysis,
  findings: EngineFinding[]
): ScoringResult {
  // Calculate base category scores
  const perfScore = scorePerformance(site);
  const seoScore = scoreSeo(site);
  const secScore = scoreSecurity(site);
  const a11yScore = scoreAccessibility(site);
  const contentScore = scoreContent(site);
  const aiScore = scoreAiVisibility(site);

  // Count findings per category
  const countFindings = (category: string) => {
    const cats = findings.filter(f => f.category === category);
    return {
      errors: cats.filter(f => f.severity === "error").length,
      warnings: cats.filter(f => f.severity === "warning").length,
      notices: cats.filter(f => f.severity === "notice").length,
    };
  };

  // Apply finding-based penalty adjustment
  // Error * 100 + Warning * 50 + Notice * 10 penalty points
  // Normalized to max 30 point deduction per category
  const applyPenalty = (baseScore: number, counts: ReturnType<typeof countFindings>) => {
    const rawPenalty = counts.errors * 100 + counts.warnings * 50 + counts.notices * 10;
    const normalizedPenalty = Math.min(30, rawPenalty / 20);
    return Math.max(0, Math.min(100, Math.round(baseScore - normalizedPenalty)));
  };

  const perfCounts = countFindings("performance");
  const seoCounts = countFindings("seo");
  const secCounts = countFindings("security");
  const a11yCounts = countFindings("accessibility");
  const contentCounts = countFindings("content");
  const aiCounts = countFindings("ai-visibility");

  const categories = {
    performance: {
      score: applyPenalty(perfScore, perfCounts),
      weight: WEIGHTS.performance,
      findingCount: perfCounts,
    },
    seo: {
      score: applyPenalty(seoScore, seoCounts),
      weight: WEIGHTS.seo,
      findingCount: seoCounts,
    },
    security: {
      score: applyPenalty(secScore, secCounts),
      weight: WEIGHTS.security,
      findingCount: secCounts,
    },
    accessibility: {
      score: applyPenalty(a11yScore, a11yCounts),
      weight: WEIGHTS.accessibility,
      findingCount: a11yCounts,
    },
    content: {
      score: applyPenalty(contentScore, contentCounts),
      weight: WEIGHTS.content,
      findingCount: contentCounts,
    },
    aiVisibility: {
      score: applyPenalty(aiScore, aiCounts),
      weight: WEIGHTS.aiVisibility,
      findingCount: aiCounts,
    },
  };

  // Weighted average
  const overall = Math.round(
    categories.performance.score * WEIGHTS.performance +
    categories.seo.score * WEIGHTS.seo +
    categories.security.score * WEIGHTS.security +
    categories.accessibility.score * WEIGHTS.accessibility +
    categories.content.score * WEIGHTS.content +
    categories.aiVisibility.score * WEIGHTS.aiVisibility
  );

  // Grade
  let grade: string;
  if (overall >= 95) grade = "A+";
  else if (overall >= 90) grade = "A";
  else if (overall >= 80) grade = "B";
  else if (overall >= 65) grade = "C";
  else if (overall >= 50) grade = "D";
  else grade = "F";

  return { overall, categories, grade };
}

/**
 * Map new engine scores to the existing score fields in AnalysisRow
 * for backward compatibility.
 */
export function mapToLegacyScores(scoring: ScoringResult): {
  score_performance: number;
  score_seo: number;
  score_security: number;
  score_ux: number;
  score_content: number;
  score_ai_visibility: number;
  score_overall: number;
} {
  return {
    score_performance: scoring.categories.performance.score,
    score_seo: scoring.categories.seo.score,
    score_security: scoring.categories.security.score,
    // Map accessibility to UX for backward compatibility
    score_ux: scoring.categories.accessibility.score,
    score_content: scoring.categories.content.score,
    score_ai_visibility: scoring.categories.aiVisibility.score,
    score_overall: scoring.overall,
  };
}
