"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminFetch, adminFetch } from "@/lib/admin/use-admin-fetch";
import { CRM_STAGES, type CrmRecord, type CrmStage } from "@/types/admin";
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  Check,
} from "lucide-react";

const STAGE_BADGE: Record<string, string> = {
  prospect: "bg-gray-800 text-gray-300",
  contacted: "bg-blue-900/50 text-blue-400",
  engaged: "bg-indigo-900/50 text-indigo-400",
  trial_started: "bg-purple-900/50 text-purple-400",
  trial_active: "bg-violet-900/50 text-violet-400",
  email_captured: "bg-cyan-900/50 text-cyan-400",
  card_added: "bg-amber-900/50 text-amber-400",
  paid: "bg-green-900/50 text-green-400",
  churned: "bg-red-900/50 text-red-400",
  lost: "bg-red-950/50 text-red-500",
};

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulk, setShowBulk] = useState(false);
  const pathname = usePathname();

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (stageFilter) p.set("stage", stageFilter);
    p.set("limit", "100");
    return p.toString();
  }, [search, stageFilter]);

  const { data, loading, refetch } = useAdminFetch<{ data: CrmRecord[]; count: number }>(
    `/api/admin/records?${queryParams}`,
    [queryParams]
  );

  const records = data?.data || [];
  const count = data?.count || 0;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === records.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(records.map((r) => r.id)));
    }
  }

  async function handleBulkAction(action: string, value: string) {
    const ids = Array.from(selected);
    if (!ids.length) return;

    try {
      if (action === "change_stage") {
        await adminFetch("/api/admin/records/bulk", {
          method: "POST",
          body: JSON.stringify({ action: "change_stage", ids, stage: value }),
        });
      } else if (action === "add_tag") {
        await adminFetch("/api/admin/records/bulk", {
          method: "POST",
          body: JSON.stringify({ action: "add_tags", ids, tags: [value] }),
        });
      }
      setSelected(new Set());
      setShowBulk(false);
      refetch();
    } catch (err) {
      console.error("Bulk action failed:", err);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Contacts</h1>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/export"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
          >
            <Download size={14} />
            Export CSV
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by company or domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="relative">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="appearance-none pl-8 pr-8 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Stages</option>
            {CRM_STAGES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
          <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>

        <span className="text-sm text-gray-500">{count} records</span>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-950/30 border border-blue-900/50 rounded-lg px-4 py-2">
          <span className="text-sm text-blue-400">{selected.size} selected</span>
          <div className="relative">
            <button
              onClick={() => setShowBulk(!showBulk)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white transition-colors"
            >
              Bulk Actions
            </button>
            {showBulk && (
              <div className="absolute top-full left-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg py-1 z-10 w-48">
                <p className="px-3 py-1 text-xs text-gray-500 uppercase">Change Stage</p>
                {CRM_STAGES.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleBulkAction("change_stage", s)}
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800"
                  >
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => { setSelected(new Set()); setShowBulk(false); }}
            className="text-sm text-gray-400 hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl animate-pulse h-64" />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 border-b border-gray-800 text-gray-400 text-left">
                  <th className="p-3 w-10">
                    <button onClick={toggleSelectAll} className="flex items-center justify-center w-4 h-4 border border-gray-600 rounded">
                      {selected.size === records.length && records.length > 0 && <Check size={12} />}
                    </button>
                  </th>
                  <th className="p-3 font-medium">Company</th>
                  <th className="p-3 font-medium">Domain</th>
                  <th className="p-3 font-medium">Stage</th>
                  <th className="p-3 font-medium">Score</th>
                  <th className="p-3 font-medium">Contact</th>
                  <th className="p-3 font-medium">Source</th>
                  <th className="p-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="p-3">
                      <button
                        onClick={() => toggleSelect(r.id)}
                        className={`flex items-center justify-center w-4 h-4 border rounded ${
                          selected.has(r.id)
                            ? "bg-blue-600 border-blue-600"
                            : "border-gray-600"
                        }`}
                      >
                        {selected.has(r.id) && <Check size={12} className="text-white" />}
                      </button>
                    </td>
                    <td className="p-3">
                      <Link
                        href={`${pathname}/${r.id}`}
                        className="text-white hover:text-blue-400 font-medium"
                      >
                        {r.company_name || "—"}
                      </Link>
                    </td>
                    <td className="p-3 text-gray-400">{r.domain}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        STAGE_BADGE[r.stage] || "bg-gray-800 text-gray-400"
                      }`}>
                        {r.stage.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-3">
                      {r.suitability_score != null ? (
                        <span className={`text-xs font-medium ${
                          r.suitability_score >= 70 ? "text-green-400" :
                          r.suitability_score >= 40 ? "text-yellow-400" : "text-gray-400"
                        }`}>
                          {r.suitability_score}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="p-3 text-gray-400 text-xs">
                      {r.contact_name || r.contact_email || "—"}
                    </td>
                    <td className="p-3 text-gray-500 text-xs">{r.source}</td>
                    <td className="p-3 text-gray-500 text-xs">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">
                      No contacts found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
