/**
 * Comparative Scoring & Benchmarking Engine
 *
 * Compares site scores against industry benchmarks to produce:
 * - Percentile ranks per category
 * - Letter grades (A+ to F)
 * - Improvement potential estimates
 * - Executive dashboard data (health score, radar, quick wins, trends)
 */

import type { ScoringResult } from "./scoring";
import type { BusinessProfile, Finding } from "./supabase";
import {
  type IndustryType,
  type MetricCategory,
  getBenchmark,
  resolveIndustryType,
  METRIC_LABELS_CS,
  INDUSTRY_LABELS_CS,
} from "./industry-standards";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PercentileRank {
  metric: MetricCategory;
  score: number;
  percentile: number; // 0-100, where user's site stands
  industryMedian: number;
  delta: number; // score - median (positive = above average)
  label: string; // Czech label
}

export type LetterGrade = "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";

export interface CategoryGrade {
  metric: MetricCategory;
  grade: LetterGrade;
  score: number;
  percentile: number;
  label: string;
}

export interface ImprovementItem {
  metric: MetricCategory;
  currentScore: number;
  targetScore: number; // p75 benchmark
  potentialGain: number;
  priority: "vysoká" | "střední" | "nízká";
  description: string;
}

export interface QuickWin {
  title: string;
  category: MetricCategory;
  impact: number; // estimated score improvement
  effort: "nízká" | "střední" | "vysoká";
  description: string;
}

export interface RadarAxis {
  axis: string;
  value: number; // 0-100 normalized
  benchmark: number; // industry median
}

export type TrendDirection = "zlepšení" | "zhoršení" | "stabilní";

export interface TrendIndicator {
  metric: MetricCategory;
  direction: TrendDirection;
  label: string;
}

export interface CompetitorComparison {
  industryType: IndustryType;
  industryLabel: string;
  overallPercentile: number;
  summary: string;
}

export interface ExecutiveDashboard {
  overallHealthScore: number; // 0-100
  overallGrade: LetterGrade;
  radarChart: RadarAxis[];
  quickWins: QuickWin[];
  competitorComparison: CompetitorComparison;
  trendIndicators: TrendIndicator[];
  categoryGrades: CategoryGrade[];
}

export interface BenchmarkResults {
  industryType: IndustryType;
  industryLabel: string;
  percentileRanks: PercentileRank[];
  categoryGrades: CategoryGrade[];
  improvements: ImprovementItem[];
  executiveDashboard: ExecutiveDashboard;
}

// ─── Percentile Calculation ───────────────────────────────────────────────────

/**
 * Calculate percentile rank by interpolating between known percentile points.
 */
function calculatePercentileRank(
  score: number,
  p10: number,
  p25: number,
  p50: number,
  p75: number,
  p90: number
): number {
  if (score <= p10) {
    // Below p10 — linearly scale 0-10
    return Math.max(0, Math.round((score / Math.max(p10, 1)) * 10));
  }
  if (score <= p25) {
    return Math.round(10 + ((score - p10) / Math.max(p25 - p10, 1)) * 15);
  }
  if (score <= p50) {
    return Math.round(25 + ((score - p25) / Math.max(p50 - p25, 1)) * 25);
  }
  if (score <= p75) {
    return Math.round(50 + ((score - p50) / Math.max(p75 - p50, 1)) * 25);
  }
  if (score <= p90) {
    return Math.round(75 + ((score - p75) / Math.max(p90 - p75, 1)) * 15);
  }
  // Above p90 — linearly scale 90-100
  const overshoot = Math.min(score - p90, 20);
  return Math.min(100, Math.round(90 + (overshoot / 20) * 10));
}

// ─── Letter Grading ───────────────────────────────────────────────────────────

function scoreToGrade(percentile: number): LetterGrade {
  if (percentile >= 95) return "A+";
  if (percentile >= 85) return "A";
  if (percentile >= 75) return "B+";
  if (percentile >= 60) return "B";
  if (percentile >= 45) return "C+";
  if (percentile >= 30) return "C";
  if (percentile >= 15) return "D";
  return "F";
}

// ─── Core Functions ───────────────────────────────────────────────────────────

const CATEGORY_KEYS: MetricCategory[] = [
  "performance",
  "seo",
  "accessibility",
  "security",
  "content",
  "ai-visibility",
];

/**
 * Map ScoringResult category keys to our MetricCategory keys.
 */
function getScoreForMetric(
  scores: ScoringResult,
  metric: MetricCategory
): number {
  switch (metric) {
    case "performance":
      return scores.categories.performance.score;
    case "seo":
      return scores.categories.seo.score;
    case "accessibility":
      return scores.categories.accessibility.score;
    case "security":
      return scores.categories.security.score;
    case "content":
      return scores.categories.content.score;
    case "ai-visibility":
      return scores.categories.aiVisibility.score;
  }
}

