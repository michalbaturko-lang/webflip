"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdminFetch, adminFetch } from "@/lib/admin/use-admin-fetch";
import {
  Plus,
  ChevronRight,
  Check,
  Trash2,
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

export default function SequencesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { data: sequences, loading, refetch } = useAdminFetch<Sequence[]>("/api/admin/sequences");

  async function handleDelete(id: string) {
    if (!confirm("Smazat sekvenci?")) return;
    try {
      await adminFetch(`/api/admin/sequences/${id}`, { method: "DELETE" });
      refetch();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Chyba při mazání");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Sekvence</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white transition-colors"
        >
          <Plus size={16} />
          Nová sekvence
        </button>
      </div>

      {loading ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl animate-pulse h-64" />
      ) : !sequences || sequences.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">Žádné sekvence</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 border-b border-gray-800 text-gray-400 text-left">
                  <th className="p-3 font-medium">Název</th>
                  <th className="p-3 font-medium">Popis</th>
                  <th className="p-3 font-medium">Kroky</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Zařazeno</th>
                  <th className="p-3 font-medium">Vytvořeno</th>
                  <th className="p-3 font-medium">Akce</th>
                </tr>
              </thead>
              <tbody>
                {sequences.map((seq) => (
                  <tr
                    key={seq.id}
                    className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="p-3">
                      <Link
                        href={`/admin/sequences/${seq.id}`}
                        className="text-white hover:text-blue-400 font-medium flex items-center gap-2 group"
                      >
                        {seq.name}
                        <ChevronRight size={14} className="text-gray-600 group-hover:text-blue-400" />
                      </Link>
                    </td>
                    <td className="p-3 text-gray-400 text-sm">{seq.description || "—"}</td>
                    <td className="p-3 text-gray-300 text-sm">{seq.steps?.length || 0}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          seq.is_active
                            ? "bg-green-900/50 text-green-400"
                            : "bg-gray-800 text-gray-400"
                        }`}
                      >
                        {seq.is_active ? "Aktivní" : "Neaktivní"}
                      </span>
                    </td>
                    <td className="p-3 text-gray-300 text-sm">{seq.enrolled_count || 0}</td>
                    <td className="p-3 text-gray-500 text-xs">
                      {new Date(seq.created_at).toLocaleDateString("cs-CZ")}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleDelete(seq.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                        title="Smazat"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateSequenceModal
          onClose={() => {
            setShowCreateModal(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function CreateSequenceModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [steps, setSteps] = useState<SequenceStep[]>([
    { step_number: 1, delay_days: 0, channel: "email", template: "cold_intro" },
  ]);

  function addStep() {
    setSteps([
      ...steps,
      {
        step_number: steps.length + 1,
        delay_days: 3,
        channel: "email",
        template: "cold_intro",
      },
    ]);
  }

  function removeStep(index: number) {
    setSteps(steps.filter((_, i) => i !== index));
  }

  function updateStep(index: number, updates: Partial<SequenceStep>) {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setSteps(newSteps);
  }

  async function handleSubmit() {
    if (!name.trim()) {
      alert("Zadejte název sekvence");
      return;
    }
    if (steps.length === 0) {
      alert("Přidejte alespoň jeden krok");
      return;
    }

    setLoading(true);
    try {
      await adminFetch("/api/admin/sequences", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          is_active: isActive,
          steps: steps.map((s, i) => ({
            ...s,
            step_number: i + 1,
          })),
        }),
      });
      onClose();
    } catch (err) {
      console.error("Create failed:", err);
      alert("Chyba při vytváření sekvence");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900 z-10">
          <h2 className="text-xl font-bold text-white">Nová sekvence</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Název
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Např. Onboarding 2024"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Popis
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Popis sekvence..."
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-gray-700 bg-gray-800 accent-blue-600"
            />
            <label htmlFor="active" className="text-sm text-gray-300">
              Aktivní
            </label>
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-300">
                Kroky
              </label>
              <button
                onClick={addStep}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-gray-300 transition-colors"
              >
                <Plus size={12} />
                Přidat krok
              </button>
            </div>

            <div className="space-y-3">
              {steps.map((step, idx) => (
                <StepEditor
                  key={idx}
                  step={step}
                  index={idx}
                  onUpdate={updateStep}
                  onRemove={removeStep}
                  canRemove={steps.length > 1}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-800 flex gap-3 justify-end sticky bottom-0 bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
          >
            Zrušit
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 rounded-lg text-sm text-white transition-colors"
          >
            {loading ? "Ukládání..." : "Vytvořit"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StepEditor({
  step,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: {
  step: SequenceStep;
  index: number;
  onUpdate: (index: number, updates: Partial<SequenceStep>) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-300">Krok {index + 1}</h4>
        {canRemove && (
          <button
            onClick={() => onRemove(index)}
            className="text-gray-500 hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Delay */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Zpoždění (dny)
          </label>
          <input
            type="number"
            min="0"
            value={step.delay_days}
            onChange={(e) => onUpdate(index, { delay_days: parseInt(e.target.value) || 0 })}
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Channel */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Kanál
          </label>
          <select
            value={step.channel}
            onChange={(e) =>
              onUpdate(index, {
                channel: e.target.value as "email" | "linkedin",
              })
            }
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="email">Email</option>
            <option value="linkedin">LinkedIn</option>
          </select>
        </div>
      </div>

      {step.channel === "email" ? (
        <>
          {/* Template */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Šablona
            </label>
            <select
              value={step.template || ""}
              onChange={(e) => onUpdate(index, { template: e.target.value })}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cold_intro">Cold Intro</option>
              <option value="follow_up">Follow Up</option>
              <option value="final_push">Final Push</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Předmět emailu
            </label>
            <input
              type="text"
              value={step.subject || ""}
              onChange={(e) => onUpdate(index, { subject: e.target.value })}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Předmět emailu..."
            />
          </div>
        </>
      ) : (
        <>
          {/* Task Type for LinkedIn */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Typ úkolu
            </label>
            <select
              value={step.task_type || ""}
              onChange={(e) => onUpdate(index, { task_type: e.target.value })}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="connection_request">Žádost o spojení</option>
              <option value="message">Zpráva</option>
              <option value="follow_up">Follow Up</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
}
