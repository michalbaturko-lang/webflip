import type { Finding } from "./supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PriorityCategory =
  | "quick-win"
  | "strategic"
  | "low-priority"
  | "complex";

export interface PrioritizedFinding {
  finding: Finding;
  findingId: string;
  businessValueScore: number; // 0-100
  effortScore: number; // 1-5 (1=easy, 5=hard)
  roi: number; // businessValueScore / effortScore
  category: PriorityCategory;
  dependencies: string[];
}

export interface PrioritizationResult {
  prioritized: PrioritizedFinding[];
  quickWins: PrioritizedFinding[];
  strategic: PrioritizedFinding[];
  lowPriority: PrioritizedFinding[];
  complex: PrioritizedFinding[];
  executiveSummary: ExecutiveSummary;
  overallScore: number;
  letterGrade: string;
}

export interface ExecutiveSummary {
  overallScore: number;
  letterGrade: string;
  criticalCount: number;
  warningCount: number;
  topRecommendations: string[];
  quickWinCount: number;
  estimatedImprovementPotential: number; // points of score improvement
}

// ---------------------------------------------------------------------------
// Impact weight tables (no LLM required — pure algorithmic)
// ---------------------------------------------------------------------------

/** SEO impact: how much does this type of finding affect search rankings */
const SEO_IMPACT: Record<string, number> = {
  "Missing page title": 95,
  "Title too short": 50,
  "Title too long": 40,
  "Missing meta description": 80,
  "Meta description too short": 40,
  "Meta description too long": 30,
  "Missing H1 heading": 85,
  "Multiple H1 headings": 45,
  "Broken heading hierarchy": 35,
  "Poor image alt text coverage": 60,
  "Incomplete alt text": 40,
  "Missing canonical tag": 70,
  "Missing Open Graph tags": 55,
  "Incomplete Open Graph": 35,
  "No structured data": 65,
  "Few internal links": 50,
  "Missing viewport meta": 80,
  "Viewport not responsive": 70,
  "Missing lang attribute": 45,
  "Page set to noindex": 100,
  "Missing Twitter Card": 25,
  "Slow LCP": 75,
  "LCP needs improvement": 50,
  "High layout shift": 65,
  "CLS needs improvement": 40,
  "Slow First Paint": 55,
  "High blocking time": 50,
  "Very large page": 70,
  "Large page size": 45,
  "No text compression": 55,
  "No modern image formats": 40,
  "No lazy loading": 30,
  "No HTTPS": 95,
  "Mixed content detected": 70,
  "Very thin content": 80,
  "Limited content": 50,
  "No contact information": 55,
  "No trust signals": 50,
  "Outdated copyright": 25,
  "Blocked from AI crawlers": 60,
  "Poor content structure": 50,
  "No FAQ section": 35,
  "Weak brand signals": 40,
  "No Schema.org markup": 55,
  "Thin content": 65,
};

/** UX impact: affects conversion/bounce rate */
const UX_IMPACT: Record<string, number> = {
  "Slow LCP": 85,
  "High layout shift": 80,
  "Very large page": 75,
  "No viewport meta tag": 90,
  "Viewport not fully responsive": 75,
  "Poor semantic structure": 45,
  "No navigation found": 90,
  "Minimal navigation": 55,
  "No clear CTA buttons": 80,
  "Form inputs missing labels": 60,
  "No required field indicators": 40,
  "Small touch targets": 65,
  "No accessibility features": 70,
  "Limited accessibility": 40,
  "Weak visual hierarchy": 50,
  "External links without target": 20,
  "No loading indicators": 30,
  "No contact information": 60,
  "No trust signals": 70,
  "No cookie consent detected": 50,
  "No privacy policy link": 45,
  "Slow First Paint": 70,
  "High blocking time": 65,
};