/**
 * Calculate percentile ranks for all categories.
 */
export function calculatePercentileRanks(
  scores: ScoringResult,
  industryType: IndustryType
): PercentileRank[] {
  return CATEGORY_KEYS.map((metric) => {
    const score = getScoreForMetric(scores, metric);
    const benchmark = getBenchmark(metric, industryType);
    const { p10, p25, p50, p75, p90 } = benchmark.percentiles;
    const percentile = calculatePercentileRank(score, p10, p25, p50, p75, p90);

    return {
      metric,
      score,
      percentile,
      industryMedian: p50,
      delta: score - p50,
      label: METRIC_LABELS_CS[metric],
    };
  });
}

/**
 * Calculate letter grades for all categories.
 */
export function calculateCategoryGrades(
  ranks: PercentileRank[]
): CategoryGrade[] {
  return ranks.map((r) => ({
    metric: r.metric,
    grade: scoreToGrade(r.percentile),
    score: r.score,
    percentile: r.percentile,
    label: r.label,
  }));
}

/**
 * Calculate improvement potential for categories below industry p75.
 */
export function calculateImprovements(
  scores: ScoringResult,
  industryType: IndustryType
): ImprovementItem[] {
  const items: ImprovementItem[] = [];

  for (const metric of CATEGORY_KEYS) {
    const score = getScoreForMetric(scores, metric);
    const benchmark = getBenchmark(metric, industryType);
    const target = benchmark.percentiles.p75;

    if (score < target) {
      const gap = target - score;
      let priority: ImprovementItem["priority"];
      if (gap >= 25) priority = "vysoká";
      else if (gap >= 12) priority = "střední";
      else priority = "nízká";

      items.push({
        metric,
        currentScore: score,
        targetScore: target,
        potentialGain: gap,
        priority,
        description: `${METRIC_LABELS_CS[metric]}: zvýšení z ${score} na ${target} bodů (oborový 75. percentil)`,
      });
    }
  }

  // Sort by potential gain descending
  items.sort((a, b) => b.potentialGain - a.potentialGain);
  return items;
}

/**
 * Generate top quick wins from findings and benchmark gaps.
 */
function generateQuickWins(
  findings: Finding[],
  improvements: ImprovementItem[]
): QuickWin[] {
  const wins: QuickWin[] = [];

  // From findings: look for easy fixes (info/warning severity with high impact keywords)
  const quickFixKeywords = [
    { pattern: /meta.?desc/i, title: "Přidat meta popis", category: "seo" as MetricCategory, impact: 5, effort: "nízká" as const },
    { pattern: /alt.?(text|tag|attr)/i, title: "Doplnit alt texty obrázků", category: "accessibility" as MetricCategory, impact: 4, effort: "nízká" as const },
    { pattern: /compress|gzip|brotli/i, title: "Zapnout kompresi", category: "performance" as MetricCategory, impact: 8, effort: "nízká" as const },
    { pattern: /hsts/i, title: "Přidat HSTS hlavičku", category: "security" as MetricCategory, impact: 5, effort: "nízká" as const },
    { pattern: /csp|content.?security/i, title: "Nastavit Content Security Policy", category: "security" as MetricCategory, impact: 6, effort: "střední" as const },
    { pattern: /schema|structured.?data|json.?ld/i, title: "Přidat strukturovaná data", category: "seo" as MetricCategory, impact: 7, effort: "střední" as const },
    { pattern: /lazy.?load/i, title: "Přidat lazy loading obrázků", category: "performance" as MetricCategory, impact: 5, effort: "nízká" as const },
    { pattern: /webp|avif|modern.?image/i, title: "Převést obrázky do WebP", category: "performance" as MetricCategory, impact: 6, effort: "střední" as const },
    { pattern: /canonical/i, title: "Přidat kanonický odkaz", category: "seo" as MetricCategory, impact: 4, effort: "nízká" as const },
    { pattern: /open.?graph|og:/i, title: "Přidat Open Graph značky", category: "seo" as MetricCategory, impact: 3, effort: "nízká" as const },
  ];

  const addedTitles = new Set<string>();
  for (const finding of findings) {
    if (wins.length >= 8) break;
    const desc = `${finding.title} ${finding.description}`;
    for (const kw of quickFixKeywords) {
      if (kw.pattern.test(desc) && !addedTitles.has(kw.title)) {
        addedTitles.add(kw.title);
        wins.push({
          title: kw.title,
          category: kw.category,
          impact: kw.impact,
          effort: kw.effort,
          description: finding.description,
        });
        break;
      }
    }
  }

  // Fill from improvements if not enough wins
  for (const imp of improvements) {
    if (wins.length >= 5) break;
    const title = `Zlepšit ${METRIC_LABELS_CS[imp.metric]}`;
    if (!addedTitles.has(title)) {
      addedTitles.add(title);
      wins.push({
        title,
        category: imp.metric,
        impact: Math.min(10, Math.round(imp.potentialGain / 3)),
        effort: imp.priority === "vysoká" ? "vysoká" : "střední",
        description: imp.description,
      });
    }
  }

  // Sort by impact/effort ratio
  const effortValue = { nízká: 1, střední: 2, vysoká: 3 };
  wins.sort((a, b) => b.impact / effortValue[b.effort] - a.impact / effortValue[a.effort]);

  return wins.slice(0, 5);
}

