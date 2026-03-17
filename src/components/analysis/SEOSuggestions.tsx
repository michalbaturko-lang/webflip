"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronDown,
  Copy,
  Check,
  ArrowRight,
  Target,
  Lightbulb,
  TrendingUp,
} from "lucide-react";
import { useTranslations } from "next-intl";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SEOSuggestion {
  page_url: string;
  element: "title" | "meta_description" | "h1" | "content_gap";
  current_value: string;
  suggested_value: string;
  reasoning: string;
  impact: "high" | "medium" | "low";
  effort: "easy" | "medium" | "hard";
}

interface ContentStrategy {
  primary_keywords: string[];
  secondary_keywords: string[];
  content_gaps: string[];
  competitor_angles: string[];
}

interface SEOSuggestionsData {
  suggestions: SEOSuggestion[];
  content_strategy: ContentStrategy;
  summary: string;
}

interface Props {
  data: SEOSuggestionsData;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const IMPACT_CONFIG = {
  high: { color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
  medium: { color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
  low: { color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20" },
} as const;

const ELEMENT_LABELS: Record<string, string> = {
  title: "Title tag",
  meta_description: "Meta description",
  h1: "H1",
  content_gap: "Content gap",
};

function groupByImpact(suggestions: SEOSuggestion[]) {
  const groups: Record<string, SEOSuggestion[]> = { high: [], medium: [], low: [] };
  for (const s of suggestions) {
    (groups[s.impact] || groups.medium).push(s);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SEOSuggestions({ data }: Props) {
  const t = useTranslations("seoSuggestions");
  const grouped = groupByImpact(data.suggestions);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    high: true,
    medium: false,
    low: false,
  });
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(key);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // clipboard not available
    }
  };

  const impactKeys = ["high", "medium", "low"] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="glass rounded-xl p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Search className="h-5 w-5 text-yellow-400" />
        <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
          {t("title")}
        </h3>
      </div>

      {/* Summary */}
      {data.summary && (
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          {data.summary}
        </p>
      )}

      {/* Suggestion groups by impact */}
      <div className="space-y-4 mb-6">
        {impactKeys.map((impact) => {
          const items = grouped[impact];
          if (!items || items.length === 0) return null;
          const config = IMPACT_CONFIG[impact];
          const isOpen = openGroups[impact];

          return (
            <motion.div
              key={impact}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`rounded-lg border ${config.border} overflow-hidden`}
            >
              <button
                onClick={() => toggleGroup(impact)}
                className={`w-full flex items-center justify-between p-3 ${config.bg}`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className={`h-4 w-4 ${config.color}`} />
                  <span className={`text-sm font-semibold ${config.color}`}>
                    {t(`impact_${impact}`)}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/5" style={{ color: "var(--text-muted)" }}>
                    {items.length}
                  </span>
                </div>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                  <ChevronDown className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                </motion.div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 space-y-3">
                      {items.map((suggestion, i) => {
                        const copyKey = `${impact}-${i}`;
                        return (
                          <motion.div
                            key={copyKey}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="rounded-lg border border-white/5 p-3"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-white/5" style={{ color: "var(--text-muted)" }}>
                                  {ELEMENT_LABELS[suggestion.element] || suggestion.element}
                                </span>
                                <span className="text-xs truncate max-w-[200px]" style={{ color: "var(--text-muted)" }}>
                                  {suggestion.page_url}
                                </span>
                              </div>
                              <button
                                onClick={() => handleCopy(suggestion.suggested_value, copyKey)}
                                className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-white/5 transition-colors"
                                style={{ color: "var(--text-muted)" }}
                                title={t("copy")}
                              >
                                {copiedIdx === copyKey ? (
                                  <>
                                    <Check className="h-3 w-3 text-green-400" />
                                    <span className="text-green-400">{t("copied")}</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    <span>{t("copy")}</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Current vs Suggested */}
                            {suggestion.current_value && (
                              <div className="flex items-start gap-2 mb-1">
                                <span className="text-xs shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }}>
                                  <ArrowRight className="h-3 w-3" />
                                </span>
                                <span className="text-sm line-through opacity-50" style={{ color: "var(--text-secondary)" }}>
                                  {suggestion.current_value}
                                </span>
                              </div>
                            )}
                            <div className="flex items-start gap-2 mb-2">
                              <span className="text-xs shrink-0 mt-0.5 text-green-400">
                                <ArrowRight className="h-3 w-3" />
                              </span>
                              <span className="text-sm font-medium text-green-400">
                                {suggestion.suggested_value}
                              </span>
                            </div>

                            {/* Reasoning */}
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                              {suggestion.reasoning}
                            </p>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Keywords Section */}
      {(data.content_strategy.primary_keywords.length > 0 ||
        data.content_strategy.secondary_keywords.length > 0) && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-blue-400" />
            <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {t("keywords")}
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.content_strategy.primary_keywords.map((kw, i) => (
              <span
                key={`pk-${i}`}
                className="text-xs px-2 py-1 rounded-full bg-blue-400/10 border border-blue-400/20 text-blue-400 font-medium"
              >
                {kw}
              </span>
            ))}
            {data.content_strategy.secondary_keywords.map((kw, i) => (
              <span
                key={`sk-${i}`}
                className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10"
                style={{ color: "var(--text-muted)" }}
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Content Gaps */}
      {data.content_strategy.content_gaps.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-purple-400" />
            <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {t("contentGaps")}
            </h4>
          </div>
          <div className="space-y-2">
            {data.content_strategy.content_gaps.map((gap, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="flex items-start gap-2 text-sm"
              >
                <span className="text-purple-400 shrink-0 mt-0.5">
                  <ArrowRight className="h-3 w-3" />
                </span>
                <span style={{ color: "var(--text-secondary)" }}>{gap}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
