"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, TrendingUp, ShieldCheck, Trophy, ArrowRight } from "lucide-react";
import { useProject } from "@/lib/calls/project-context";
import type { AnalyticsData, Call } from "@/types/calls";
import {
  ScoreDistributionChart,
  ChecklistComplianceChart,
  OperatorRadarChart,
  PerformanceOverTimeChart,
} from "@/components/calls/charts";

function scoreBadgeColor(score: number | null) {
  if (score === null) return "bg-gray-700 text-gray-400";
  if (score >= 80) return "bg-emerald-500/20 text-emerald-400";
  if (score >= 60) return "bg-amber-500/20 text-amber-400";
  return "bg-red-500/20 text-red-400";
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    completed: "bg-emerald-500/15 text-emerald-400",
    processing: "bg-blue-500/15 text-blue-400",
    pending: "bg-gray-700/50 text-gray-400",
    failed: "bg-red-500/15 text-red-400",
  };
  return map[status] || map.pending;
}

export default function DashboardPage() {
  const { queryParam } = useProject();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "en";
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/analytics${queryParam}`).then((r) => r.json()),
      fetch(`/api/operators${queryParam}`).then((r) => r.json()),
    ])
      .then(([analyticsData, operatorsData]) => {
        setAnalytics(analyticsData);
        // Extract recent calls from analytics context; we use the operator data for radar
        // For recent calls we fetch separately - but since we have demo data inline, use analytics
        const allOps = operatorsData.slice(0, 5).map((op: { name: string; radar_data: { subject: string; value: number }[] }) => ({
          name: op.name,
          data: op.radar_data,
        }));
        setRadarOperators(allOps);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    fetch(`/api/analytics${queryParam}`)
      .then((r) => r.json())
      .then((d: AnalyticsData) => {
        // Construct recent calls from top_operators info - we'll fetch separately
      });
    // Fetch recent calls
    fetch(`/api/operators${queryParam}`)
      .then((r) => r.json())
      .then((ops) => {
        const calls: Call[] = [];
        for (const op of ops) {
          for (const c of op.recent_calls || []) {
            calls.push(c);
          }
        }
        calls.sort((a: Call, b: Call) => b.created_at.localeCompare(a.created_at));
        setRecentCalls(calls.slice(0, 10));
      });
  }, [queryParam]);

  const [radarOperators, setRadarOperators] = useState<{ name: string; data: { subject: string; value: number }[] }[]>([]);

  if (loading || !analytics) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-800/50 rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-gray-800/50 rounded-lg" />
      </div>
    );
  }

  const topOp = analytics.top_operators[0];

  const cards = [
    {
      label: "Total Calls",
      value: analytics.total_calls,
      icon: Phone,
      gradient: "from-blue-600/20 to-blue-800/10",
      iconColor: "text-blue-400",
    },
    {
      label: "Average Score",
      value: analytics.avg_score,
      icon: TrendingUp,
      gradient: analytics.avg_score >= 70 ? "from-emerald-600/20 to-emerald-800/10" : "from-amber-600/20 to-amber-800/10",
      iconColor: analytics.avg_score >= 70 ? "text-emerald-400" : "text-amber-400",
      color: analytics.avg_score >= 80 ? "text-emerald-400" : analytics.avg_score >= 60 ? "text-amber-400" : "text-red-400",
    },
    {
      label: "Compliance Rate",
      value: `${analytics.compliance_rate}%`,
      icon: ShieldCheck,
      gradient: "from-violet-600/20 to-violet-800/10",
      iconColor: "text-violet-400",
    },
    {
      label: "Top Operator",
      value: topOp ? topOp.name.split(" ")[0] : "N/A",
      subtitle: topOp ? `Score: ${topOp.avg_score}` : "",
      icon: Trophy,
      gradient: "from-amber-600/20 to-amber-800/10",
      iconColor: "text-amber-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-xs text-gray-500 mt-0.5">Call intelligence overview</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`bg-gradient-to-br ${card.gradient} border border-gray-800/60 rounded-lg p-4`}
          >
            <div className="flex items-center justify-between mb-2">
              <card.icon size={18} className={card.iconColor} />
            </div>
            <div className={`text-2xl font-bold ${card.color || "text-white"} tracking-tight`}>
              {card.value}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">{card.label}</div>
            {card.subtitle && <div className="text-[10px] text-gray-500 mt-0.5">{card.subtitle}</div>}
          </div>
        ))}
      </div>

      {/* Recent Calls */}
      <div className="bg-[#0d1117] border border-gray-800/60 rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/40">
          <h2 className="text-sm font-semibold text-white">Recent Calls</h2>
          <Link
            href={`/${locale}/calls/calls`}
            className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800/40">
                <th className="text-left px-4 py-2 font-medium">Filename</th>
                <th className="text-left px-4 py-2 font-medium">Operator</th>
                <th className="text-left px-4 py-2 font-medium">Score</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentCalls.map((call) => (
                <tr key={call.id} className="border-b border-gray-800/20 hover:bg-white/[0.02]">
                  <td className="px-4 py-2 text-gray-300 font-mono text-[11px]">{call.filename}</td>
                  <td className="px-4 py-2 text-gray-300">{call.operator_name || "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${scoreBadgeColor(call.overall_score)}`}>
                      {call.overall_score ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${statusBadge(call.status)}`}>
                      {call.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{call.created_at.slice(0, 10)}</td>
                </tr>
              ))}
              {recentCalls.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-600">No calls yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* A) Score Distribution */}
        <div className="bg-[#0d1117] border border-gray-800/60 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-white mb-3">Score Distribution</h3>
          <ScoreDistributionChart data={analytics.score_distribution} />
        </div>

        {/* B) Checklist Compliance */}
        <div className="bg-[#0d1117] border border-gray-800/60 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-white mb-3">Checklist Compliance per Topic</h3>
          <ChecklistComplianceChart data={analytics.checklist_item_compliance} />
        </div>

        {/* C) Operator Radar */}
        <div className="bg-[#0d1117] border border-gray-800/60 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-white mb-3">Operator Performance Comparison</h3>
          <OperatorRadarChart operators={radarOperators} />
        </div>

        {/* D) Performance Over Time */}
        <div className="bg-[#0d1117] border border-gray-800/60 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-white mb-3">Performance Over Time</h3>
          <PerformanceOverTimeChart data={analytics.performance_over_time} />
        </div>
      </div>
    </div>
  );
}
