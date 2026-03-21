"use client";

import { useAdminFetch } from "@/lib/admin/use-admin-fetch";
import { BarChart3, TrendingUp, Users, DollarSign, Mail, Linkedin } from "lucide-react";

interface AnalyticsData {
  overview: {
    total_records: number;
    total_contacted: number;
    total_engaged: number;
    total_paid: number;
    conversion_rate: number;
  };
  funnel: {
    stage: string;
    count: number;
    percentage: number;
  }[];
  sequences: {
    sequence_id: string;
    name: string;
    enrolled: number;
    completed: number;
    conversion_rate: number;
    avg_time_to_engage_days: number;
  }[];
  channels: {
    email: {
      sent: number;
      opened: number;
      clicked: number;
      conversions: number;
    };
    linkedin: {
      sent: number;
      accepted: number;
      replied: number;
      conversions: number;
    };
  };
  timeline: {
    date: string;
    new_contacts: number;
    emails_sent: number;
    visits: number;
    payments: number;
  }[];
}

export default function AnalyticsPage() {
  const { data, loading } = useAdminFetch<AnalyticsData>("/api/admin/analytics");

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Analytika</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <p className="text-gray-400">Chyba při načítání analytiky</p>;

  const overviewCards = [
    {
      label: "Celkem kontaktů",
      value: data.overview.total_records,
      icon: Users,
      color: "text-blue-400",
    },
    {
      label: "Kontaktováno",
      value: data.overview.total_contacted,
      icon: Mail,
      color: "text-indigo-400",
    },
    {
      label: "Zapojeno",
      value: data.overview.total_engaged,
      icon: TrendingUp,
      color: "text-purple-400",
    },
    {
      label: "Placení",
      value: data.overview.total_paid,
      icon: DollarSign,
      color: "text-green-400",
    },
    {
      label: "Konverze",
      value: `${Math.round(data.overview.conversion_rate * 100)}%`,
      icon: BarChart3,
      color: "text-amber-400",
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Analytika</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {overviewCards.map((card) => (
          <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{card.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
              </div>
              <card.icon className={card.color} size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Trychtýř konverze</h2>
          <div className="space-y-3">
            {data.funnel
              .sort((a, b) => b.count - a.count)
              .slice(0, 7)
              .map((stage, idx) => {
                const colors = [
                  "bg-gray-500",
                  "bg-blue-500",
                  "bg-indigo-500",
                  "bg-purple-500",
                  "bg-violet-500",
                  "bg-amber-500",
                  "bg-green-500",
                ];
                const maxCount = Math.max(...data.funnel.map((s) => s.count));
                const pct = (stage.count / maxCount) * 100;
                return (
                  <div key={stage.stage} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-32 text-right truncate">
                      {stage.stage === "trial_started"
                        ? "Pokus"
                        : stage.stage === "trial_active"
                          ? "Aktivní pokus"
                          : stage.stage === "card_added"
                            ? "Karta přidána"
                            : stage.stage.charAt(0).toUpperCase() + stage.stage.slice(1)}
                    </span>
                    <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden">
                      <div
                        className={`${colors[idx % colors.length]} h-full rounded-full flex items-center px-2 transition-all`}
                        style={{ width: `${Math.max(pct, stage.count > 0 ? 8 : 0)}%` }}
                      >
                        {stage.count > 0 && (
                          <span className="text-xs font-medium text-white">{stage.count}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 w-10 text-right">
                      {stage.percentage}%
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Channel Comparison */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Porovnání kanálů</h2>
          <div className="space-y-6">
            {/* Email */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Mail size={18} className="text-blue-400" />
                <h3 className="text-sm font-medium text-white">E-mail</h3>
              </div>
              <div className="space-y-2 ml-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Odesláno</span>
                  <span className="text-white font-medium">{data.channels.email.sent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Otevřeno</span>
                  <span className="text-white font-medium">
                    {data.channels.email.sent > 0
                      ? Math.round((data.channels.email.opened / data.channels.email.sent) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Kliknutí</span>
                  <span className="text-white font-medium">
                    {data.channels.email.sent > 0
                      ? Math.round((data.channels.email.clicked / data.channels.email.sent) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* LinkedIn */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Linkedin size={18} className="text-blue-600" />
                <h3 className="text-sm font-medium text-white">LinkedIn</h3>
              </div>
              <div className="space-y-2 ml-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Odesláno</span>
                  <span className="text-white font-medium">{data.channels.linkedin.sent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Přijato</span>
                  <span className="text-white font-medium">
                    {data.channels.linkedin.sent > 0
                      ? Math.round(
                          (data.channels.linkedin.accepted / data.channels.linkedin.sent) * 100
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Odpovězeno</span>
                  <span className="text-white font-medium">
                    {data.channels.linkedin.sent > 0
                      ? Math.round(
                          (data.channels.linkedin.replied / data.channels.linkedin.sent) * 100
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sequence Performance */}
      {data.sequences.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Výkon sekvencí</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-left">
                  <th className="pb-2 font-medium">Jméno</th>
                  <th className="pb-2 font-medium">Zapsáno</th>
                  <th className="pb-2 font-medium">Dokončeno</th>
                  <th className="pb-2 font-medium">Konverze</th>
                  <th className="pb-2 font-medium">Průměr. dní</th>
                </tr>
              </thead>
              <tbody>
                {data.sequences.map((seq) => (
                  <tr key={seq.sequence_id} className="border-t border-gray-800">
                    <td className="py-3 text-white font-medium">{seq.name}</td>
                    <td className="py-3 text-gray-400">{seq.enrolled}</td>
                    <td className="py-3 text-gray-400">{seq.completed}</td>
                    <td className="py-3 text-gray-400">
                      {Math.round(seq.conversion_rate * 100)}%
                    </td>
                    <td className="py-3 text-gray-400">{seq.avg_time_to_engage_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 30-day Timeline */}
      {data.timeline.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Aktivita za posledních 30 dní</h2>
          <div className="space-y-4">
            {/* New Contacts */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-300">Nové kontakty</h3>
              </div>
              <div className="flex gap-1 h-12 items-end">
                {data.timeline.map((day) => {
                  const maxContacts = Math.max(...data.timeline.map((d) => d.new_contacts), 1);
                  const height = (day.new_contacts / maxContacts) * 100;
                  return (
                    <div
                      key={day.date}
                      className="flex-1 bg-blue-500/30 hover:bg-blue-500/50 rounded-t transition-colors group relative"
                      style={{ height: `${Math.max(height, 4)}%` }}
                      title={`${day.date}: ${day.new_contacts}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Emails Sent */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-300">Odeslané e-maily</h3>
              </div>
              <div className="flex gap-1 h-12 items-end">
                {data.timeline.map((day) => {
                  const maxEmails = Math.max(...data.timeline.map((d) => d.emails_sent), 1);
                  const height = (day.emails_sent / maxEmails) * 100;
                  return (
                    <div
                      key={day.date}
                      className="flex-1 bg-indigo-500/30 hover:bg-indigo-500/50 rounded-t transition-colors group relative"
                      style={{ height: `${Math.max(height, 4)}%` }}
                      title={`${day.date}: ${day.emails_sent}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Payments */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-300">Platby</h3>
              </div>
              <div className="flex gap-1 h-12 items-end">
                {data.timeline.map((day) => {
                  const maxPayments = Math.max(...data.timeline.map((d) => d.payments), 1);
                  const height = (day.payments / maxPayments) * 100;
                  return (
                    <div
                      key={day.date}
                      className="flex-1 bg-green-500/30 hover:bg-green-500/50 rounded-t transition-colors group relative"
                      style={{ height: `${Math.max(height, 4)}%` }}
                      title={`${day.date}: ${day.payments}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
