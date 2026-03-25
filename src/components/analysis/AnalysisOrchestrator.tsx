"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Mail,
  Lock,
  Sparkles,
  ArrowRight,
  BarChart3,
  Search,
  Shield,
  Monitor,
  FileText,
  Bot,
  Accessibility,
  Layers,
  ExternalLink,
} from "lucide-react";

import { useLocale, useTranslations } from "next-intl";
import { statusToStep } from "@/types/stepper";

import ProgressBar from "./ProgressBar";
import StageCrawling from "./StageCrawling";
import StageAnalyzing from "./StageAnalyzing";
import StageGenerating from "./StageGenerating";
import CoreWebVitals from "./CoreWebVitals";
import VariantComparison from "@/components/comparison/VariantComparison";
import SEOSuggestions from "./SEOSuggestions";
import { translateFindings } from "@/lib/finding-i18n";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface Props {
  url: string;
  token: string;
  email?: string;
  onStatusChange?: (status: string, variantCount: number, error: string | null) => void;
}

interface ApiResponse {
  token: string;
  url: string;
  status: "pending" | "crawling" | "analyzing" | "generating" | "complete" | "error";
  pageCount?: number;
  pages?: { url: string; title: string }[];
  scores?: {
    performance: number | null;
    seo: number | null;
    security: number | null;
    ux: number | null;
    content: number | null;
    aiVisibility: number | null;
    accessibility: number | null;
    overall: number | null;
  };
  liveFindings?: Finding[];
  liveFindingsTotal?: number;
  variantProgress?: { current: number; total: number; message: string } | null;
  findings?: Finding[];
  findingsPreview?: Finding[];
  findingsTotal?: number;
  variants?: Variant[];
  variantsCount?: number;
  htmlVariantsCount?: number;
  emailRequired?: boolean;
  error?: string;
  enrichment?: EnrichmentData;
  seoSuggestions?: SEOSuggestionsData;
  templateClusters?: TemplateClusterInfo[];
  pagespeedMetrics?: {
    fcp: number;
    lcp: number;
    tbt: number;
    cls: number;
    si: number;
    tti: number;
    fieldData: {
      fcpP75: number | null;
      lcpP75: number | null;
      clsP75: number | null;
      fidP75: number | null;
      inpP75: number | null;
      ttfbP75: number | null;
    } | null;
    lighthouseScore: number;
    accessibilityScore: number;
    source: "lighthouse" | "estimation";
  };
}

interface TemplateClusterInfo {
  id: string;
  name: string;
  templateHash: string;
  pageUrls: string[];
  pageCount: number;
  representativeUrl: string;
  commonIssues: Finding[];
  templateElements: string[];
  contentElements: string[];
}

interface EnrichedFindingData {
  findingId: string;
  finding: Finding;
  explanation: string;
  howToFix: string;
  expectedImprovement: string;
  priorityScore: number;
  businessImpact: string;
  businessValueScore: number;
  effortScore: number;
  roi: number;
  category: "quick-win" | "strategic" | "low-priority" | "complex";
}

interface EnrichmentData {
  businessType: string;
  letterGrade: string;
  healthScore: number;
  executiveSummary: {
    overallScore: number;
    letterGrade: string;
    criticalCount: number;
    warningCount: number;
    topRecommendations: string[];
    quickWinCount: number;
    estimatedImprovementPotential: number;
  };
  recommendations: {
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
    category: string;
  }[];
  impactEstimates: {
    trafficImprovement: number;
    conversionImprovement: number;
    accessibilityCompliance: number;
    healthScoreImprovement: number;
  };
  enrichedFindings: EnrichedFindingData[];
}

interface SEOSuggestionsData {
  suggestions: {
    page_url: string;
    element: "title" | "meta_description" | "h1" | "content_gap";
    current_value: string;
    suggested_value: string;
    reasoning: string;
    impact: "high" | "medium" | "low";
    effort: "easy" | "medium" | "hard";
  }[];
  content_strategy: {
    primary_keywords: string[];
    secondary_keywords: string[];
    content_gaps: string[];
    competitor_angles: string[];
  };
  summary: string;
}

interface Finding {
  category: string;
  severity: "critical" | "warning" | "ok" | "info";
  title: string;
  description: string;
}

