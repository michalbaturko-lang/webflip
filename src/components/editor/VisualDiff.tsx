"use client";

import { useMemo } from "react";
import { diffLines } from "diff";
import { useTranslations } from "next-intl";
import type { DiffLine } from "@/types/editor";

interface VisualDiffProps {
  beforeHtml: string;
  afterHtml: string;
  isVisible: boolean;
}

export default function VisualDiff({
  beforeHtml,
  afterHtml,
  isVisible,
}: VisualDiffProps) {
  const t = useTranslations("editor");

  const diffResult = useMemo((): DiffLine[] => {
    if (!beforeHtml || !afterHtml) return [];

    const changes = diffLines(beforeHtml, afterHtml);
    const result: DiffLine[] = [];
    let lineNum = 1;

    for (const change of changes) {
      const lines = (change.value || "").split("\n").filter((l) => l.trim());
      for (const line of lines) {
        if (change.added) {
          result.push({ type: "added", content: line, lineNum });
        } else if (change.removed) {
          result.push({ type: "removed", content: line, lineNum });
        }
        // Skip unchanged lines to keep the view focused
        lineNum++;
      }
    }

    return result.slice(0, 50);
  }, [beforeHtml, afterHtml]);

  if (!isVisible) return null;

  const addedCount = diffResult.filter((l) => l.type === "added").length;
  const removedCount = diffResult.filter((l) => l.type === "removed").length;

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
        <span className="font-semibold text-sm text-white">{t("diffTitle")}</span>
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
        {diffResult.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-500">
            {t("diffNoChanges")}
          </div>
        ) : (
          diffResult.map((line, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 px-2 py-1 rounded text-[11px] font-mono leading-relaxed ${
                line.type === "added"
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "bg-red-500/10 text-red-300"
              }`}
            >
              <span className="text-gray-600 w-4 flex-shrink-0 text-right select-none">
                {line.type === "added" ? "+" : "-"}
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
