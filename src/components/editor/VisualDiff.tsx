"use client";

import { useMemo } from "react";

interface VisualDiffProps {
  beforeHtml: string;
  afterHtml: string;
  isVisible: boolean;
}

interface DiffLine {
  type: "added" | "removed" | "changed" | "unchanged";
  content: string;
  lineNum: number;
}

export default function VisualDiff({
  beforeHtml,
  afterHtml,
  isVisible,
}: VisualDiffProps) {
  const diffLines = useMemo(() => {
    if (!beforeHtml || !afterHtml) return [];

    const beforeLines = beforeHtml.split("\n");
    const afterLines = afterHtml.split("\n");
    const result: DiffLine[] = [];

    // Simple line-by-line diff
    const maxLen = Math.max(beforeLines.length, afterLines.length);
    const beforeSet = new Set(beforeLines);
    const afterSet = new Set(afterLines);

    // Find removed lines (in before but not in after)
    for (let i = 0; i < beforeLines.length; i++) {
      if (!afterSet.has(beforeLines[i]) && beforeLines[i].trim()) {
        result.push({
          type: "removed",
          content: beforeLines[i],
          lineNum: i + 1,
        });
      }
    }

    // Find added lines (in after but not in before)
    for (let i = 0; i < afterLines.length; i++) {
      if (!beforeSet.has(afterLines[i]) && afterLines[i].trim()) {
        result.push({
          type: "added",
          content: afterLines[i],
          lineNum: i + 1,
        });
      }
    }

    // Sort by line number
    result.sort((a, b) => a.lineNum - b.lineNum);

    // Limit to most relevant changes
    return result.slice(0, 50);
  }, [beforeHtml, afterHtml]);

  if (!isVisible) return null;

  const addedCount = diffLines.filter((l) => l.type === "added").length;
  const removedCount = diffLines.filter((l) => l.type === "removed").length;

  return (
    <div
      className="fixed left-6 bottom-6 z-50 w-[420px] max-h-[400px] rounded-2xl shadow-2xl shadow-black/50 border border-white/10 overflow-hidden flex flex-col"
      style={{
        background:
          "linear-gradient(180deg, rgba(15, 15, 25, 0.98) 0%, rgba(10, 10, 20, 0.99) 100%)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <span className="font-semibold text-sm text-white">Zmeny</span>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />+{addedCount}
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-400" />-{removedCount}
          </span>
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {diffLines.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-500">
            Zadne zmeny k zobrazeni
          </div>
        ) : (
          diffLines.map((line, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 px-2 py-1 rounded text-[11px] font-mono leading-relaxed ${
                line.type === "added"
                  ? "bg-emerald-500/10 text-emerald-300"
                  : line.type === "removed"
                  ? "bg-red-500/10 text-red-300"
                  : "bg-yellow-500/10 text-yellow-300"
              }`}
            >
              <span className="text-gray-600 w-4 flex-shrink-0 text-right select-none">
                {line.type === "added" ? "+" : line.type === "removed" ? "-" : "~"}
              </span>
              <span className="break-all whitespace-pre-wrap">
                {line.content.trim().substring(0, 200)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
