"use client";

import { useState, useMemo } from "react";
import { useAdminFetch, adminFetch } from "@/lib/admin/use-admin-fetch";
import type { LinkedInTask, OutreachSequence } from "@/types/outreach";
import type { CrmRecord } from "@/types/admin";
import {
  Send,
  CheckCircle2,
  Zap,
  TrendingUp,
  ChevronDown,
  MessageSquare,
  X,
} from "lucide-react";

interface PendingEmailTask {
  record_id: string;
  company_name: string | null;
  domain: string;
  sequence_id: string;
  sequence_name: string;
  current_step: number;
  template: string;
  subject: string;
  first_contact_date: string;
}

interface LinkedInTaskWithRecord extends LinkedInTask {
  company_name: string | null;
  domain: string;
  linkedin_url: string | null;
}

interface SequenceStats {
  sequence_id: string;
  sequence_name: string;
  total_enrolled: number;
  step_counts: Record<number, number>;
}

interface DailyOutreachData {
  pending_email_tasks: PendingEmailTask[];
  pending_linkedin_tasks: LinkedInTaskWithRecord[];
  today_stats: {
    emails_sent: number;
    linkedin_completed: number;
    new_visits: number;
  };
  sequence_stats: SequenceStats[];
}

export default function OutreachPage() {
  const { data, loading, refetch } = useAdminFetch<DailyOutreachData>("/api/admin/outreach/daily");
  const [selectedEmail, setSelectedEmail] = useState<Set<string>>(new Set());
  const [linkedinFilter, setLinkedinFilter] = useState<"pending" | "completed" | "all">("pending");
  const [sendingEmails, setSendingEmails] = useState(false);
  const [linkedinTaskToComplete, setLinkedinTaskToComplete] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");

  const pendingEmails = data?.pending_email_tasks || [];
  const linkedinTasks = data?.pending_linkedin_tasks || [];
  const stats = data?.today_stats || { emails_sent: 0, linkedin_completed: 0, new_visits: 0 };
  const sequenceStats = data?.sequence_stats || [];

  const filteredLinkedinTasks = useMemo(() => {
    if (linkedinFilter === "pending") {
      return linkedinTasks.filter((t) => t.status === "pending");
    } else if (linkedinFilter === "completed") {
      return linkedinTasks.filter((t) => t.status === "completed");
    }
    return linkedinTasks;
  }, [linkedinTasks, linkedinFilter]);

  function toggleEmailSelect(id: string) {
    setSelectedEmail((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllEmails() {
    if (selectedEmail.size === pendingEmails.length) {
      setSelectedEmail(new Set());
    } else {
      setSelectedEmail(new Set(pendingEmails.map((t) => t.record_id)));
    }
  }

  async function sendSelectedEmails(recordIds: string[]) {
    if (recordIds.length === 0) return;
    setSendingEmails(true);
    try {
      await adminFetch("/api/admin/outreach/execute", {
        method: "POST",
        body: JSON.stringify({ record_ids: recordIds }),
      });
      setSelectedEmail(new Set());
      refetch();
    } catch (err) {
      console.error("Send emails failed:", err);
    } finally {
      setSendingEmails(false);
    }
  }

  async function completeLinkedinTask(taskId: string, actualMessage?: string) {
    try {
      await adminFetch(`/api/admin/linkedin-tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify({
          status: "completed",
          actual_message: actualMessage || null,
        }),
      });
      setLinkedinTaskToComplete(null);
      setMessageInput("");
      refetch();
    } catch (err) {
      console.error("Complete LinkedIn task failed:", err);
    }
  }

  async function skipLinkedinTask(taskId: string) {
    try {
      await adminFetch(`/api/admin/linkedin-tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify({ status: "skipped" }),
      });
      refetch();
    } catch (err) {
      console.error("Skip LinkedIn task failed:", err);
    }
  }

  const kpiCards = [
    {
      label: "Dnes k odeslání",
      value: pendingEmails.length,
      icon: Send,
      color: "text-blue-400",
      bgColor: "bg-blue-900/20",
    },
    {
      label: "Odesláno dnes",
      value: stats.emails_sent,
      icon: CheckCircle2,
      color: "text-green-400",
      bgColor: "bg-green-900/20",
    },
    {
      label: "LinkedIn úkoly",
      value: linkedinTasks.filter((t) => t.status === "pending").length,
      icon: Zap,
      color: "text-purple-400",
      bgColor: "bg-purple-900/20",
    },
    {
      label: "Návštěvy dnes",
      value: stats.new_visits,
      icon: TrendingUp,
      color: "text-amber-400",
      bgColor: "bg-amber-900/20",
    },
  ];

  const delayedDays = (taskData: PendingEmailTask) => {
    const firstContact = new Date(taskData.first_contact_date);
    const now = new Date();
    const daysAgo = Math.floor((now.getTime() - firstContact.getTime()) / (1000 * 60 * 60 * 24));
    return daysAgo;
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Denní dosah</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            className={`${kpi.bgColor} border border-gray-800 rounded-xl p-5`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{kpi.label}</p>
                <p className="text-3xl font-bold text-white mt-1">{kpi.value}</p>
              </div>
              <kpi.icon className={`${kpi.color}`} size={28} />
            </div>
          </div>
        ))}
      </div>

      {/* Pending Email Tasks */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Čekající e-maily</h2>
          {selectedEmail.size > 0 && (
            <button
              onClick={() => sendSelectedEmails(Array.from(selectedEmail))}
              disabled={sendingEmails}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white font-medium transition-colors"
            >
              {sendingEmails ? "Odesílám..." : `Odeslat vše (${selectedEmail.size})`}
            </button>
          )}
        </div>

        {loading ? (
          <div className="animate-pulse h-40 bg-gray-800 rounded-lg" />
        ) : pendingEmails.length === 0 ? (
          <p className="text-gray-500 text-sm">Žádné čekající e-maily</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-left border-b border-gray-800">
                  <th className="pb-3 p-3 w-10">
                    <button
                      onClick={toggleSelectAllEmails}
                      className="flex items-center justify-center w-4 h-4 border border-gray-600 rounded hover:bg-gray-700"
                    />
                  </th>
                  <th className="pb-3 p-3 font-medium">Firma</th>
                  <th className="pb-3 p-3 font-medium">Doména</th>
                  <th className="pb-3 p-3 font-medium">Krok sekvence</th>
                  <th className="pb-3 p-3 font-medium">Šablona</th>
                  <th className="pb-3 p-3 font-medium">Zpožděno od</th>
                  <th className="pb-3 p-3 font-medium">Akce</th>
                </tr>
              </thead>
              <tbody>
                {pendingEmails.map((task) => (
                  <tr key={task.record_id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="p-3">
                      <button
                        onClick={() => toggleEmailSelect(task.record_id)}
                        className={`flex items-center justify-center w-4 h-4 border rounded ${
                          selectedEmail.has(task.record_id)
                            ? "bg-blue-600 border-blue-600"
                            : "border-gray-600"
                        }`}
                      />
                    </td>
                    <td className="p-3 text-white">{task.company_name || "—"}</td>
                    <td className="p-3 text-gray-400">{task.domain}</td>
                    <td className="p-3 text-gray-400">#{task.current_step + 1}</td>
                    <td className="p-3 text-gray-400">{task.template}</td>
                    <td className="p-3 text-amber-400">{delayedDays(task)}d</td>
                    <td className="p-3">
                      <button
                        onClick={() => sendSelectedEmails([task.record_id])}
                        disabled={sendingEmails}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-xs text-white transition-colors"
                      >
                        Odeslat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* LinkedIn Tasks */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">LinkedIn úkoly</h2>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {(["pending", "completed", "all"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setLinkedinFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                linkedinFilter === filter
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {filter === "pending"
                ? `Čekající (${linkedinTasks.filter((t) => t.status === "pending").length})`
                : filter === "completed"
                  ? `Hotovo dnes (${linkedinTasks.filter((t) => t.status === "completed").length})`
                  : `Všechny (${linkedinTasks.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="animate-pulse h-40 bg-gray-800 rounded-lg" />
        ) : filteredLinkedinTasks.length === 0 ? (
          <p className="text-gray-500 text-sm">
            {linkedinFilter === "pending"
              ? "Žádné čekající LinkedIn úkoly"
              : "Žádné úkoly v tomto filtru"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-left border-b border-gray-800">
                  <th className="pb-3 p-3 font-medium">Firma</th>
                  <th className="pb-3 p-3 font-medium">Typ úkolu</th>
                  <th className="pb-3 p-3 font-medium">LinkedIn profil</th>
                  <th className="pb-3 p-3 font-medium">Šablona zprávy</th>
                  <th className="pb-3 p-3 font-medium">Stav</th>
                  <th className="pb-3 p-3 font-medium">Akce</th>
                </tr>
              </thead>
              <tbody>
                {filteredLinkedinTasks.map((task) => (
                  <tr key={task.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="p-3 text-white">{task.company_name || "—"}</td>
                    <td className="p-3 text-gray-400">{task.task_type.replace(/_/g, " ")}</td>
                    <td className="p-3">
                      {task.linkedin_url ? (
                        <a
                          href={task.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline text-xs"
                        >
                          Profil →
                        </a>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-400 text-xs max-w-xs truncate">
                      {task.template_message || task.actual_message || "—"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          task.status === "pending"
                            ? "bg-yellow-900/50 text-yellow-400"
                            : task.status === "completed"
                              ? "bg-green-900/50 text-green-400"
                              : "bg-gray-800 text-gray-400"
                        }`}
                      >
                        {task.status === "pending"
                          ? "Čekající"
                          : task.status === "completed"
                            ? "Hotovo"
                            : "Přeskočeno"}
                      </span>
                    </td>
                    <td className="p-3 flex gap-2">
                      {task.status === "pending" && (
                        <>
                          <button
                            onClick={() => setLinkedinTaskToComplete(task.id)}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs text-white transition-colors"
                          >
                            Hotovo
                          </button>
                          <button
                            onClick={() => skipLinkedinTask(task.id)}
                            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors"
                          >
                            Přeskočit
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* LinkedIn Task Completion Modal */}
      {linkedinTaskToComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Zaznamenat zprávu (volitelné)
              </h3>
              <button
                onClick={() => {
                  setLinkedinTaskToComplete(null);
                  setMessageInput("");
                }}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Zadejte zprávu, kterou jste poslali (volitelné)"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24 mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => completeLinkedinTask(linkedinTaskToComplete, messageInput)}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm text-white font-medium transition-colors"
              >
                Potvrdit hotovo
              </button>
              <button
                onClick={() => {
                  setLinkedinTaskToComplete(null);
                  setMessageInput("");
                }}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 font-medium transition-colors"
              >
                Zrušit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sequence Overview */}
      {sequenceStats.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Přehled sekvencí</h2>
          <div className="space-y-4">
            {sequenceStats.map((seq) => (
              <div key={seq.sequence_id} className="border border-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white">{seq.sequence_name}</h3>
                  <span className="text-xs text-gray-400">
                    Registrováno: {seq.total_enrolled}
                  </span>
                </div>
                <div className="flex gap-1">
                  {Object.entries(seq.step_counts)
                    .sort((a, b) => Number(a[0]) - Number(b[0]))
                    .map(([step, count]) => (
                      <div
                        key={step}
                        className="flex-1 text-center"
                      >
                        <div
                          className="bg-blue-600 rounded-full py-2 mb-1"
                          style={{
                            opacity:
                              Math.max(0.3, count / Math.max(...Object.values(seq.step_counts))),
                          }}
                        >
                          <span className="text-xs font-medium text-white">{count}</span>
                        </div>
                        <span className="text-xs text-gray-500">Krok {step}</span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
