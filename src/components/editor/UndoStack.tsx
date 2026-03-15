"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Snapshot } from "@/types/editor";

interface UndoStackProps {
  snapshots: Snapshot[];
  currentIndex: number;
  onRestore: (index: number) => void;
  isVisible: boolean;
}

export function useUndoStack(initialHtml?: string) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    if (initialHtml && snapshots.length === 0) {
      setSnapshots([
        {
          id: `snap-initial`,
          html: initialHtml,
          label: "Original",
          timestamp: new Date(),
        },
      ]);
      setCurrentIndex(0);
    }
  }, [initialHtml, snapshots.length]);

  const pushSnapshot = useCallback(
    (html: string, label: string) => {
      setSnapshots((prev) => {
        const trimmed = prev.slice(0, currentIndex + 1);
        const newSnap: Snapshot = {
          id: `snap-${Date.now()}`,
          html,
          label,
          timestamp: new Date(),
        };
        return [...trimmed, newSnap];
      });
      setCurrentIndex((prev) => prev + 1);
    },
    [currentIndex]
  );

  const undo = useCallback((): string | null => {
    if (currentIndex <= 0) return null;
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    return snapshots[newIndex]?.html || null;
  }, [currentIndex, snapshots]);

  const redo = useCallback((): string | null => {
    if (currentIndex >= snapshots.length - 1) return null;
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    return snapshots[newIndex]?.html || null;
  }, [currentIndex, snapshots]);

  const restoreToIndex = useCallback(
    (index: number): string | null => {
      if (index < 0 || index >= snapshots.length) return null;
      setCurrentIndex(index);
      return snapshots[index].html;
    },
    [snapshots]
  );

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < snapshots.length - 1;

  return {
    snapshots,
    currentIndex,
    pushSnapshot,
    undo,
    redo,
    restoreToIndex,
    canUndo,
    canRedo,
  };
}

// Keyboard shortcuts hook - skips when focus is in input/textarea (#5)
export function useUndoKeyboard(
  undo: () => string | null,
  redo: () => string | null,
  onRestore: (html: string) => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept undo/redo in text inputs
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          const html = redo();
          if (html) onRestore(html);
        } else {
          const html = undo();
          if (html) onRestore(html);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, onRestore]);
}

// Timeline history panel
export default function UndoStackPanel({
  snapshots,
  currentIndex,
  onRestore,
  isVisible,
}: UndoStackProps) {
  const t = useTranslations("editor");

  if (!isVisible || snapshots.length <= 1) return null;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div
      className="fixed left-6 top-20 z-50 w-[260px] max-h-[400px] rounded-2xl shadow-2xl shadow-black/50 border border-white/10 overflow-hidden flex flex-col"
      style={{
        background:
          "linear-gradient(180deg, rgba(15, 15, 25, 0.98) 0%, rgba(10, 10, 20, 0.99) 100%)",
        backdropFilter: "blur(24px)",
      }}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 flex-shrink-0">
        <Clock className="h-4 w-4 text-purple-400" />
        <span className="font-semibold text-sm text-white">{t("historyTitle")}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {snapshots.map((snap, i) => (
          <button
            key={snap.id}
            onClick={() => onRestore(i)}
            aria-label={snap.label}
            className={`w-full text-left flex items-start gap-2.5 px-3 py-2 rounded-lg transition-colors text-xs group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
              i === currentIndex
                ? "bg-purple-500/20 border border-purple-500/30"
                : "hover:bg-white/5 border border-transparent"
            }`}
          >
            <div className="flex flex-col items-center flex-shrink-0 mt-0.5">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  i === currentIndex
                    ? "bg-purple-400 ring-2 ring-purple-400/30"
                    : i < currentIndex
                    ? "bg-emerald-400/60"
                    : "bg-gray-600"
                }`}
              />
              {i < snapshots.length - 1 && (
                <div className="w-px h-4 bg-white/10 mt-0.5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={`font-medium truncate ${
                  i === currentIndex ? "text-purple-300" : "text-gray-300"
                }`}
              >
                {i === 0 ? t("historyOriginal") : snap.label}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {formatTime(snap.timestamp)}
              </p>
            </div>

            {i !== currentIndex && (
              <RotateCcw className="h-3 w-3 text-gray-600 group-hover:text-purple-400 transition-colors flex-shrink-0 mt-0.5" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
