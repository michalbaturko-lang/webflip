"use client";

import { useEffect, useState } from "react";
import {
  Trophy,
  Medal,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useProject } from "@/lib/calls/project-context";
import type { OperatorWithStats } from "@/types/calls";
import { OperatorRadarChart, ScoreTrendLine } from "@/components/calls/charts";

function scoreBadgeColor(score: number) {
  if (score >= 80) return "bg-emerald-500/20 text-emerald-400";
  if (score >= 60) return "bg-amber-500/20 text-amber-400";
  return "bg-red-500/20 text-red-400";
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy size={16} className="text-amber-400" />;
  if (rank === 2) return <Medal size={16} className="text-gray-300" />;
  if (rank === 3) return <Medal size={16} className="text-amber-600" />;
  return <span className="text-xs text-gray-500 w-4 text-center">{rank}</span>;
}

function TrendArrow({ trend, delta }: { trend: string; delta: number }) {
  if (trend === "up")
    return (
      <span className="flex items-center gap-0.5 text-emerald-400 text-[11px]">
        <TrendingUp size={13} /> +{delta}
      </span>
    );
  if (trend === "down")
    return (
      <span className="flex items-center gap-0.5 text-red-400 text-[11px]">
        <TrendingDown size={13} /> {delta}
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-gray-500 text-[11px]">
      <Minus size={13} /> 0
    </span>
  );
}

export default function OperatorsPage() {
  const { queryParam } = useProject();
  const [operators, setOperators] = useState<OperatorWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("avg_score");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    setLoading(true);
    const sep = queryParam ? "&" : "?";
    const url = `/api/operators${queryParam}${queryParam ? sep : "?"}sort_by=${sortBy}&sort_dir=${sortDir}`;
    fetch(url)
      .then((r) => r.json())
      .then(setOperators)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [queryParam, sortBy, sortDir]);

  function toggleSort(field: string) {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  }

  function SortHeader({ field, label }: { field: string; label: string }) {
    const active = sortBy === field;
    return (
      <button
        onClick={() => toggleSort(field)}
        className={`flex items-center gap-1 text-left font-medium ${active ? "text-blue-400" : "text-gray-500"}`}
      >
        {label}
        {active && <span className="text-[9px]">{sortDir === "asc" ? "▲" : "▼"}</span>}
      </button>
    );
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-gray-800/50 rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Operator Leaderboard</h1>
        <p className="text-xs text-gray-500 mt-0.5">Ranked by performance score</p>
      </div>

      <div className="bg-[#0d1117] border border-gray-800/60 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800/40">
              <th className="px-4 py-2.5 text-left font-medium w-10">#</th>
              <th className="px-4 py-2.5 text-left">
                <SortHeader field="name" label="Operator" />
              </th>
              <th className="px-4 py-2.5 text-left">
                <SortHeader field="total_calls" label="Calls" />
              </th>
              <th className="px-4 py-2.5 text-left">
                <SortHeader field="avg_score" label="Avg Score" />
              </th>
              <th className="px-4 py-2.5 text-left font-medium">Compliance</th>
              <th className="px-4 py-2.5 text-left font-medium">Trend</th>
              <th className="px-4 py-2.5 w-8" />
            </tr>
          </thead>
          <tbody>
            {operators.map((op, idx) => {
              const rank = idx + 1;
              const isExpanded = expandedId === op.id;

              return [
                <tr
                  key={op.id}
                  className="border-b border-gray-800/20 hover:bg-white/[0.02] cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : op.id)}
                >
                  <td className="px-4 py-2.5">
                    <RankIcon rank={rank} />
                  </td>
                  <td className="px-4 py-2.5 text-gray-200 font-medium">{op.name}</td>
                  <td className="px-4 py-2.5 text-gray-400">{op.total_calls}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${scoreBadgeColor(op.avg_score)}`}>
                      {op.avg_score}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400">{op.avg_compliance}%</td>
                  <td className="px-4 py-2.5">
                    <TrendArrow trend={op.trend} delta={op.trend_delta} />
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </td>
                </tr>,

                isExpanded && (
                  <tr key={`${op.id}-detail`}>
                    <td colSpan={7} className="bg-[#0a0e17] border-b border-gray-800/40">
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="bg-[#0d1117] border border-gray-800/40 rounded p-3">
                            <h4 className="text-[11px] font-semibold text-gray-300 mb-2">Performance Radar</h4>
                            <OperatorRadarChart
                              operators={[{ name: op.name, data: op.radar_data }]}
                            />
                          </div>

                          <div className="bg-[#0d1117] border border-gray-800/40 rounded p-3">
                            <h4 className="text-[11px] font-semibold text-gray-300 mb-2">Score Over Time</h4>
                            <ScoreTrendLine data={op.score_over_time} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="bg-[#0d1117] border border-gray-800/40 rounded p-3">
                            <h4 className="text-[11px] font-semibold text-emerald-400 mb-2">Strongest Areas</h4>
                            <ul className="space-y-1">
                              {op.strongest_areas.map((a) => (
                                <li key={a} className="text-[11px] text-gray-300 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  {a}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="bg-[#0d1117] border border-gray-800/40 rounded p-3">
                            <h4 className="text-[11px] font-semibold text-red-400 mb-2">Weakest Areas</h4>
                            <ul className="space-y-1">
                              {op.weakest_areas.map((a) => (
                                <li key={a} className="text-[11px] text-gray-300 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                  {a}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="bg-[#0d1117] border border-gray-800/40 rounded p-3">
                          <h4 className="text-[11px] font-semibold text-gray-300 mb-2">Recent Calls</h4>
                          <div className="space-y-1">
                            {op.recent_calls.map((c) => (
                              <div key={c.id} className="flex items-center justify-between text-[11px] py-1 border-b border-gray-800/20 last:border-0">
                                <span className="text-gray-400 font-mono">{c.filename}</span>
                                <div className="flex items-center gap-3">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${scoreBadgeColor(c.overall_score || 0)}`}>
                                    {c.overall_score ?? "—"}
                                  </span>
                                  <span className="text-gray-600">{c.created_at.slice(0, 10)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
