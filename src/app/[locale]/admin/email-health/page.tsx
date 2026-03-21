"use client";

import { useAdminFetch } from "@/lib/admin/use-admin-fetch";
import { Trash2 } from "lucide-react";
import { useState } from "react";

interface EmailHealthData {
  totals: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
  };
  rates: {
    delivery_rate: number;
    open_rate: number;
    click_rate: number;
    bounce_rate: number;
  };
  daily_stats: Array<{
    date: string;
    sent: number;
    opened: number;
    clicked: number;
    bounced: number;
  }>;
  recent_bounces: Array<{
    domain: string;
    company_name: string;
    email: string;
    bounce_reason: string;
    bounced_at: string;
  }>;
  top_performing_subjects: Array<{
    subject: string;
    sent: number;
    open_rate: number;
  }>;
}

export default function EmailHealthPage() {
  const { data, loading, refetch } = useAdminFetch<EmailHealthData>(
    "/api/admin/email-health"
  );

  const [removingBounce, setRemovingBounce] = useState<string | null>(null);

  const handleRemoveBounce = async (email: string) => {
    setRemovingBounce(email);
    try {
      // TODO: Implement remove bounce functionality
      // For now, just refetch
      await refetch();
    } catch (err) {
      console.error("Failed to remove bounce:", err);
    } finally {
      setRemovingBounce(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("cs-CZ");
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("cs-CZ");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-800 rounded animate-pulse w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-800 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const health = data || {
    totals: { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0 },
    rates: { delivery_rate: 0, open_rate: 0, click_rate: 0, bounce_rate: 0 },
    daily_stats: [],
    recent_bounces: [],
    top_performing_subjects: [],
  };

  // Find max value for chart scaling
  const maxDailyValue = Math.max(
    ...health.daily_stats.map((d) =>
      Math.max(d.sent, d.opened, d.clicked, d.bounced)
    ),
    1
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Stav Emailů</h1>
        <p className="text-gray-400 text-sm mt-1">
          Sledování dostupnosti a výkonu kampaní
        </p>
      </div>

      {/* Rate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Delivery Rate */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <div className="text-sm text-gray-400 font-medium mb-2">
            Míra Doručení
          </div>
          <div className="text-4xl font-bold text-green-400">
            {health.rates.delivery_rate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {health.totals.delivered}/{health.totals.sent} doručeno
          </div>
        </div>

        {/* Open Rate */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <div className="text-sm text-gray-400 font-medium mb-2">
            Míra Otevření
          </div>
          <div className="text-4xl font-bold text-blue-400">
            {health.rates.open_rate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {health.totals.opened}/{health.totals.sent} otevřeno
          </div>
        </div>

        {/* Click Rate */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <div className="text-sm text-gray-400 font-medium mb-2">
            Míra Kliknutí
          </div>
          <div className="text-4xl font-bold text-indigo-400">
            {health.rates.click_rate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {health.totals.clicked}/{health.totals.sent} kliknuto
          </div>
        </div>

        {/* Bounce Rate */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <div className="text-sm text-gray-400 font-medium mb-2">
            Míra Vrácení
          </div>
          <div className="text-4xl font-bold text-red-400">
            {health.rates.bounce_rate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {health.totals.bounced}/{health.totals.sent} vráceno
          </div>
        </div>
      </div>

      {/* 14-day Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Poslední 14 Dní
        </h2>
        <div className="space-y-3">
          {health.daily_stats.length > 0 ? (
            <div className="flex gap-1 items-end h-32">
              {health.daily_stats.map((day) => (
                <div
                  key={day.date}
                  className="flex-1 relative group"
                  title={`${day.date}: ${day.sent} odeslány, ${day.opened} otevřeny, ${day.clicked} kliknuta`}
                >
                  <div className="flex gap-0.5 h-full items-end">
                    {/* Sent */}
                    <div
                      className="flex-1 bg-gray-700 rounded-t opacity-50 min-h-1"
                      style={{
                        height: day.sent > 0 ? `${(day.sent / maxDailyValue) * 100}%` : "0",
                      }}
                    />
                    {/* Opened */}
                    <div
                      className="flex-1 bg-blue-500 rounded-t min-h-1"
                      style={{
                        height:
                          day.opened > 0
                            ? `${(day.opened / maxDailyValue) * 100}%`
                            : "0",
                      }}
                    />
                    {/* Clicked */}
                    <div
                      className="flex-1 bg-indigo-500 rounded-t min-h-1"
                      style={{
                        height:
                          day.clicked > 0
                            ? `${(day.clicked / maxDailyValue) * 100}%`
                            : "0",
                      }}
                    />
                    {/* Bounced */}
                    <div
                      className="flex-1 bg-red-500 rounded-t min-h-1"
                      style={{
                        height:
                          day.bounced > 0
                            ? `${(day.bounced / maxDailyValue) * 100}%`
                            : "0",
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 text-center mt-1">
                    {new Date(day.date).toLocaleDateString("cs-CZ", {
                      month: "numeric",
                      day: "numeric",
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Žádná data k zobrazení
            </div>
          )}
        </div>
        <div className="flex gap-4 text-xs mt-4 pt-4 border-t border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-700 rounded" />
            <span className="text-gray-400">Odeslány</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span className="text-gray-400">Otevřeny</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-indigo-500 rounded" />
            <span className="text-gray-400">Kliknuta</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span className="text-gray-400">Vrácena</span>
          </div>
        </div>
      </div>

      {/* Recent Bounces */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">
            Nedávně Vrácené Emaily
          </h2>
        </div>
        {health.recent_bounces.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800/50 border-b border-gray-700 text-gray-400 text-left">
                  <th className="p-4 font-medium">Doména</th>
                  <th className="p-4 font-medium">Společnost</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">Důvod</th>
                  <th className="p-4 font-medium">Datum</th>
                  <th className="p-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {health.recent_bounces.map((bounce, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="p-4 text-gray-300 font-mono text-xs">
                      {bounce.domain}
                    </td>
                    <td className="p-4 text-white">{bounce.company_name}</td>
                    <td className="p-4 text-gray-400 text-xs">{bounce.email}</td>
                    <td className="p-4 text-gray-400 text-xs">
                      {bounce.bounce_reason}
                    </td>
                    <td className="p-4 text-gray-500 text-xs">
                      {formatDate(bounce.bounced_at)}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleRemoveBounce(bounce.email)}
                        disabled={removingBounce === bounce.email}
                        className="p-1.5 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                        title="Odebrat"
                      >
                        <Trash2 size={14} className="text-gray-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            Žádné vrácené emaily
          </div>
        )}
      </div>

      {/* Top Performing Subjects */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">
            Nejlepší Předměty
          </h2>
        </div>
        {health.top_performing_subjects.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800/50 border-b border-gray-700 text-gray-400 text-left">
                  <th className="p-4 font-medium">Předmět</th>
                  <th className="p-4 font-medium text-right">Odeslány</th>
                  <th className="p-4 font-medium text-right">Míra Otevření</th>
                </tr>
              </thead>
              <tbody>
                {health.top_performing_subjects.map((subject, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="p-4 text-white">{subject.subject}</td>
                    <td className="p-4 text-right text-gray-400">
                      {subject.sent}
                    </td>
                    <td className="p-4 text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-xs font-medium ${
                          subject.open_rate >= 30
                            ? "bg-green-900/50 text-green-400"
                            : subject.open_rate >= 15
                              ? "bg-yellow-900/50 text-yellow-400"
                              : "bg-gray-800 text-gray-400"
                        }`}
                      >
                        {subject.open_rate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            Žádná data k zobrazení
          </div>
        )}
      </div>
    </div>
  );
}