/** Effort score: 1=easy fix, 5=major refactor */
const EFFORT: Record<string, number> = {
  "Missing page title": 1,
  "Title too short": 1,
  "Title too long": 1,
  "Missing meta description": 1,
  "Meta description too short": 1,
  "Meta description too long": 1,
  "Missing H1 heading": 1,
  "Multiple H1 headings": 2,
  "Broken heading hierarchy": 2,
  "Poor image alt text coverage": 3,
  "Incomplete alt text": 2,
  "Missing canonical tag": 1,
  "Missing Open Graph tags": 2,
  "Incomplete Open Graph": 1,
  "No structured data": 3,
  "Few internal links": 3,
  "Missing viewport meta": 1,
  "Viewport not responsive": 1,
  "Viewport not fully responsive": 1,
  "Missing lang attribute": 1,
  "Page set to noindex": 1,
  "Missing Twitter Card": 1,
  "Slow LCP": 4,
  "LCP needs improvement": 3,
  "High layout shift": 3,
  "CLS needs improvement": 3,
  "Slow First Paint": 4,
  "High blocking time": 4,
  "Very large page": 4,
  "Large page size": 3,
  "No text compression": 2,
  "No modern image formats": 3,
  "No lazy loading": 2,
  "No HTTPS": 2,
  "Mixed content detected": 3,
  "Missing CSP header": 2,
  "Missing HSTS header": 1,
  "Clickjacking risk": 2,
  "Missing X-Content-Type-Options": 1,
  "No Referrer-Policy": 1,
  "No Permissions-Policy": 1,
  "Exposed email addresses": 2,
  "No cookie consent detected": 3,
  "No privacy policy link": 2,
  "Unsafe JavaScript patterns": 4,
  "No viewport meta tag": 1,
  "Poor semantic structure": 4,
  "No navigation found": 4,
  "Minimal navigation": 2,
  "No clear CTA buttons": 3,
  "Form inputs missing labels": 2,
  "No required field indicators": 1,
  "Small touch targets": 3,
  "No accessibility features": 4,
  "Limited accessibility": 3,
  "No loading indicators": 3,
  "Weak visual hierarchy": 3,
  "External links without target": 1,
  "Very thin content": 5,
  "Limited content": 4,
  "No contact information": 2,
  "No trust signals": 4,
  "Outdated copyright": 1,
  "Blocked from AI crawlers": 1,
  "Poor content structure": 3,
  "No FAQ section": 3,
  "Weak brand signals": 3,
  "No Schema.org markup": 3,
  "Thin content": 4,
};

/** Known dependency chains: fixing X may fix or improve Y */
const DEPENDENCY_CHAINS: Record<string, string[]> = {
  "Missing page title": ["Missing Open Graph tags", "Weak brand signals"],
  "No HTTPS": ["Mixed content detected", "Missing HSTS header"],
  "Missing viewport meta": ["Viewport not responsive", "No viewport meta tag", "Viewport not fully responsive"],
  "Poor semantic structure": ["No accessibility features", "Weak visual hierarchy"],
  "Very thin content": ["Limited content", "No trust signals", "Weak brand signals", "Thin content"],
  "No structured data": ["No Schema.org markup"],
  "Missing H1 heading": ["Broken heading hierarchy", "Weak visual hierarchy"],
  "Slow LCP": ["LCP needs improvement"],
  "High layout shift": ["CLS needs improvement"],
  "Very large page": ["Large page size", "Slow LCP", "Slow First Paint"],
};

// ---------------------------------------------------------------------------
// Scoring algorithm
// ---------------------------------------------------------------------------