interface Variant {
  name: string;
  description: string;
  palette: { primary: string; secondary: string; accent: string; bg: string; text: string };
  typography: { heading: string; body: string };
  layout: string;
  keyFeatures: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const severityConfig = {
  critical: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
  warning: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
  ok: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20" },
  info: { icon: CheckCircle, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
};

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
}

function getScoreColor(score: number) {
  if (score >= 70) return "text-green-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

function getScoreBg(score: number) {
  if (score >= 70) return "bg-green-400";
  if (score >= 50) return "bg-yellow-400";
  return "bg-red-400";
}

// ---------------------------------------------------------------------------
// Sub-components (inline stages that don't have their own file)
// ---------------------------------------------------------------------------

function StageConnecting({ url }: { url: string }) {
  const domain = getDomainFromUrl(url);
  const t = useTranslations("analysis");
  return (
    <motion.div
      key="connecting"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-8"
    >
      <div className="relative h-32 w-32">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-blue-400/40"
          animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-blue-400/30"
          animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Globe className="h-12 w-12 text-blue-400" />
        </div>
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          {t("connectingTo", { domain })}
        </h2>
        <p className="font-mono text-sm" style={{ color: "var(--text-muted)" }}>{url}</p>
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-2 w-2 rounded-full bg-blue-400"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const scoreColor = score >= 70 ? "#4ade80" : score >= 50 ? "#facc15" : "#f87171";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <motion.circle
          cx="90" cy="90" r={radius}
          fill="none" stroke={scoreColor} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          transform="rotate(-90 90 90)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-4xl font-bold"
          style={{ color: scoreColor }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {score}
        </motion.span>
        <span className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>/ 100</span>
      </div>
    </div>
  );
}

const CATEGORY_CARDS = [
  { key: "performance", labelKey: "performance" as const, icon: BarChart3, color: "text-red-400", gradient: "from-red-500 to-orange-400" },
  { key: "seo", labelKey: "seo" as const, icon: Search, color: "text-yellow-400", gradient: "from-yellow-500 to-amber-400" },
  { key: "security", labelKey: "security" as const, icon: Shield, color: "text-green-400", gradient: "from-green-500 to-emerald-400" },
  { key: "ux", labelKey: "ux" as const, icon: Monitor, color: "text-orange-400", gradient: "from-orange-500 to-amber-400" },
  { key: "content", labelKey: "content" as const, icon: FileText, color: "text-blue-400", gradient: "from-blue-500 to-cyan-400" },
  { key: "aiVisibility", labelKey: "aiVisibility" as const, icon: Bot, color: "text-purple-400", gradient: "from-purple-500 to-violet-400" },
  { key: "accessibility", labelKey: "accessibility" as const, icon: Accessibility, color: "text-violet-400", gradient: "from-violet-500 to-purple-400" },
] as const;

// EFFORT_LABELS and CATEGORY_LABELS moved inside components that use useTranslations

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "quick-win": { bg: "bg-green-400/10", border: "border-green-400/20", text: "text-green-400" },
  strategic: { bg: "bg-blue-400/10", border: "border-blue-400/20", text: "text-blue-400" },
  "low-priority": { bg: "bg-gray-400/10", border: "border-gray-400/20", text: "text-gray-400" },
  complex: { bg: "bg-orange-400/10", border: "border-orange-400/20", text: "text-orange-400" },
};

const IMPACT_COLORS: Record<string, string> = {
  high: "text-red-400",
  medium: "text-yellow-400",
  low: "text-gray-400",
};

function StageResults({
  scores,
  findings,
  variants,
  token,
  url,
  enrichment,
  seoSuggestions,
  templateClusters,
  pagespeedMetrics,
}: {
  scores: ApiResponse["scores"];
  findings: Finding[];
  variants: Variant[];
  token: string;
  url: string;
  enrichment?: EnrichmentData;
  seoSuggestions?: SEOSuggestionsData;
  templateClusters?: TemplateClusterInfo[];
  pagespeedMetrics?: ApiResponse["pagespeedMetrics"];
}) {
  const t = useTranslations("analysis");
  const locale = useLocale();
  const translatedFindings = translateFindings(findings, locale);
  const overallScore = scores?.overall ?? 0;
  const criticalCount = translatedFindings.filter((f) => f.severity === "critical").length;
  const domain = getDomainFromUrl(url);
  const [activeTab, setActiveTab] = useState<"findings" | "recommendations">("findings");
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);

  const EFFORT_LABELS: Record<number, string> = {
    1: t("effortEasy"),
    2: t("effortSimple"),
    3: t("effortMedium"),
    4: t("effortHard"),
    5: t("effortComplex"),
  };

  const CATEGORY_LABELS: Record<string, string> = {
    "quick-win": t("categoryQuickWin"),
    strategic: t("categoryStrategic"),
    "low-priority": t("categoryLowPriority"),
    complex: t("categoryComplex"),
  };

  // Build enriched finding map for quick lookup
  const enrichedMap = new Map<string, EnrichedFindingData>();
  if (enrichment) {
    for (const ef of enrichment.enrichedFindings) {
      enrichedMap.set(ef.finding.title, ef);
    }
  }

  // Group enriched findings by priority category
  const quickWins = enrichment?.enrichedFindings.filter((ef) => ef.category === "quick-win" && ef.businessValueScore > 0) || [];
  const strategicFindings = enrichment?.enrichedFindings.filter((ef) => ef.category === "strategic" && ef.businessValueScore > 0) || [];
  const otherFindings = enrichment?.enrichedFindings.filter(
    (ef) => (ef.category === "low-priority" || ef.category === "complex") && ef.businessValueScore > 0
  ) || [];

  // Fallback to old display if no enrichment
  const displayFindings = enrichment
    ? [] // handled by enriched sections
    : translatedFindings.slice(0, 12);

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-5xl mx-auto space-y-10"
    >
      {/* Header + Overall Score + Letter Grade */}
      <div className="text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }}>
          <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{t("analysisCompleteFor", { domain })}</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>{t("resultsSubtitle")}</p>
          <div className="flex items-center justify-center gap-6">
            <ScoreGauge score={overallScore} />
            {enrichment && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                className="text-left"
              >
                <div className={`text-6xl font-black ${getScoreColor(overallScore)}`}>
                  {enrichment.letterGrade}
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  {enrichment.businessType === "e-commerce" ? t("businessEshop") :
                   enrichment.businessType === "saas" ? t("businessSaas") :
                   enrichment.businessType === "portfolio" ? t("businessPortfolio") :
                   enrichment.businessType === "blog" ? t("businessBlog") :
                   enrichment.businessType === "catalog" ? t("businessCatalog") : t("businessCorporate")}
                </p>
              </motion.div>
            )}
          </div>
          {criticalCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="flex items-center justify-center gap-2 bg-red-400/10 border border-red-400/20 rounded-full px-3 py-1 mt-4 w-fit mx-auto"
            >
              <XCircle className="h-3.5 w-3.5 text-red-400" />
              <span className="text-xs text-red-400 font-medium">{t("criticalIssues", { count: criticalCount })}</span>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Executive Summary */}
      {enrichment && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-xl p-6"
        >
          <h3 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            {t("summaryTitle")}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{enrichment.executiveSummary.quickWinCount}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t("quickWinsLabel")}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">+{enrichment.impactEstimates.trafficImprovement}%</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t("trafficPotential")}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">+{enrichment.impactEstimates.conversionImprovement}%</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t("conversionPotential")}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">+{enrichment.impactEstimates.healthScoreImprovement}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t("pointsToImprove")}</div>
            </div>
          </div>
          {enrichment.executiveSummary.topRecommendations.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                {t("topPriorities")}
              </p>
              <div className="flex flex-col gap-1">
                {enrichment.executiveSummary.topRecommendations.map((rec, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <span className="text-xs font-bold text-blue-400 w-5">{i + 1}.</span>
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* 6 Category Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {CATEGORY_CARDS.map((cat, i) => {
          const scoreVal = (scores?.[cat.key as keyof NonNullable<ApiResponse["scores"]>] as number) ?? 0;
          const CatIcon = cat.icon;
          return (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              className="glass rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <CatIcon className={`h-4 w-4 ${cat.color}`} />
                <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t(cat.labelKey)}</span>
              </div>
              <div className={`text-2xl font-bold ${getScoreColor(scoreVal)}`}>{scoreVal}</div>
              <div className="w-full h-1.5 rounded-full mt-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${cat.gradient}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${scoreVal}%` }}
                  transition={{ duration: 1, delay: 0.4 + i * 0.08 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Core Web Vitals */}
      <CoreWebVitals metrics={pagespeedMetrics} />

      {/* Tab selector: Findings vs Recommendations */}
      {enrichment && (
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("findings")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "findings"
                ? "bg-blue-500 text-white"
                : "glass"
            }`}
            style={activeTab !== "findings" ? { color: "var(--text-secondary)" } : {}}
          >
            {t("findingsTab", { count: quickWins.length + strategicFindings.length + otherFindings.length })}
          </button>
          <button
            onClick={() => setActiveTab("recommendations")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "recommendations"
                ? "bg-blue-500 text-white"
                : "glass"
            }`}
            style={activeTab !== "recommendations" ? { color: "var(--text-secondary)" } : {}}
          >
            {t("recommendationsTab", { count: enrichment.recommendations.length })}
          </button>
        </div>
      )}

      {/* Enriched Findings (grouped by priority) */}
      {enrichment && activeTab === "findings" && (
        <div className="space-y-8">
          {/* Quick Wins */}
          {quickWins.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-green-400" />
                <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  {t("quickWinsTitle")}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-400/10 border border-green-400/20 text-green-400">
                  {t("findingCount", { count: quickWins.length })}
                </span>
              </div>
              <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                {t("quickWinsDesc")}
              </p>
              <div className="flex flex-col gap-2">
                {quickWins.map((ef, i) => (
                  <EnrichedFindingCard
                    key={ef.findingId}
                    ef={ef}
                    index={i}
                    expanded={expandedFinding === ef.findingId}
                    onToggle={() => setExpandedFinding(expandedFinding === ef.findingId ? null : ef.findingId)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Strategic */}
          {strategicFindings.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ArrowRight className="h-4 w-4 text-blue-400" />
                <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  {t("strategicTitle")}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-400/10 border border-blue-400/20 text-blue-400">
                  {t("findingCount", { count: strategicFindings.length })}
                </span>
              </div>
              <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                {t("strategicDesc")}
              </p>
              <div className="flex flex-col gap-2">
                {strategicFindings.map((ef, i) => (
                  <EnrichedFindingCard
                    key={ef.findingId}
                    ef={ef}
                    index={i}
                    expanded={expandedFinding === ef.findingId}
                    onToggle={() => setExpandedFinding(expandedFinding === ef.findingId ? null : ef.findingId)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other findings */}
          {otherFindings.length > 0 && (
            <div>
              <h3 className="text-lg font-bold mb-3" style={{ color: "var(--text-primary)" }}>
                {t("otherFindings")}
              </h3>
              <div className="flex flex-col gap-2">
                {otherFindings.slice(0, 8).map((ef, i) => (
                  <EnrichedFindingCard
                    key={ef.findingId}
                    ef={ef}
                    index={i}
                    expanded={expandedFinding === ef.findingId}
                    onToggle={() => setExpandedFinding(expandedFinding === ef.findingId ? null : ef.findingId)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommendations tab */}
      {enrichment && activeTab === "recommendations" && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {t("actionPlan")}
          </h3>
          {enrichment.recommendations.map((rec, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-400">{i + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {rec.title}
                    </span>
                    <span className={`text-xs font-medium ${IMPACT_COLORS[rec.impact]}`}>
                      {rec.impact === "high" ? t("highImpact") : rec.impact === "medium" ? t("mediumImpact") : t("lowImpact")}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {rec.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Fallback findings (when no enrichment) */}
      {!enrichment && displayFindings.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>{t("findings")}</h3>
          <div className="flex flex-col gap-2">
            {displayFindings.map((finding, i) => {
              const config = severityConfig[finding.severity];
              const Icon = config.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                  className={`flex items-start gap-3 rounded-lg border ${config.border} ${config.bg} p-3`}
                >
                  <Icon className={`h-4 w-4 ${config.color} shrink-0 mt-0.5`} />
                  <div>
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{finding.title}</span>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{finding.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Template Clusters Section — Šablony */}
      {templateClusters && templateClusters.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-400" />
            <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              {t("templates", { count: templateClusters.length })}
            </h3>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {t("templatesDesc")}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {templateClusters.map((cluster, i) => (
              <motion.div
                key={cluster.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="glass rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {cluster.name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-400/10 border border-indigo-400/20 text-indigo-400">
                    {t("templatePages", { count: cluster.pageCount })}
                  </span>
                </div>
                {cluster.commonIssues.length > 0 && (
                  <div className="mb-2">
                    {cluster.commonIssues.slice(0, 3).map((issue, j) => {
                      const cfg = severityConfig[issue.severity] || severityConfig.info;
                      return (
                        <div key={j} className="flex items-center gap-1.5 text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.color.replace("text-", "bg-")}`} />
                          <span>{issue.title}</span>
                          <span className="text-[10px] px-1 py-0.5 rounded bg-indigo-400/10 text-indigo-400 ml-auto whitespace-nowrap">
                            {t("templateAffects", { count: cluster.pageCount })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-center gap-1 text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>
                  <ExternalLink className="h-3 w-3" />
                  <span className="truncate">{cluster.representativeUrl}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* SEO Content Suggestions */}
      {seoSuggestions && seoSuggestions.suggestions.length > 0 && (
        <SEOSuggestions data={seoSuggestions} />
      )}

      {/* Redesign Variants Section — powered by VariantComparison */}
      {variants.length > 0 && (
        <VariantComparison variants={variants} token={token} />
      )}
    </motion.div>
  );
}

/** Single enriched finding card with expandable details */
function EnrichedFindingCard({
  ef,
  index,
  expanded,
  onToggle,
}: {
  ef: EnrichedFindingData;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("analysis");
  const config = severityConfig[ef.finding.severity] || severityConfig.info;
  const Icon = config.icon;
  const catColors = CATEGORY_COLORS[ef.category] || CATEGORY_COLORS["low-priority"];

  const EFFORT_LABELS: Record<number, string> = {
    1: t("effortEasy"),
    2: t("effortSimple"),
    3: t("effortMedium"),
    4: t("effortHard"),
    5: t("effortComplex"),
  };

  const CATEGORY_LABELS: Record<string, string> = {
    "quick-win": t("categoryQuickWin"),
    strategic: t("categoryStrategic"),
    "low-priority": t("categoryLowPriority"),
    complex: t("categoryComplex"),
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
      className={`rounded-lg border ${config.border} ${config.bg} overflow-hidden`}
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-3 flex items-start gap-3"
      >
        <Icon className={`h-4 w-4 ${config.color} shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {ef.finding.title}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${catColors.border} ${catColors.bg} ${catColors.text}`}>
              {CATEGORY_LABELS[ef.category]}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10" style={{ color: "var(--text-muted)" }}>
              {EFFORT_LABELS[ef.effortScore] || t("effortMedium")}
            </span>
          </div>
          {ef.explanation && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {ef.explanation}
            </p>
          )}
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          className="shrink-0 mt-1"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-90" style={{ color: "var(--text-muted)" }} />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0 ml-7 space-y-2 border-t border-white/5 pt-2">
              {ef.howToFix && (
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">{t("howToFix")}</span>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{ef.howToFix}</p>
                </div>
              )}
              {ef.expectedImprovement && (
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-green-400">{t("expectedImprovement")}</span>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{ef.expectedImprovement}</p>
                </div>
              )}
              {ef.businessImpact && (
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">{t("businessImpact")}</span>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{ef.businessImpact}</p>
                </div>
              )}
              <div className="flex items-center gap-3 text-[10px] pt-1" style={{ color: "var(--text-muted)" }}>
                <span>{t("priority", { score: ef.priorityScore })}</span>
                <span>{t("value", { score: ef.businessValueScore })}</span>
                <span>{t("roi", { value: ef.roi })}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StageEmailGate({
  onSubmit,
  scores,
}: {
  onSubmit: (email: string) => void;
  scores: ApiResponse["scores"];
}) {
  const [email, setEmail] = useState("");
  const t = useTranslations("analysis");
  const CATEGORY_CONFIG = [
    { key: "performance", labelKey: "performance" as const, color: "text-red-400" },
    { key: "seo", labelKey: "seo" as const, color: "text-yellow-400" },
    { key: "security", labelKey: "security" as const, color: "text-green-400" },
    { key: "ux", labelKey: "ux" as const, color: "text-orange-400" },
    { key: "content", labelKey: "content" as const, color: "text-blue-400" },
    { key: "aiVisibility", labelKey: "aiVisibility" as const, color: "text-purple-400" },
    { key: "accessibility", labelKey: "accessibility" as const, color: "text-violet-400" },
  ] as const;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) onSubmit(email);
  };

  const categories = CATEGORY_CONFIG.map((cat) => {
    const scoreValue = scores?.[cat.key as keyof NonNullable<ApiResponse["scores"]>] ?? 50;
    return { ...cat, score: scoreValue };
  });

  return (
    <motion.div
      key="emailgate"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-3xl mx-auto relative"
    >
      <div className="blur-[6px] opacity-40 pointer-events-none select-none">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {categories.map((cat) => (
            <div key={cat.key} className="glass rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{t(cat.labelKey)}</span>
              </div>
              <div className={`text-2xl font-bold ${getScoreColor(cat.score as number)}`}>{cat.score}</div>
              <div className="w-full h-2 rounded-full mt-2" style={{ background: "var(--bar-bg)" }}>
                <div className={`h-full rounded-full ${getScoreBg(cat.score as number)}`} style={{ width: `${cat.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="glass rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-blue-500/10 border border-white/10">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
              <Lock className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>{t("unlockFullReport")}</h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {t("unlockDescription")}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex items-center gap-3 glass rounded-xl px-4 py-3">
              <Mail className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                className="w-full bg-transparent outline-none text-sm"
                style={{ color: "var(--text-primary)" }}
                required
              />
            </div>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-400 transition-all"
            >
              <Sparkles className="h-4 w-4" />
              {t("unlockButton")}
            </button>
          </form>
          <p className="text-xs text-center mt-4" style={{ color: "var(--text-faint)" }}>
            {t("noSpam")}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export default function AnalysisOrchestrator({ url, token, email, onStatusChange }: Props) {
  const t = useTranslations("analysis");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stage, setStage] = useState<Stage>(0);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasStarted = useRef(false);
  const crawlStartTimeRef = useRef<number | null>(null);

  // Sync ?step URL param and notify parent when status changes
  useEffect(() => {
    const apiStatus = data?.status;
    if (!apiStatus) return;

    const stepNum = statusToStep(apiStatus);
    if (stepNum >= 1) {
      const url = new URL(window.location.href);
      if (url.searchParams.get("step") !== String(stepNum)) {
        url.searchParams.set("step", String(stepNum));
        window.history.replaceState({}, "", url.toString());
      }
    }

    onStatusChange?.(apiStatus, data?.variantsCount ?? data?.variants?.length ?? 0, error);

    // Auto-redirect to results page when analysis completes on the homepage
    if (apiStatus === "complete" && onStatusChange) {
      const resultToken = data?.token || token;
      router.push(`/${locale}/analyze/${resultToken}`);
    }
  }, [data?.status, data?.variantsCount, data?.variants?.length, error, onStatusChange, data?.token, token, locale, router]);

  // Start analysis on mount — check for existing record first
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    async function initAnalysis() {
      try {
        // 1. Check if analysis already exists for this token
        const checkRes = await fetch(`/api/analyze/${token}`);
        if (checkRes.ok) {
          const existing: ApiResponse = await checkRes.json();
          // Analysis exists — resume from current status
          setData(existing);

          if (existing.status === "error") {
            setError(existing.error || "Analysis failed");
            return;
          }

          if (existing.status === "complete") {
            if (existing.emailRequired) {
              setStage(5);
            } else {
              setStage(6);
            }
            return;
          }

          // Still in progress — set appropriate stage and start polling
          if (existing.status === "crawling" || existing.status === "pending") {
            setStage(1);
            crawlStartTimeRef.current = Date.now();
          } else if (existing.status === "analyzing") {
            setStage(2);
          } else if (existing.status === "generating") {
            setStage(3);
          }

          startPolling(token);
          return;
        }

        // 2. No existing record (404) — create new analysis via POST
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, locale, ...(email ? { email } : {}) }),
        });
        const result = await res.json();
        if (!res.ok) {
          setError(result.error || "Failed to start analysis");
          return;
        }
        crawlStartTimeRef.current = Date.now();
        startPolling(result.token || token);
      } catch {
        setError("Failed to connect. Please try again.");
      }
    }

    // Show connecting for 1.5s, then start
    setTimeout(initAnalysis, 1500);
  }, [url, token]);

  const startPolling = useCallback((pollToken: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    const CRAWL_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

    const poll = async () => {
      try {
        const res = await fetch(`/api/analyze/${pollToken}`);
        if (!res.ok) return;
        const result: ApiResponse = await res.json();
        setData(result);

        switch (result.status) {
          case "pending":
          case "crawling":
            setStage(1);
            // Check crawl timeout
            if (crawlStartTimeRef.current && Date.now() - crawlStartTimeRef.current > CRAWL_TIMEOUT_MS) {
              setError(t("analysisTakingTooLong"));
              if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
              }
            }
            break;
          case "analyzing":
            setStage(2);
            crawlStartTimeRef.current = null; // Reset — crawl is done
            break;
          case "generating":
            setStage(3);
            break;
          case "complete":
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            // If email not yet submitted, show email gate first
            if (result.emailRequired) {
              setStage(4);
              // Auto-advance to email gate after 3s
              setTimeout(() => setStage(5), 3000);
            } else {
              // Email already submitted or not required — show full results
              setStage(6);
            }
            break;
          case "error":
            setError(result.error || "Analysis failed");
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            break;
        }
      } catch {
        // Silently retry on network error
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 2000);
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleEmailSubmit = async (email: string) => {
    const pollToken = data?.token || token;
    try {
      await fetch(`/api/analyze/${pollToken}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const res = await fetch(`/api/analyze/${pollToken}`);
      const result = await res.json();
      setData(result);
      setStage(6);
    } catch {
      setStage(6);
    }
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-24 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="gradient-blob absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-blue-500/15 blur-[120px]" />
        <div className="gradient-blob-delay absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-purple-500/15 blur-[120px]" />
      </div>
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center">
        {/* Error state */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>{t("somethingWentWrong")}</h2>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>{error}</p>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-400 transition-all"
            >
              {t("tryAgain")}
              <ArrowRight className="h-4 w-4" />
            </a>
          </motion.div>
        )}

        {/* Normal flow */}
        {!error && (
          <>
            {stage <= 3 && <ProgressBar stage={stage} />}
            <AnimatePresence mode="wait">
              {stage === 0 && <StageConnecting url={url} />}
              {stage === 1 && <StageCrawling url={url} pages={data?.pages || []} />}
              {stage === 2 && (
                <StageAnalyzing
                  url={url}
                  scores={data?.scores}
                  liveFindings={data?.liveFindings || []}
                  pagespeedMetrics={data?.pagespeedMetrics}
                />
              )}
              {stage === 3 && (
                <StageGenerating variantProgress={data?.variantProgress} variantNames={data?.variants?.map((v: any) => v.name)} />
              )}
              {stage === 4 && (
                <StageResults
                  scores={data?.scores}
                  findings={data?.findings || data?.findingsPreview || []}
                  variants={[]}
                  token={data?.token || token}
                  url={url}
                  enrichment={data?.enrichment}
                  seoSuggestions={data?.seoSuggestions}
                  pagespeedMetrics={data?.pagespeedMetrics}
                  templateClusters={data?.templateClusters}
                />
              )}
              {stage === 5 && (
                <StageEmailGate onSubmit={handleEmailSubmit} scores={data?.scores} />
              )}
              {stage === 6 && (
                <StageResults
                  scores={data?.scores}
                  findings={data?.findings || data?.findingsPreview || []}
                  variants={data?.variants || []}
                  token={data?.token || token}
                  url={url}
                  enrichment={data?.enrichment}
                  seoSuggestions={data?.seoSuggestions}
                  templateClusters={data?.templateClusters}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
