"use client";

import { useAdminFetch } from "@/lib/admin/use-admin-fetch";
import type { DashboardKPIs, CrmStage } from "@/types/admin";
import {
  BarChart3,
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  Star,
} from "lucide-react";

const FUNNEL_STAGES: { key: CrmStage; label: string; color: string }[] = [
  { key: "prospect", label: "Prospect", color: "bg-gray-500" },
  { key: "contacted", label: "Contacted", color: "bg-blue-500" },
  { key: "engaged", label: "Engaged", color: "bg-indigo-500" },
  { key: "trial_started", label: "Trial", color: "bg-purple-500" },
  { key: "trial_active", label: "Active Trial", color: "bg-violet-500" },
  { key: "card_added", label: "Card Added", color: "bg-amber-500" },
  { key: "paid", label: "Paid", color: "bg-green-500" },
];

export default function AdminDashboard() {
  const { data, loading } = useAdminFetch<DashboardKPIs>("/api/admin/dashboard");

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <p className="text-gray-400">Failed to load dashboard</p>;

  const kpiCards = [
    { label: "Scanned Today", value: data.todayScanned, icon: BarChart3, color: "text-blue-400" },
    { label: "This Week", value: data.thisWeek, icon: Users, color: "text-indigo-400" },
    { label: "Active Trials", value: data.activeTrials, icon: TrendingUp, color: "text-purple-400" },
    { label: "Revenue (Month)", value: `$${data.revenueThisMonth.toFixed(0)}`, icon: DollarSign, color: "text-green-400" },
  ];

  // Get max count for funnel bar widths
  const maxCount = Math.max(1, ...data.funnel.map((f) => f.count));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{kpi.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{kpi.value}</p>
              </div>
              <kpi.icon className={kpi.color} size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Conversion Funnel</h2>
          <div className="space-y-3">
            {FUNNEL_STAGES.map((stage) => {
              const count = data.funnel.find((f) => f.stage === stage.key)?.count || 0;
              const pct = (count / maxCount) * 100;
              return (
                <div key={stage.key} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-24 text-right">{stage.label}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden">
                    <div
                      className={`${stage.color} h-full rounded-full flex items-center px-2 transition-all`}
                      style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                    >
                      {count > 0 && (
                        <span className="text-xs font-medium text-white">{count}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expiring Trials */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock size={18} className="text-amber-400" />
            Trials Expiring Soon
          </h2>
          {data.expiringTrials.length === 0 ? (
            <p className="text-sm text-gray-500">No trials expiring this week</p>
          ) : (
            <div className="space-y-2">
              {data.expiringTrials.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-white">{r.company_name || r.domain}</p>
                    <p className="text-xs text-gray-500">{r.domain}</p>
                  </div>
                  <span className="text-xs text-amber-400">
                    {r.trial_end_date
                      ? `${Math.ceil((new Date(r.trial_end_date).getTime() - Date.now()) / 86400000)}d left`
                      : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Leads */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Star size={18} className="text-yellow-400" />
          Top Leads by Suitability
        </h2>
        {data.topLeads.length === 0 ? (
          <p className="text-sm text-gray-500">No scored leads yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-left">
                  <th className="pb-2 font-medium">Company</th>
                  <th className="pb-2 font-medium">Domain</th>
                  <th className="pb-2 font-medium">Score</th>
                  <th className="pb-2 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {data.topLeads.map((r) => (
                  <tr key={r.id} className="border-t border-gray-800">
                    <td className="py-2 text-white">{r.company_name || "—"}</td>
                    <td className="py-2 text-gray-400">{r.domain}</td>
                    <td className="py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        (r.suitability_score || 0) >= 70 ? "bg-green-900/50 text-green-400" :
                        (r.suitability_score || 0) >= 40 ? "bg-yellow-900/50 text-yellow-400" :
                        "bg-gray-800 text-gray-400"
                      }`}>
                        {r.suitability_score ?? "—"}
                      </span>
                    </td>
                    <td className="py-2 text-gray-400">{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
