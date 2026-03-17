"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Scan,
  Shield,
  Monitor,
  FileText,
  Bot,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import CoreWebVitals, { type PageSpeedMetricsProps } from "./CoreWebVitals";

interface Finding {
  category: string;
  severity: "critical" | "warning" | "ok" | "info";
  title: string;
  description: string;
}

interface Scores {
  performance: number | null;
  seo: number | null;
  security: number | null;
  ux: number | null;
  content: number | null;
  aiVisibility: number | null;
  overall: number | null;
}

interface Props {
  url: string;
  scores: Scores | undefined;
  liveFindings: Finding[];
  pagespeedMetrics?: PageSpeedMetricsProps;
}

const CATEGORY_CONFIG = [
  { key: "performance", label: "Performance", icon: BarChart3, color: "text-red-400", gradient: "from-red-500 to-orange-500" },
  { key: "seo", label: "SEO", icon: Scan, color: "text-yellow-400", gradient: "from-yellow-500 to-amber-500" },
  { key: "security", label: "Security", icon: Shield, color: "text-green-400", gradient: "from-green-500 to-emerald-500" },
  { key: "ux", label: "UX & Design", icon: Monitor, color: "text-orange-400", gradient: "from-orange-500 to-red-500" },
  { key: "content", label: "Content", icon: FileText, color: "text-blue-400", gradient: "from-blue-500 to-cyan-500" },
  { key: "aiVisibility", label: "AI Visibility", icon: Bot, color: "text-purple-400", gradient: "from-purple-500 to-pink-500" },
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

function AnimatedScore({ score, delay }: { score: number; delay: number }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const duration = 1200;
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayed(Math.round(eased * score));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [score, delay]);

  return <span>{displayed}</span>;
}

export default function StageAnalyzing({ url, scores, liveFindings, pagespeedMetrics }: Props) {
  const domain = getDomainFromUrl(url);

  const categories = CATEGORY_CONFIG.map((cat) => {
    const scoreValue = scores?.[cat.key as keyof Scores] ?? null;
    return { ...cat, score: scoreValue as number | null };
  });

  const importantFindings = liveFindings.filter(
    (f) => f.severity === "critical" || f.severity === "warning"
  );
  const displayFindings = importantFindings.length > 0
    ? importantFindings.slice(0, 6)
    : liveFindings.slice(0, 6);

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
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          Analyzujeme {domain}
        </h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Kontrolujeme 50+ parametrů v 6 kategoriích
        </p>
      </div>

      {/* Score cards with glass morphism */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {categories.map((cat, i) => {
          const Icon = cat.icon;
          const score = cat.score;
          const isReady = score !== null;
          return (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="glass rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden"
            >
              {/* Skeleton shimmer when loading */}
              {!isReady && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
              )}

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${isReady ? getScoreColor(score!) : cat.color}`} />
                  <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    {cat.label}
                  </span>
                </div>
                {isReady ? (
                  <span className={`text-lg font-bold tabular-nums ${getScoreColor(score!)}`}>
                    <AnimatedScore score={score!} delay={i * 0.15} />
                  </span>
                ) : (
                  <motion.div
                    className="h-5 w-5 border-2 border-blue-400 border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </div>

              {/* Score bar */}
              <div className="w-full h-2 rounded-full overflow-hidden relative z-10" style={{ background: "var(--bar-bg)" }}>
                {isReady ? (
                  <motion.div
                    className={`h-full rounded-full ${getScoreBg(score!)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1.2, delay: i * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                  />
                ) : (
                  <motion.div
                    className="h-full bg-blue-400/30 rounded-full"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    style={{ width: "40%" }}
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Core Web Vitals */}
      {pagespeedMetrics && (
        <div className="mb-4">
          <CoreWebVitals metrics={pagespeedMetrics} />
        </div>
      )}

      {/* Live findings ticker/feed */}
      {displayFindings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-2"
        >
          <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            Zjištění z {domain}
          </p>
          <AnimatePresence>
            {displayFindings.map((finding, i) => {
              const config = severityConfig[finding.severity];
              const Icon = config.icon;
              return (
                <motion.div
                  key={`${finding.category}-${finding.title}-${i}`}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  transition={{ delay: i * 0.1, duration: 0.3 }}
                  className={`flex items-start gap-3 rounded-lg border ${config.border} ${config.bg} p-3`}
                >
                  <Icon className={`h-4 w-4 ${config.color} shrink-0 mt-0.5`} />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {finding.category.toUpperCase()}: {finding.title}
                    </span>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                      {finding.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {liveFindings.length > displayFindings.length && (
            <p className="text-xs text-center pt-1" style={{ color: "var(--text-muted)" }}>
              +{liveFindings.length - displayFindings.length} dalších zjištění...
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
