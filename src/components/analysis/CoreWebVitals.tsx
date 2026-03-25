"use client";

import { motion } from "framer-motion";
import { Activity, Gauge, Timer, Move, Zap, BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";

export interface PageSpeedMetricsProps {
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
}

// Core Web Vitals thresholds from web.dev
const THRESHOLDS = {
  fcp: { good: 1800, poor: 3000, unit: "s", divisor: 1000, label: "FCP", fullLabel: "First Contentful Paint", icon: Zap },
  lcp: { good: 2500, poor: 4000, unit: "s", divisor: 1000, label: "LCP", fullLabel: "Largest Contentful Paint", icon: Gauge },
  cls: { good: 0.1, poor: 0.25, unit: "", divisor: 1, label: "CLS", fullLabel: "Cumulative Layout Shift", icon: Move },
  tbt: { good: 200, poor: 600, unit: "ms", divisor: 1, label: "TBT", fullLabel: "Total Blocking Time", icon: Timer },
} as const;

type MetricKey = keyof typeof THRESHOLDS;

function getMetricStatus(key: MetricKey, value: number): "good" | "needs-improvement" | "poor" {
  const t = THRESHOLDS[key];
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs-improvement";
  return "poor";
}

function getStatusColor(status: "good" | "needs-improvement" | "poor") {
  switch (status) {
    case "good": return { text: "text-green-400", bg: "bg-green-400", dot: "bg-green-500" };
    case "needs-improvement": return { text: "text-orange-400", bg: "bg-orange-400", dot: "bg-orange-500" };
    case "poor": return { text: "text-red-400", bg: "bg-red-400", dot: "bg-red-500" };
  }
}

function formatValue(key: MetricKey, value: number): string {
  const t = THRESHOLDS[key];
  if (key === "cls") return value.toFixed(3);
  if (t.divisor > 1) return (value / t.divisor).toFixed(1);
  return Math.round(value).toString();
}

export default function CoreWebVitals({ metrics }: { metrics: PageSpeedMetricsProps | null | undefined }) {
  const t = useTranslations("analysis");

  if (!metrics) {
    return (
      <div className="glass rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Activity className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            Core Web Vitals
          </span>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {t("cwvUnavailable")}
        </p>
      </div>
    );
  }

  const isEstimation = metrics.source === "estimation";

  const metricEntries: { key: MetricKey; value: number }[] = [
    { key: "fcp", value: metrics.fcp },
    { key: "lcp", value: metrics.lcp },
    { key: "cls", value: metrics.cls },
    { key: "tbt", value: metrics.tbt },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Core Web Vitals
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isEstimation && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-400 font-medium">
              {t("cwvEstimate")}
            </span>
          )}
          {!isEstimation && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-400/10 text-green-400 font-medium">
              LIGHTHOUSE
            </span>
          )}
          <div className="flex items-center gap-1">
            <BarChart3 className="h-3 w-3" style={{ color: "var(--text-muted)" }} />
            <span className="text-xs font-bold tabular-nums" style={{ color: "var(--text-secondary)" }}>
              {metrics.lighthouseScore}
            </span>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metricEntries.map(({ key, value }, i) => {
          const t = THRESHOLDS[key];
          const status = getMetricStatus(key, value);
          const colors = getStatusColor(status);
          const Icon = t.icon;

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              className="rounded-lg p-3 relative overflow-hidden"
              style={{ background: "var(--card-bg, rgba(255,255,255,0.03))" }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Icon className={`h-3.5 w-3.5 ${colors.text}`} />
                <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                  {t.label}
                </span>
              </div>
              <div className={`text-xl font-bold tabular-nums ${colors.text}`}>
                {formatValue(key, value)}
                {t.unit && <span className="text-xs font-normal ml-0.5">{t.unit}</span>}
              </div>
              <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                {t.fullLabel}
              </div>
              {/* Status indicator bar */}
              <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "var(--bar-bg, rgba(255,255,255,0.05))" }}>
                <motion.div
                  className={`h-full rounded-full ${colors.bg}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.max(5, status === "good" ? 100 : status === "needs-improvement" ? 60 : 30))}%` }}
                  transition={{ duration: 0.8, delay: 0.5 + i * 0.08 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Field data section */}
      {metrics.fieldData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-3 pt-3 border-t"
          style={{ borderColor: "var(--border-color, rgba(255,255,255,0.06))" }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {t("cwvFieldDataLabel")}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {metrics.fieldData.lcpP75 != null && (
              <FieldMetric label="LCP" value={`${(metrics.fieldData.lcpP75 / 1000).toFixed(1)}s`} status={getMetricStatus("lcp", metrics.fieldData.lcpP75)} />
            )}
            {metrics.fieldData.fcpP75 != null && (
              <FieldMetric label="FCP" value={`${(metrics.fieldData.fcpP75 / 1000).toFixed(1)}s`} status={getMetricStatus("fcp", metrics.fieldData.fcpP75)} />
            )}
            {metrics.fieldData.clsP75 != null && (
              <FieldMetric label="CLS" value={metrics.fieldData.clsP75.toFixed(3)} status={getMetricStatus("cls", metrics.fieldData.clsP75)} />
            )}
            {metrics.fieldData.inpP75 != null && (
              <FieldMetric label="INP" value={`${metrics.fieldData.inpP75}ms`} status={metrics.fieldData.inpP75 <= 200 ? "good" : metrics.fieldData.inpP75 <= 500 ? "needs-improvement" : "poor"} />
            )}
            {metrics.fieldData.ttfbP75 != null && (
              <FieldMetric label="TTFB" value={`${(metrics.fieldData.ttfbP75 / 1000).toFixed(1)}s`} status={metrics.fieldData.ttfbP75 <= 800 ? "good" : metrics.fieldData.ttfbP75 <= 1800 ? "needs-improvement" : "poor"} />
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function FieldMetric({ label, value, status }: { label: string; value: string; status: "good" | "needs-improvement" | "poor" }) {
  const colors = getStatusColor(status);
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{label}:</span>
      <span className={`text-[11px] font-semibold tabular-nums ${colors.text}`}>{value}</span>
    </div>
  );
}
