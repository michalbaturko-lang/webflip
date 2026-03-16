"use client";

import { Clock, RotateCcw } from "lucide-react";
import type { Snapshot } from "@/types/editor";

interface UndoRedoTimelineProps {
  snapshots: Snapshot[];
  currentIndex: number;
  onRestore: (index: number) => void;
  isVisible: boolean;
  onClose: () => void;
}

export default function UndoRedoTimeline({
  snapshots,
  currentIndex,
  onRestore,
  isVisible,
  onClose,
}: UndoRedoTimelineProps) {
  if (!isVisible || snapshots.length <= 1) return null;

  const formatTime = (date: Date) =>
    date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const getTypeIcon = (label: string) => {
    if (label === "Original") return "📄";
    if (label.startsWith("Edit text")) return "✏️";
    if (label.startsWith("Visual edit")) return "🎨";
    if (label.startsWith("[Element")) return "✦";
    return "🔧";
  };

  return (
    <div
      className="fixed left-4 top-20 bottom-20 z-[9997] w-[280px] rounded-2xl shadow-2xl shadow-black/50 border border-white/10 overflow-hidden flex flex-col"
      style={{
        background: "linear-gradient(180deg, rgba(15, 15, 25, 0.98) 0%, rgba(10, 10, 20, 0.99) 100%)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-purple-400" />
          <span className="font-semibold text-sm text-white">Version History</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
            {snapshots.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-gray-500 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
        >
          Close
        </button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {snapshots.map((snap, i) => {
          const isCurrent = i === currentIndex;
          const isPast = i < currentIndex;

          return (
            <div
              key={snap.id}
              className={`relative flex items-start gap-2.5 px-2.5 py-2 rounded-lg transition-colors cursor-pointer group ${
                isCurrent
                  ? "bg-purple-500/15 border border-purple-500/25"
                  : "hover:bg-white/5 border border-transparent"
              }`}
              onClick={() => onRestore(i)}
            >
              {/* Timeline dot + line */}
              <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                <div
                  className={`w-3 h-3 rounded-full border-2 transition-colors ${
                    isCurrent
                      ? "bg-purple-500 border-purple-400 ring-2 ring-purple-500/30"
                      : isPast
                      ? "bg-emerald-500/60 border-emerald-400/60"
                      : "bg-gray-700 border-gray-600"
                  }`}
                />
                {i < snapshots.length - 1 && (
                  <div
                    className={`w-0.5 h-6 mt-0.5 rounded-full ${
                      isPast ? "bg-emerald-500/30" : "bg-white/5"
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">{getTypeIcon(snap.label)}</span>
                  <p
                    className={`text-[11px] font-medium truncate ${
                      isCurrent ? "text-purple-300" : "text-gray-300"
                    }`}
                  >
                    {i === 0 ? "Original" : snap.label}
                  </p>
                </div>
                <p className="text-[9px] text-gray-500 mt-0.5">
                  {formatTime(snap.timestamp)}
                </p>
              </div>

              {/* Actions */}
              {!isCurrent && (
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(i);
                    }}
                    className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-purple-400 transition-colors"
                    title="Restore this version"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>
              )}

              {isCurrent && (
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-purple-500/25 text-purple-300 flex-shrink-0 mt-0.5">
                  current
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