/**
 * Build 6-axis radar chart data.
 */
function buildRadarChart(
  ranks: PercentileRank[],
  industryType: IndustryType
): RadarAxis[] {
  return CATEGORY_KEYS.map((metric) => {
    const rank = ranks.find((r) => r.metric === metric);
    const benchmark = getBenchmark(metric, industryType);
    return {
      axis: METRIC_LABELS_CS[metric],
      value: rank?.score ?? 0,
      benchmark: benchmark.percentiles.p50,
    };
  });
}

/**
 * Generate trend indicators.
 * Without historical data, we estimate based on how the score compares to benchmarks.
 */
function estimateTrends(ranks: PercentileRank[]): TrendIndicator[] {
  return ranks.map((r) => {
    let direction: TrendDirection;
    if (r.delta >= 10) direction = "zlepšení";
    else if (r.delta <= -10) direction = "zhoršení";
    else direction = "stabilní";

    return {
      metric: r.metric,
      direction,
      label: r.label,
    };
  });
}

/**
 * Build competitor comparison summary.
 */
function buildCompetitorComparison(
  ranks: PercentileRank[],
  industryType: IndustryType
): CompetitorComparison {
  const avgPercentile = Math.round(
    ranks.reduce((sum, r) => sum + r.percentile, 0) / ranks.length
  );

  let summary: string;
  if (avgPercentile >= 80) {
    summary = `Váš web patří mezi nejlepších ${100 - avgPercentile}% v oboru ${INDUSTRY_LABELS_CS[industryType]}. Vynikající výkon oproti konkurenci.`;
  } else if (avgPercentile >= 60) {
    summary = `Váš web je nadprůměrný v oboru ${INDUSTRY_LABELS_CS[industryType]}. S několika úpravami se můžete dostat mezi špičku.`;
  } else if (avgPercentile >= 40) {
    summary = `Váš web je na průměrné úrovni v oboru ${INDUSTRY_LABELS_CS[industryType]}. Existuje významný prostor pro zlepšení.`;
  } else if (avgPercentile >= 20) {
    summary = `Váš web zaostává za většinou konkurence v oboru ${INDUSTRY_LABELS_CS[industryType]}. Doporučujeme zaměřit se na klíčové oblasti.`;
  } else {
    summary = `Váš web má výrazně nižší kvalitu než průměr v oboru ${INDUSTRY_LABELS_CS[industryType]}. Okamžitá optimalizace je nezbytná.`;
  }

  return {
    industryType,
    industryLabel: INDUSTRY_LABELS_CS[industryType],
    overallPercentile: avgPercentile,
    summary,
  };
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Calculate full benchmark results for a site analysis.
 */
export function calculateBenchmarks(
  scores: ScoringResult,
  findings: Finding[],
  siteType?: string,
  businessProfile?: BusinessProfile | null
): BenchmarkResults {
  const industryType = resolveIndustryType(
    siteType,
    businessProfile?.industry
  );

  // Core calculations
  const percentileRanks = calculatePercentileRanks(scores, industryType);
  const categoryGrades = calculateCategoryGrades(percentileRanks);
  const improvements = calculateImprovements(scores, industryType);

  // Executive dashboard
  const avgPercentile = Math.round(
    percentileRanks.reduce((sum, r) => sum + r.percentile, 0) /
      percentileRanks.length
  );

  // Health score: weighted blend of raw overall + percentile position
  const overallHealthScore = Math.round(scores.overall * 0.6 + avgPercentile * 0.4);
  const overallGrade = scoreToGrade(avgPercentile);

  const radarChart = buildRadarChart(percentileRanks, industryType);
  const quickWins = generateQuickWins(findings, improvements);
  const competitorComparison = buildCompetitorComparison(percentileRanks, industryType);
  const trendIndicators = estimateTrends(percentileRanks);

  const executiveDashboard: ExecutiveDashboard = {
    overallHealthScore,
    overallGrade,
    radarChart,
    quickWins,
    competitorComparison,
    trendIndicators,
    categoryGrades,
  };

  return {
    industryType,
    industryLabel: INDUSTRY_LABELS_CS[industryType],
    percentileRanks,
    categoryGrades,
    improvements,
    executiveDashboard,
  };
}
