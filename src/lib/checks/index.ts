/**
 * Analysis Quality Checks — Phase 2
 *
 * Intelligent analysis layer providing deep content, accessibility,
 * performance, SEO, and site structure checks.
 */

export { analyzeContentQuality } from "./content-quality";
export type { ContentQualityResult, PageContent } from "./content-quality";

export { analyzeAccessibility } from "./accessibility";
export type { AccessibilityResult } from "./accessibility";

export { analyzePerformance } from "./performance";
export type { PerformanceResult } from "./performance";

export { analyzeSeoDeep } from "./seo-deep";
export type { SeoDeepResult, PageInfo } from "./seo-deep";

export { analyzeSiteStructure } from "./site-structure";
export type { SiteStructureResult, PageData, PageType, SiteType } from "./site-structure";

export { calculateScores, mergeScores, enhanceFindings, sortFindingsByPriority } from "./scoring";
export type { ScoringResult, WeightedFinding } from "./scoring";

import type { Finding } from "../supabase";
import { analyzeContentQuality } from "./content-quality";
import { analyzeAccessibility } from "./accessibility";
import { analyzePerformance } from "./performance";
import { analyzeSeoDeep } from "./seo-deep";
import { analyzeSiteStructure } from "./site-structure";
import { mergeScores, sortFindingsByPriority } from "./scoring";
import type { ScoringResult } from "./scoring";

export interface DeepAnalysisInput {
  pages: { url: string; title: string; html: string; markdown: string }[];
  siteUrl: string;
  mainPageTitle: string;
  mainPageH1: string;
  mainPageMetaDesc: string;
  responseHeaders?: Record<string, string>;
  existingScores?: Record<string, number>;
}

export interface DeepAnalysisResult {
  findings: Finding[];
  scores: ScoringResult;
  siteType: string;
  pageTypes: { url: string; type: string; confidence: number }[];
}

/**
 * Run all deep analysis checks and return combined findings + scores.
 */
export function runDeepAnalysis(input: DeepAnalysisInput): DeepAnalysisResult {
  const allFindings: Finding[] = [];

  // 1. Content Quality
  const contentResult = analyzeContentQuality(
    input.pages,
    input.mainPageTitle,
    input.mainPageH1,
    input.mainPageMetaDesc
  );
  allFindings.push(...contentResult.findings);

  // 2. Accessibility (run on main page HTML)
  const mainHtml = input.pages[0]?.html || "";
  const accessibilityResult = analyzeAccessibility(mainHtml);
  allFindings.push(...accessibilityResult.findings);

  // 3. Performance
  const performanceResult = analyzePerformance(
    mainHtml,
    input.siteUrl,
    input.responseHeaders
  );
  allFindings.push(...performanceResult.findings);

  // 4. SEO Deep
  const seoDeepResult = analyzeSeoDeep(input.pages, input.siteUrl);
  allFindings.push(...seoDeepResult.findings);

  // 5. Site Structure
  const structureResult = analyzeSiteStructure(input.pages, input.siteUrl);
  allFindings.push(...structureResult.findings);

  // Calculate merged scores
  const scores = input.existingScores
    ? mergeScores(input.existingScores, allFindings)
    : mergeScores({}, allFindings);

  // Sort findings by priority
  const sortedFindings = sortFindingsByPriority(allFindings);

  return {
    findings: sortedFindings,
    scores,
    siteType: structureResult.siteType,
    pageTypes: structureResult.pageTypes,
  };
}
