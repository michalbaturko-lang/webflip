"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdminFetch, adminFetch } from "@/lib/admin/use-admin-fetch";
import {
  ArrowLeft,
  Mail,
  Linkedin,
  Calendar,
  Users,
  Play,
  Edit,
} from "lucide-react";

interface SequenceStep {
  step_number: number;
  delay_days: number;
  channel: "email" | "linkedin";
  template?: string;
  subject?: string;
  task_type?: string;
}

interface Sequence {
  id: string;
  name: string;
  description: string;
  steps: SequenceStep[];
  is_active: boolean;
  enrolled_count: number;
  created_at: string;
}

interface EnrolledRecord {
  id: string;
  domain: string;
  company_name: string;
  current_step: number;
  last_contact_date: string | null;
  stage: string;
}

interface StepStats {
  step_number: number;
  count: number;
}

export default function SequenceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: sequence, loading, refetch } = useAdminFetch<Sequence>(
    `/api/admin/sequences/${params.id}`
  );
  const { data: enrolledData } = useAdminFetch<{
    records: EnrolledRecord[];
    stats: StepStats[];
  }>(`/api/admin/sequences/${params.id}/enrolled`);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [executing, setExecuting] = useState(false);

  async function handleExecutePending() {
    if (!confirm("Spustit čekající kroky?")) return;
    setExecuting(true);
    try {
      await adminFetch(`/api/admin/sequences/${params.id}/execute`, {
        method: "POST",
      });
      refetch();
      alert("Kroky byly vykonány");
    } catch (err) {
      console.error("Execute failed:", err);
      alert("Chyba při vykonávání");
    } finally {
      setExecuting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-gray-900 rounded animate-pulse" />
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-pulse h-64" />
      </div>
    );
  }

  if (!sequence) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Sekvence nenalezena</p>
        <Link href="/admin/sequences" className="text-blue-400 hover:text-blue-300 text-sm mt-2">
          Zpět na seznam
        </Link>
      </div>
    );
  }

  const enrolled = enrolledData?.records || [];
  const stats = enrolledData?.stats || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/sequences"
            className="text-gray-500 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{sequence.name}</h1>
            <p className="text-sm text-gray-400 mt-1">{sequence.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/sequences/${params.id}/edit`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
          >
            <Edit size={14} />
            Upravit
          </Link>
          <button
            onClick={handleExecutePending}
            disabled={executing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 rounded-lg text-sm text-white transition-colors"
          >
            <Play size={14} />
            {executing ? "Spouštím..." : "Spustit"}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Status</div>
          <div className="text-lg font-semibold text-white">
            {sequence.is_active ? "🟢 Aktivní" : "⚫ Neaktivní"}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Celkem zařazeno</div>
          <div className="text-lg font-semibold text-white">{sequence.enrolled_count || 0}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Počet kroků</div>
          <div className="text-lg font-semibold text-white">{sequence.steps?.length || 0}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Vytvořeno</div>
          <div className="text-sm font-semibold text-white">
            {new Date(sequence.created_at).toLocaleDateString("cs-CZ")}
          </div>
        </div>
      </div>

      {/* Steps Timeline */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Časová osa kroků</h2>

        {sequence.steps && sequence.steps.length > 0 ? (
          <div className="space-y-4">
            {sequence.steps.map((step, idx) => {
              const stepStat = stats.find((s) => s.step_number === step.step_number);
              return (
                <div key={idx} className="flex gap-4">
                  {/* Timeline */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                      {step.step_number}
                    </div>
                    {idx < sequence.steps.length - 1 && (
                      <div className="w-0.5 h-12 bg-gray-700 mt-2" />
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 pt-1">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Channel & Template */}
                          <div className="flex items-center gap-2 mb-2">
                            {step.channel === "email" ? (
                              <>
                                <Mail size={14} className="text-blue-400 shrink-0" />
                                <span className="text-xs text-gray-300">
                                  Email: <span className="font-medium">{step.template || "—"}</span>
                                </span>
                              </>
                            ) : (
                              <>
                                <Linkedin size={14} className="text-blue-600 shrink-0" />
                                <span className="text-xs text-gray-300">
                                  LinkedIn: <span className="font-medium">{step.task_type || "—"}</span>
                                </span>
                              </>
                            )}
                          </div>

                          {/* Subject (Email only) */}
                          {step.channel === "email" && step.subject && (
                            <p className="text-sm text-gray-300 mb-2 truncate">
                              {step.subject}
                            </p>
                          )}

                          {/* Delay */}
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar size={12} />
                            <span>
                              {step.delay_days === 0
                                ? "Okamžitě"
                                : `+${step.delay_days} dní`}
                            </span>
                          </div>
                        </div>

                        {/* Count */}
                        <div className="text-right shrink-0">
                          <div className="text-2xl font-bold text-white">
                            {stepStat?.count || 0}
                          </div>
                          <div className="text-xs text-gray-500">na tomto kroku</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500">Žádné kroky</p>
        )}
      </div>

      {/* Enrolled Records */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users size={18} />
            Zařazení záznam
          </h2>
          <button
            onClick={() => setShowEnrollModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white transition-colors"
          >
            Zařadit více
          </button>
        </div>

        {enrolled.length === 0 ? (
          <p className="text-gray-500 py-4">Žádné zařazené záznamy</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-left border-b border-gray-800">
                  <th className="pb-2 font-medium">Společnost</th>
                  <th className="pb-2 font-medium">Doména</th>
                  <th className="pb-2 font-medium">Krok</th>
                  <th className="pb-2 font-medium">Poslední kontakt</th>
                  <th className="pb-2 font-medium">Fáze</th>
                </tr>
              </thead>
              <tbody>
                {enrolled.map((record) => (
                  <tr key={record.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-2 text-white">{record.company_name || "—"}</td>
                    <td className="py-2 text-gray-400">{record.domain}</td>
                    <td className="py-2">
                      <span className="bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded text-xs">
                        #{record.current_step}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500 text-xs">
                      {record.last_contact_date
                        ? new Date(record.last_contact_date).toLocaleDateString("cs-CZ")
                        : "—"}
                    </td>
                    <td className="py-2 text-gray-400 text-xs">{record.stage || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showEnrollModal && (
        <EnrollModal
          sequenceId={params.id}
          onClose={() => {
            setShowEnrollModal(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function EnrollModal({
  sequenceId,
  onClose,
}: {
  sequenceId: string;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const { data: searchResults } = useAdminFetch<{ data: any[] }>(
    search.length >= 2 ? `/api/admin/records?search=${encodeURIComponent(search)}&limit=50` : ""
  );

  async function handleEnroll() {
    if (selected.size === 0) {
      alert("Vyberte alespoň jeden záznam");
      return;
    }

    setEnrolling(true);
    try {
      await adminFetch(`/api/admin/sequences/${sequenceId}/enroll`, {
        method: "POST",
        body: JSON.stringify({
          record_ids: Array.from(selected),
        }),
      });
      onClose();
    } catch (err) {
      console.error("Enroll failed:", err);
      alert("Chyba při zařazování");
    } finally {
      setEnrolling(false);
    }
  }

  const records = searchResults?.data || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900 z-10">
          <h2 className="text-xl font-bold text-white">Zařadit více záznamů</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Hledat záznamy
            </label>
            <input
              type="text"
              placeholder="Zadejte společnost nebo doménu..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelected(new Set());
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Results */}
          {search.length < 2 ? (
            <p className="text-gray-500 text-sm py-4">Zadejte alespoň 2 znaky pro hledání</p>
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-3">
                Nalezeno: {records.length}
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-700 rounded cursor-pointer"
                    onClick={() => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(record.id)) next.delete(record.id);
                        else next.add(record.id);
                        return next;
                      });
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(record.id)}
                      onChange={() => {}}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 accent-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {record.company_name || record.domain}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {record.domain}
                      </p>
                    </div>
                  </div>
                ))}
                {records.length === 0 && (
                  <p className="text-gray-500 text-xs py-2">Žádné výsledky</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-800 flex gap-3 justify-end sticky bottom-0 bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
          >
            Zrušit
          </button>
          <button
            onClick={handleEnroll}
            disabled={enrolling || selected.size === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 rounded-lg text-sm text-white transition-colors"
          >
            {enrolling ? "Zařazuji..." : `Zařadit (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
