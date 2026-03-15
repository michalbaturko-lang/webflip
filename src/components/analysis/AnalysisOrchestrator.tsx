"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Scan,
  BarChart3,
  Shield,
  Monitor,
  FileText,
  Bot,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Mail,
  Lock,
  Sparkles,
  ArrowRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Stage = 0 | 1 | 2 | 3 | 4 | 5;

interface Props {
  url: string;
  token: string;
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
  findings?: Finding[];
  findingsPreview?: Finding[];
  findingsTotal?: number;
  variants?: Variant[];
  variantsCount?: number;
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
// Category config
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG = [
  { key: "performance", label: "Performance", icon: BarChart3, color: "text-red-400", bg: "bg-red-400" },
  { key: "seo", label: "SEO", icon: Scan, color: "text-yellow-400", bg: "bg-yellow-400" },
  { key: "security", label: "Security", icon: Shield, color: "text-green-400", bg: "bg-green-400" },
  { key: "ux", label: "UX & Design", icon: Monitor, color: "text-orange-400", bg: "bg-orange-400" },
  { key: "content", label: "Content", icon: FileText, color: "text-blue-400", bg: "bg-blue-400" },
  { key: "aiVisibility", label: "AI Visibility", icon: Bot, color: "text-purple-400", bg: "bg-purple-400" },
] as const;

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
// Helpers
// ---------------------------------------------------------------------------

const severityConfig = {
  critical: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
  warning: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
  ok: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20" },
  info: { icon: CheckCircle, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StageConnecting({ url }: { url: string }) {
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
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Connecting</h2>
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

function StageCrawling({ pages }: { pages: { url: string; title: string }[] }) {
  return (
    <motion.div
      key="crawling"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto"
    >
      <div className="text-center">
        <Scan className="h-10 w-10 text-cyan-400 mx-auto mb-3" />
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Crawling Website</h2>
        <p className="text-cyan-400 font-mono text-sm">
          Found {pages.length} pages
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full">
        <AnimatePresence>
          {pages.map((page) => (
            <motion.div
              key={page.url}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="glass rounded-lg px-3 py-2 flex items-center gap-2"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
              <span className="text-xs font-mono truncate" style={{ color: "var(--text-secondary)" }}>
                {page.title || new URL(page.url).pathname}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function AnimatedScoreBar({ score, delay }: { score: number; delay: number }) {
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bar-bg)" }}>
      <motion.div
        className={`h-full rounded-full ${getScoreBg(score)}`}
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 1.2, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      />
    </div>
  );
}

function StageAnalyzing({ scores }: { scores: ApiResponse["scores"] }) {
  const categories = CATEGORY_CONFIG.map((cat) => {
    const scoreValue = scores?.[cat.key as keyof NonNullable<ApiResponse["scores"]>] ?? null;
    return { ...cat, score: scoreValue };
  });

  return (
    <motion.div
      key="analyzing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className="text-center mb-8">
        <BarChart3 className="h-10 w-10 text-blue-400 mx-auto mb-3" />
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Analyzing</h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Running 50+ checks across 6 categories</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {categories.map((cat, i) => {
          const Icon = cat.icon;
          const score = cat.score;
          return (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="glass rounded-xl p-5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${score !== null ? getScoreColor(score) : cat.color}`} />
                  <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{cat.label}</span>
                </div>
                {score !== null ? (
                  <motion.span
                    className={`text-lg font-bold ${getScoreColor(score)}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.15 + 0.3 }}
                  >
                    {score}
                  </motion.span>
                ) : (
                  <motion.div
                    className="h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </div>
              {score !== null ? (
                <AnimatedScoreBar score={score} delay={i * 0.15} />
              ) : (
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bar-bg)" }}>
                  <motion.div
                    className="h-full bg-blue-400/30 rounded-full"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    style={{ width: "40%" }}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
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

function StageResults({ scores, findings }: { scores: ApiResponse["scores"]; findings: Finding[] }) {
  const overallScore = scores?.overall ?? 0;
  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const displayFindings = findings.slice(0, 8);

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Analysis Complete</h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Here&apos;s how your website performs</p>
      </div>
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center gap-3 shrink-0 mx-auto md:mx-0"
        >
          <ScoreGauge score={overallScore} />
          {criticalCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="flex items-center gap-2 bg-red-400/10 border border-red-400/20 rounded-full px-3 py-1"
            >
              <XCircle className="h-3.5 w-3.5 text-red-400" />
              <span className="text-xs text-red-400 font-medium">{criticalCount} critical issues</span>
            </motion.div>
          )}
        </motion.div>
        <div className="flex-1 flex flex-col gap-2 w-full">
          {displayFindings.map((finding, i) => {
            const config = severityConfig[finding.severity];
            const Icon = config.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
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
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.key} className="glass rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${getScoreColor(cat.score as number)}`} />
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{cat.label}</span>
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(cat.score as number)}`}>{cat.score}</div>
                <div className="w-full h-2 rounded-full mt-2" style={{ background: "var(--bar-bg)" }}>
                  <div className={`h-full rounded-full ${getScoreBg(cat.score as number)}`} style={{ width: `${cat.score}%` }} />
                </div>
              </div>
            );
          })}
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
            <h3 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Unlock Full Report</h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Enter your email to access detailed findings, recommendations, and your redesign variants.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex items-center gap-3 glass rounded-xl px-4 py-3">
              <Mail className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
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
              Unlock Results
            </button>
          </form>
          <p className="text-xs text-center mt-4" style={{ color: "var(--text-faint)" }}>
            No spam. We&apos;ll send your report and redesign options.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function VariantCard({ variant, index }: { variant: Variant; index: number }) {
  const gradients = [
    "from-blue-500 to-cyan-400",
    "from-purple-500 to-pink-400",
    "from-emerald-500 to-teal-400",
  ];
  const gradient = gradients[index % gradients.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.2 }}
      className="glass rounded-2xl p-5 flex flex-col gap-4 hover:border-white/20 transition-all"
    >
      {/* Color palette preview */}
      <div className="rounded-lg overflow-hidden">
        <div className="h-24 relative" style={{ background: variant.palette.bg }}>
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${variant.palette.primary}22, ${variant.palette.accent}22)` }}
          >
            <div
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: variant.palette.primary }}
            >
              {variant.name}
            </div>
          </div>
          {/* Palette dots */}
          <div className="absolute bottom-2 right-2 flex gap-1">
            {Object.values(variant.palette).slice(0, 3).map((color, i) => (
              <div key={i} className="h-4 w-4 rounded-full border border-white/20" style={{ background: color }} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1">
        <h3 className="font-bold mb-1 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <span className={`h-2 w-2 rounded-full bg-gradient-to-r ${gradient}`} />
          {variant.name}
        </h3>
        <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>{variant.description}</p>
        <div className="space-y-1.5">
          {variant.keyFeatures.slice(0, 4).map((feature, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-blue-400 shrink-0" />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{feature}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="text-xs pt-2 border-t" style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}>
        <span className="font-medium">Typography:</span> {variant.typography.heading} / {variant.typography.body}
      </div>
    </motion.div>
  );
}

function StageVariants({ variants }: { variants: Variant[] }) {
  return (
    <motion.div
      key="variants"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-5xl mx-auto"
    >
      <div className="text-center mb-8">
        <Sparkles className="h-10 w-10 text-purple-400 mx-auto mb-3" />
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Your Redesign Variants</h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Choose the direction that fits your vision</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {variants.map((variant, i) => (
          <VariantCard key={variant.name} variant={variant} index={i} />
        ))}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function ProgressBar({ stage }: { stage: Stage }) {
  const steps = [
    { label: "Connect", icon: Globe },
    { label: "Crawl", icon: Scan },
    { label: "Analyze", icon: BarChart3 },
    { label: "Results", icon: CheckCircle },
  ];

  return (
    <div className="flex items-center justify-center gap-1 mb-12">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isActive = stage >= i;
        const isCurrent = stage === i;
        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                className={`h-8 w-8 rounded-full flex items-center justify-center border transition-colors duration-500 ${
                  isActive
                    ? "border-blue-400/60 bg-blue-400/10"
                    : "border-gray-700 bg-gray-800/50"
                } ${isCurrent ? "ring-2 ring-blue-400/30" : ""}`}
              >
                <Icon className={`h-3.5 w-3.5 transition-colors duration-500 ${isActive ? "text-blue-400" : "text-gray-600"}`} />
              </motion.div>
              <span className={`text-[10px] font-medium transition-colors duration-500 ${isActive ? "text-gray-300" : "text-gray-600"}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-12 sm:w-20 h-px mx-2 mb-5">
                <motion.div
                  className="h-full bg-blue-400/40"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: stage > i ? 1 : 0 }}
                  transition={{ duration: 0.6 }}
                  style={{ transformOrigin: "left" }}
                />
                <div className="h-px bg-gray-700 -mt-px" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export default function AnalysisOrchestrator({ url, token }: Props) {
  const [stage, setStage] = useState<Stage>(0);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasStarted = useRef(false);

  // Start analysis on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    async function startAnalysis() {
      try {
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
        // Start polling with the token from API (or use existing token)
        startPolling(result.token || token);
      } catch (err) {
        setError("Failed to connect. Please try again.");
      }
    }

    // Show connecting for 1.5s, then start
    setTimeout(startAnalysis, 1500);
  }, [url, token]);

  const startPolling = useCallback((pollToken: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    const poll = async () => {
      try {
        const res = await fetch(`/api/analyze/${pollToken}`);
        if (!res.ok) return;
        const result: ApiResponse = await res.json();
        setData(result);

        // Map API status to UI stage
        switch (result.status) {
          case "pending":
          case "crawling":
            setStage(1);
            break;
          case "analyzing":
          case "generating":
            setStage(2);
            break;
          case "complete":
            setStage(3);
            // Stop polling on complete
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            // Auto-advance to email gate after 3s
            setTimeout(() => setStage(4), 3000);
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

    // First poll immediately
    poll();
    // Then every 2 seconds
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
      // Refetch to get full results
      const res = await fetch(`/api/analyze/${pollToken}`);
      const result = await res.json();
      setData(result);
      setStage(5);
    } catch {
      // Still advance even if email save fails
      setStage(5);
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
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Something went wrong</h2>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>{error}</p>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-400 transition-all"
            >
              Try Again
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
              {stage === 1 && <StageCrawling pages={data?.pages || []} />}
              {stage === 2 && <StageAnalyzing scores={data?.scores} />}
              {stage === 3 && (
                <StageResults
                  scores={data?.scores}
                  findings={data?.findings || data?.findingsPreview || []}
                />
              )}
              {stage === 4 && (
                <StageEmailGate onSubmit={handleEmailSubmit} scores={data?.scores} />
              )}
              {stage === 5 && <StageVariants variants={data?.variants || []} />}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
