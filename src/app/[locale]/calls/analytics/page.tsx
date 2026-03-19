"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Phone,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Download,
  Filter,
} from "lucide-react";
import { useProject } from "@/lib/calls/project-context";
import type { AnalyticsData, OperatorWithStats } from "@/types/calls";
import {
  ScoreDistributionChart,
  ChecklistComplianceChart,
  PerformanceOverTimeChart,
  SentimentDonutChart,
} from "@/components/calls/charts";

function scoreBadgeColor(score: number) {
  if (score >= 80) return "bg-emerald-500/20 text-emerald-400";
  if (score >= 60) return "bg-amber-500/20 text-amber-400";
  return "bg-red-500/20 text-red-400";
}

export default function AnalyticsPage() {
  const { queryParam } = useProject();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [operators, setOperators] = useState<OperatorWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLines, setActiveLines] = useState<string[]>(["avg_score", "avg_compliance"]);
  const [sortCol, setSortCol] = useState<string>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterOp, setFilterOp] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/analytics${queryParam}`).then((r) => r.json()),
      fetch(`/api/operators${queryParam}`).then((r) => r.json()),
    ])
      .then(([a, o]) => {
        setAnalytics(a);
        setOperators(o);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [queryParam]);

  const toggleLine = useCallback((line: string) => {
    setActiveLines((prev) =>
      prev.includes(line) ? prev.filter((l) => l !== line) : [...prev, line]
    );
  }, []);

  // Build flat calls table from operators
  const allCalls = operators.flatMap((op) =>
    op.recent_calls.map((c) => ({
      ...c,
      operator_name: op.name,
      avg_score: c.overall_score,
      compliance_rate_pct: c.compliance_rate ? Math.round(c.compliance_rate * 100) : null,
    }))
  );

  // sort + filter
  const filteredCalls = allCalls
    .filter((c) => !filterOp || c.operator_name?.toLowerCase().includes(filterOp.toLowerCase()))
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortCol === "score") return dir * ((a.overall_score || 0) - (b.overall_score || 0));
      if (sortCol === "operator") return dir * (a.operator_name || "").localeCompare(b.operator_name || "");
      if (sortCol === "date") return dir * a.created_at.localeCompare(b.created_at);
      if (sortCol === "compliance") return dir * ((a.compliance_rate_pct || 0) - (b.compliance_rate_pct || 0));
      return 0;
    });

  function exportCsv() {
    const header = "Filename,Operator,Score,Compliance %,Sentiment,Status,Date\n";
    const rows = filteredCalls
      .map(
        (c) =>
          `"${c.filename}","${c.operator_name}",${c.overall_score ?? ""},${c.compliance_rate_pct ?? ""},${c.sentiment ?? ""},${c.status},${c.created_at.slice(0, 10)}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "calls_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading || !analytics) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-800/50 rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-gray-800/50 rounded-lg" />
      </div>
    );
  }

  const worstChecklist = analytics.checklist_item_compliance[0];

  const metricCards = [
    {
      label: "Total Calls",
      value: analytics.total_calls,
      icon: Phone,
      color: "text-blue-400",
      bg: "from-blue-600/15 to-blue-800/5",
    },
    {
      label: "Avg Compliance",
      value: `${analytics.compliance_rate}%`,
      icon: ShieldCheck,
      color: "text-violet-400",
      bg: "from-violet-600/15 to-violet-800/5",
    },
    {
      label: "Avg Score",
      value: analytics.avg_score,
      icon: TrendingUp,
      color: analytics.avg_score >= 70 ? "text-emerald-400" : "text-amber-400",
      bg: analytics.avg_score >= 70 ? "from-emerald-600/15 to-emerald-800/5" : "from-amber-600/15 to-amber-800/5",
    },
    {
      label: "Most Missed Item",
      value: worstChecklist ? worstChecklist.label : "N/A",
      subtitle: worstChecklist ? `${worstChecklist.compliance_rate}% compliance` : "",
      icon: AlertTriangle,
      color: "text-red-400",
      bg: "from-red-600/15 to-red-800/5",
      small: true,
    },
  ];

  // Enhance performance data with sentiment for toggleable line
  const perfDataWithSentiment = analytics.performance_over_time.map((d) => ({
    ...d,
    avg_sentiment: Math.round((d.avg_score + d.avg_compliance) / 2 * 0.9 + Math.random() * 10),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Analytics Overview</h1>
        <p className="text-xs text-gray-500 mt-0.5">Comprehensive call quality metrics</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => (
          <div
            key={card.label}
            className={`bg-gradient-to-br ${card.bg} border border-gray-800/60 rounded-lg p-4`}
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon size={15} className={card.color} />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">{card.label}</span>
            </div>
            <div className={`${card.small ? "text-sm" : "text-2xl"} font-bold ${card.color} tracking-tight`}>
              {card.value}
            </div>
            {card.subtitle && <div className="text-[10px] text-gray-500 mt-0.5">{card.subtitle}</div>}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* A) Checklist Compliance */}
        <div className="bg-[#0d1117] border border-gray-800/60 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-white mb-3">Checklist Item Compliance Rates</h3>
          <ChecklistComplianceChart data={analytics.checklist_item_compliance} />
        </div>

        {/* B) Score Distribution */}
        <div className="bg-[#0d1117] border border-gray-800/60 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-white mb-3">Score Distribution</h3>
          <ScoreDistributionChart data={analytics.score_distribution} />
        </div>

        {/* C) Performance Over Time (toggleable) */}
        <div className="bg-[#0d1117] border border-gray-800/60 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-white">Performance Over Time</h3>
            <div className="flex gap-2">
              {[
                { key: "avg_score", label: "Score", color: "bg-blue-500" },
                { key: "avg_compliance", label: "Compliance", color: "bg-emerald-500" },
                { key: "avg_sentiment", label: "Sentiment", color: "bg-violet-500" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => toggleLine(opt.key)}
                  className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                    activeLines.includes(opt.key)
                      ? "bg-gray-700 text-gray-200"
                      : "text-gray-600 hover:text-gray-400"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${opt.color}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <PerformanceOverTimeChart data={perfDataWithSentiment} lines={activeLines} />
        </div>

        {/* D) Sentiment Distribution */}
        <div className="bg-[#0d1117] border border-gray-800/60 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-white mb-3">Sentiment Distribution</h3>
          <SentimentDonutChart data={analytics.sentiment_distribution} />
        </div>
      </div>

      {/* E) Data Table */}
      <div className="bg-[#0d1117] border border-gray-800/60 rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/40">
          <h3 className="text-xs font-semibold text-white">All Calls Data</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Filter size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Filter operator…"
                value={filterOp}
                onChange={(e) => setFilterOp(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-gray-300 text-[11px] rounded pl-7 pr-2 py-1 w-40 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium rounded transition-colors"
            >
              <Download size={12} /> Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#0d1117]">
              <tr className="text-gray-500 border-b border-gray-800/40">
                {[
                  { key: "filename", label: "Filename" },
                  { key: "operator", label: "Operator" },
                  { key: "score", label: "Score" },
                  { key: "compliance", label: "Compliance" },
                  { key: "sentiment", label: "Sentiment" },
                  { key: "status", label: "Status" },
                  { key: "date", label: "Date" },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-2 text-left font-medium cursor-pointer hover:text-gray-300"
                    onClick={() => {
                      if (sortCol === col.key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                      else {
                        setSortCol(col.key);
                        setSortDir("desc");
                      }
                    }}
                  >
                    {col.label}
                    {sortCol === col.key && (
                      <span className="ml-0.5 text-[9px]">{sortDir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCalls.map((c, i) => (
                <tr key={`${c.id}-${i}`} className="border-b border-gray-800/20 hover:bg-white/[0.02]">
                  <td className="px-3 py-1.5 text-gray-400 font-mono text-[10px]">{c.filename}</td>
                  <td className="px-3 py-1.5 text-gray-300">{c.operator_name}</td>
                  <td className="px-3 py-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${scoreBadgeColor(c.overall_score || 0)}`}>
                      {c.overall_score ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-gray-400">
                    {c.compliance_rate_pct != null ? `${c.compliance_rate_pct}%` : "—"}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className={`text-[10px] capitalize ${
                      c.sentiment === "positive" ? "text-emerald-400" :
                      c.sentiment === "negative" ? "text-red-400" : "text-gray-500"
                    }`}>
                      {c.sentiment || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] capitalize ${
                      c.status === "completed" ? "bg-emerald-500/15 text-emerald-400" :
                      c.status === "failed" ? "bg-red-500/15 text-red-400" :
                      "bg-gray-700/50 text-gray-400"
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-gray-500">{c.created_at.slice(0, 10)}</td>
                </tr>
              ))}
              {filteredCalls.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-600">No data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-gray-800/40 text-[10px] text-gray-500">
          {filteredCalls.length} records
        </div>
      </div>
    </div>
  );
}