function generateFindingId(finding: Finding, index: number): string {
  const slug = finding.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${finding.category}-${slug}-${index}`;
}

function computeBusinessValue(finding: Finding): number {
  if (finding.severity === "ok" || finding.severity === "info") {
    // Positive findings or informational have no business value to fix
    return 0;
  }

  const seoWeight = SEO_IMPACT[finding.title] ?? 30;
  const uxWeight = UX_IMPACT[finding.title] ?? 20;

  // Severity multiplier
  const severityMul = finding.severity === "critical" ? 1.0 : 0.65;

  // Combine SEO + UX with weights
  const raw = seoWeight * 0.55 + uxWeight * 0.45;

  return Math.min(100, Math.round(raw * severityMul));
}

function computeEffort(finding: Finding): number {
  return EFFORT[finding.title] ?? 3;
}

function findDependencies(
  finding: Finding,
  allFindings: Finding[]
): string[] {
  const deps = DEPENDENCY_CHAINS[finding.title] || [];
  const allTitles = new Set(allFindings.map((f) => f.title));
  return deps.filter((d) => allTitles.has(d));
}

function classifyCategory(
  businessValue: number,
  effort: number
): PriorityCategory {
  const highValue = businessValue >= 40;
  const lowEffort = effort <= 2;

  if (highValue && lowEffort) return "quick-win";
  if (highValue && !lowEffort) return "strategic";
  if (!highValue && lowEffort) return "low-priority";
  return "complex";
}

// ---------------------------------------------------------------------------
// Overall score formula
// ---------------------------------------------------------------------------

function computeOverallScore(findings: Finding[]): number {
  let criticalCount = 0;
  let warningCount = 0;
  let noticeCount = 0;

  for (const f of findings) {
    if (f.severity === "critical") criticalCount++;
    else if (f.severity === "warning") warningCount++;
    else if (f.severity === "info") noticeCount++;
  }

  const score = 100 - (criticalCount * 5 + warningCount * 2 + noticeCount * 0.5);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function letterGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

// ---------------------------------------------------------------------------
// Executive summary
// ---------------------------------------------------------------------------

function buildExecutiveSummary(
  prioritized: PrioritizedFinding[],
  findings: Finding[]
): ExecutiveSummary {
  const overallScore = computeOverallScore(findings);
  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;
  const quickWins = prioritized.filter((p) => p.category === "quick-win");

  // Top 5 recommendations from highest ROI actionable findings
  const actionable = prioritized
    .filter((p) => p.businessValueScore > 0)
    .sort((a, b) => b.roi - a.roi);

  const topRecommendations = actionable.slice(0, 5).map((p) => {
    return p.finding.title;
  });

  // Estimate improvement: sum of value/100 * severity_weight for quick wins
  const improvementPotential = Math.min(
    30,
    Math.round(
      quickWins.reduce((sum, qw) => sum + qw.businessValueScore * 0.05, 0)
    )
  );

  return {
    overallScore,
    letterGrade: letterGrade(overallScore),
    criticalCount,
    warningCount,
    topRecommendations,
    quickWinCount: quickWins.length,
    estimatedImprovementPotential: improvementPotential,
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Prioritize findings using a pure algorithmic scoring model (no LLM calls).
 * Ranks all findings by business value/effort ROI and groups them into
 * actionable categories.
 */
export function prioritizeFindings(findings: Finding[]): PrioritizationResult {
  const prioritized: PrioritizedFinding[] = findings.map((finding, i) => {
    const findingId = generateFindingId(finding, i);
    const businessValueScore = computeBusinessValue(finding);
    const effortScore = computeEffort(finding);
    const roi = effortScore > 0 ? Math.round((businessValueScore / effortScore) * 10) / 10 : 0;
    const dependencies = findDependencies(finding, findings);
    const category = classifyCategory(businessValueScore, effortScore);

    return {
      finding,
      findingId,
      businessValueScore,
      effortScore,
      roi,
      category,
      dependencies,
    };
  });

  // Sort by ROI descending, then by business value descending
  prioritized.sort((a, b) => {
    if (b.roi !== a.roi) return b.roi - a.roi;
    return b.businessValueScore - a.businessValueScore;
  });

  const quickWins = prioritized.filter((p) => p.category === "quick-win");
  const strategic = prioritized.filter((p) => p.category === "strategic");
  const lowPriority = prioritized.filter((p) => p.category === "low-priority");
  const complex = prioritized.filter((p) => p.category === "complex");

  const executiveSummary = buildExecutiveSummary(prioritized, findings);

  return {
    prioritized,
    quickWins,
    strategic,
    lowPriority,
    complex,
    executiveSummary,
    overallScore: executiveSummary.overallScore,
    letterGrade: executiveSummary.letterGrade,
  };
}
