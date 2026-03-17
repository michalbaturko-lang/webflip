import type { Finding } from "../supabase";

// ─── Types ───

export interface ScoringResult {
  performance: number;
  seo: number;
  security: number;
  accessibility: number;
  content: number;
  aiVisibility: number;
  overall: number;
}

export interface WeightedFinding extends Finding {
  weight: number;
  suggestedFix?: string;
}

// ─── Severity to Score Impact ───

// Map existing severity system to scoring
// "critical" = error level, "warning" = warning level, "info" = notice level
const SEVERITY_PENALTY: Record<string, number> = {
  critical: 10,
  warning: 3,
  info: 1,
  ok: 0,
};

// ─── Category Weights for Overall Score ───

const CATEGORY_WEIGHTS: Record<string, number> = {
  performance: 0.15,
  seo: 0.25,
  security: 0.10,
  accessibility: 0.15,
  content: 0.20,
  aiVisibility: 0.15,
};

// Category aliases to normalize various category strings
const CATEGORY_ALIASES: Record<string, string> = {
  "ai-visibility": "aiVisibility",
  "ai_visibility": "aiVisibility",
  ux: "accessibility", // UX findings contribute to accessibility score
};

function normalizeCategory(cat: string): string {
  return CATEGORY_ALIASES[cat] || cat;
}

// ─── Calculate Category Score ───

function calculateCategoryScore(findings: Finding[]): number {
  const errorCount = findings.filter((f) => f.severity === "critical").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;
  const noticeCount = findings.filter((f) => f.severity === "info").length;

  const totalPenalty = errorCount * SEVERITY_PENALTY.critical +
    warningCount * SEVERITY_PENALTY.warning +
    noticeCount * SEVERITY_PENALTY.info;

  // Max possible penalty scales with total findings to avoid harsh scores
  // for categories with many checks
  const maxPossiblePenalty = Math.max(
    (errorCount + warningCount + noticeCount) * SEVERITY_PENALTY.critical,
    50 // Minimum denominator to prevent extreme scores
  );

  const score = 100 - (totalPenalty / maxPossiblePenalty) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─── Main Scoring Function ───

export function calculateScores(allFindings: Finding[]): ScoringResult {
  // Group findings by normalized category
  const byCategory = new Map<string, Finding[]>();

  for (const finding of allFindings) {
    const cat = normalizeCategory(finding.category);
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
    byCategory.get(cat)!.push(finding);
  }

  // Calculate per-category scores
  const scores: Record<string, number> = {};
  for (const [category] of Object.entries(CATEGORY_WEIGHTS)) {
    const categoryFindings = byCategory.get(category) || [];
    scores[category] = categoryFindings.length > 0
      ? calculateCategoryScore(categoryFindings)
      : 50; // Default score when no data
  }

  // Overall weighted average
  let overall = 0;
  for (const [category, weight] of Object.entries(CATEGORY_WEIGHTS)) {
    overall += (scores[category] ?? 50) * weight;
  }

  return {
    performance: scores.performance ?? 50,
    seo: scores.seo ?? 50,
    security: scores.security ?? 50,
    accessibility: scores.accessibility ?? 50,
    content: scores.content ?? 50,
    aiVisibility: scores.aiVisibility ?? 50,
    overall: Math.round(overall),
  };
}

// ─── Enhance Findings with Weights ───

export function enhanceFindings(findings: Finding[]): WeightedFinding[] {
  return findings.map((finding) => {
    const weight = getWeight(finding);
    return {
      ...finding,
      weight,
    };
  });
}

function getWeight(finding: Finding): number {
  // Assign weight 1-10 based on severity and category importance
  const baseSeverityWeight: Record<string, number> = {
    critical: 8,
    warning: 4,
    info: 2,
    ok: 0,
  };

  const base = baseSeverityWeight[finding.severity] || 1;

  // Boost weight for high-impact categories
  const categoryBoost: Record<string, number> = {
    seo: 1.2,
    security: 1.3,
    content: 1.1,
    performance: 1.0,
    accessibility: 1.1,
    aiVisibility: 0.9,
    ux: 1.0,
  };

  const boost = categoryBoost[normalizeCategory(finding.category)] || 1.0;
  return Math.min(10, Math.max(1, Math.round(base * boost)));
}

// ─── Merge Scores (existing + new checks) ───

/**
 * Merges existing analyzer scores with new check module findings.
 * Uses the lower score for each category (more conservative approach)
 * to avoid inflating scores.
 */
export function mergeScores(
  existingScores: Record<string, number>,
  newFindings: Finding[]
): ScoringResult {
  const newScores = calculateScores(newFindings);

  // For categories with both existing and new scores,
  // use weighted average (60% existing, 40% new) since existing analyzers
  // have been tuned for accuracy
  const merged: Record<string, number> = {};

  for (const category of Object.keys(CATEGORY_WEIGHTS)) {
    const existingKey = category === "accessibility" ? "ux" : category;
    const existing = existingScores[existingKey];
    const calculated = newScores[category as keyof ScoringResult] as number;

    if (existing !== undefined && existing !== null) {
      // Weighted average
      merged[category] = Math.round(existing * 0.6 + calculated * 0.4);
    } else {
      merged[category] = calculated;
    }
  }

  // Recalculate overall
  let overall = 0;
  for (const [category, weight] of Object.entries(CATEGORY_WEIGHTS)) {
    overall += (merged[category] ?? 50) * weight;
  }

  return {
    performance: merged.performance ?? 50,
    seo: merged.seo ?? 50,
    security: merged.security ?? 50,
    accessibility: merged.accessibility ?? 50,
    content: merged.content ?? 50,
    aiVisibility: merged.aiVisibility ?? 50,
    overall: Math.round(overall),
  };
}

// ─── Sort Findings by Priority ───

export function sortFindingsByPriority(findings: Finding[]): Finding[] {
  const severityOrder: Record<string, number> = {
    critical: 0,
    warning: 1,
    info: 2,
    ok: 3,
  };

  return [...findings].sort((a, b) => {
    const severityDiff = (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4);
    if (severityDiff !== 0) return severityDiff;
    // Secondary sort by category weight (higher weight first)
    const catA = CATEGORY_WEIGHTS[normalizeCategory(a.category)] ?? 0;
    const catB = CATEGORY_WEIGHTS[normalizeCategory(b.category)] ?? 0;
    return catB - catA;
  });
}
