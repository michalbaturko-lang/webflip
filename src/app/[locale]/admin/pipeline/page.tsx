"use client";

import { useState } from "react";
import { useAdminFetch, adminFetch } from "@/lib/admin/use-admin-fetch";
import type { PipelineColumn, CrmRecord, CrmStage } from "@/types/admin";
import { GripVertical, ExternalLink } from "lucide-react";

const STAGE_COLORS: Record<string, string> = {
  prospect: "border-t-gray-500",
  contacted: "border-t-blue-500",
  engaged: "border-t-indigo-500",
  trial_started: "border-t-purple-500",
  trial_active: "border-t-violet-500",
  card_added: "border-t-amber-500",
  paid: "border-t-green-500",
};

export default function PipelinePage() {
  const { data: columns, loading, refetch } = useAdminFetch<PipelineColumn[]>("/api/admin/pipeline");
  const [dragging, setDragging] = useState<string | null>(null);

  async function handleDrop(recordId: string, newStage: CrmStage) {
    try {
      await adminFetch(`/api/admin/records/${recordId}`, {
        method: "PUT",
        body: JSON.stringify({ stage: newStage }),
      });
      refetch();
    } catch (err) {
      console.error("Stage update failed:", err);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">Pipeline</h1>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl w-64 h-96 shrink-0 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!columns) return <p className="text-gray-400">Failed to load pipeline</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Pipeline</h1>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div
            key={col.stage}
            className={`bg-gray-900 border border-gray-800 border-t-2 ${STAGE_COLORS[col.stage] || "border-t-gray-600"} rounded-xl w-64 shrink-0 flex flex-col`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const recordId = e.dataTransfer.getData("text/plain");
              if (recordId && recordId !== dragging) {
                handleDrop(recordId, col.stage);
              }
              setDragging(null);
            }}
          >
            <div className="p-3 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">{col.label}</h3>
              <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                {col.records.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-220px)]">
              {col.records.map((record) => (
                <PipelineCard
                  key={record.id}
                  record={record}
                  onDragStart={() => setDragging(record.id)}
                />
              ))}
              {col.records.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-4">No records</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PipelineCard({ record, onDragStart }: { record: CrmRecord; onDragStart: () => void }) {
  const daysInStage = record.updated_at
    ? Math.floor((Date.now() - new Date(record.updated_at).getTime()) / 86400000)
    : 0;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", record.id);
        onDragStart();
      }}
      className="bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-gray-600 transition-colors"
    >
      <div className="flex items-start gap-2">
        <GripVertical size={14} className="text-gray-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {record.company_name || record.domain}
          </p>
          <p className="text-xs text-gray-500 truncate">{record.domain}</p>

          <div className="flex items-center gap-2 mt-2">
            {record.suitability_score != null && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                record.suitability_score >= 70 ? "bg-green-900/50 text-green-400" :
                record.suitability_score >= 40 ? "bg-yellow-900/50 text-yellow-400" :
                "bg-gray-700 text-gray-400"
              }`}>
                {record.suitability_score}
              </span>
            )}
            <span className="text-xs text-gray-600">{daysInStage}d</span>
            {record.outreach_channel && (
              <span className="text-xs text-gray-500">{record.outreach_channel}</span>
            )}
          </div>
        </div>
        {record.website_url && (
          <a
            href={record.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-400"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}
