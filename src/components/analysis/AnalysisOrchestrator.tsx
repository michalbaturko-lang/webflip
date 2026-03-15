"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
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
  Eye,
} from "lucide-react";

import { useLocale, useTranslations } from "next-intl";
import { statusToStep } from "@/types/stepper";

import ProgressBar from "./ProgressBar";
import StageCrawling from "./StageCrawling";
import StageAnalyzing from "./StageAnalyzing";
import StageGenerating from "./StageGenerating";
import { translateFindings } from "@/lib/finding-i18n";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface Props {
  url: string;
  token: string;
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
] as const;

function StageResults({
  scores,
  findings,
  variants,
  token,
  url,
}: {
  scores: ApiResponse["scores"];
  findings: Finding[];
  variants: Variant[];
  token: string;
  url: string;
}) {
  const t = useTranslations("analysis");
  const locale = useLocale();
  const translatedFindings = translateFindings(findings, locale);
  const overallScore = scores?.overall ?? 0;
  const criticalCount = translatedFindings.filter((f) => f.severity === "critical").length;
  const displayFindings = translatedFindings.slice(0, 12);
  const domain = getDomainFromUrl(url);

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-5xl mx-auto space-y-10"
    >
      {/* Header + Overall Score */}
      <div className="text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }}>
          <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{t("analysisCompleteFor", { domain })}</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>{t("resultsSubtitle")}</p>
          <ScoreGauge score={overallScore} />
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

      {/* Findings List */}
      {displayFindings.length > 0 && (
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

      {/* Redesign Variants Section */}
      {variants.length > 0 && (
        <div>
          <div className="text-center mb-6">
            <Sparkles className="h-8 w-8 text-purple-400 mx-auto mb-2" />
            <h3 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{t("yourRedesignVariants")}</h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("chooseDirection")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {variants.map((variant, i) => (
              <VariantCard key={variant.name} variant={variant} index={i} token={token} />
            ))}
          </div>
        </div>
      )}
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

function VariantCard({ variant, index, token }: { variant: Variant; index: number; token: string }) {
  const t = useTranslations("analysis");
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.2 }}
      className="glass rounded-2xl overflow-hidden flex flex-col hover:border-white/20 transition-all group"
    >
      {/* Iframe Preview */}
      <div className="relative w-full overflow-hidden bg-gray-900/50" style={{ height: "280px" }}>
        <iframe
          src={`/api/analyze/${token}/preview/${index}`}
          title={variant.name}
          className="absolute top-0 left-0 border-0"
          style={{
            width: "1280px",
            height: "960px",
            transform: "scale(0.3)",
            transformOrigin: "top left",
            pointerEvents: "none",
          }}
          loading="lazy"
          sandbox="allow-same-origin"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      {/* Card body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-bold text-base mb-1" style={{ color: "var(--text-primary)" }}>{variant.name}</h3>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{variant.description}</p>
        </div>
        <a
          href={`/preview/${token}/${index}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-400 transition-all"
        >
          <Eye className="h-4 w-4" />
          {t("viewFullSite")}
        </a>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export default function AnalysisOrchestrator({ url, token, onStatusChange }: Props) {
  const t = useTranslations("analysis");
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
  }, [data?.status, data?.variantsCount, data?.variants?.length, error, onStatusChange]);

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
          body: JSON.stringify({ url }),
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
                />
              )}
              {stage === 3 && (
                <StageGenerating variantProgress={data?.variantProgress} />
              )}
              {stage === 4 && (
                <StageResults
                  scores={data?.scores}
                  findings={data?.findings || data?.findingsPreview || []}
                  variants={[]}
                  token={data?.token || token}
                  url={url}
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
                />
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
