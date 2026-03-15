"use client";

import {
  Undo2,
  Redo2,
  GitCompareArrows,
  Lightbulb,
  Clock,
  MousePointerClick,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface EditorToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isDiffVisible: boolean;
  onToggleDiff: () => void;
  isSuggestionsVisible: boolean;
  onToggleSuggestions: () => void;
  isHistoryVisible: boolean;
  onToggleHistory: () => void;
  isInlineEditEnabled: boolean;
  onToggleInlineEdit: () => void;
  editCount: number;
}

const BTN_BASE =
  "p-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500";

export default function EditorToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isDiffVisible,
  onToggleDiff,
  isSuggestionsVisible,
  onToggleSuggestions,
  isHistoryVisible,
  onToggleHistory,
  isInlineEditEnabled,
  onToggleInlineEdit,
  editCount,
}: EditorToolbarProps) {
  const t = useTranslations("editor");

  return (
    <div
      role="toolbar"
      aria-label={t("title")}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-full px-2 py-1.5 shadow-2xl shadow-black/40 border border-white/10"
      style={{
        background:
          "linear-gradient(180deg, rgba(20, 20, 35, 0.95) 0%, rgba(12, 12, 24, 0.98) 100%)",
        backdropFilter: "blur(24px)",
      }}
    >
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`${BTN_BASE} hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed`}
        aria-label={t("toolbarUndo")}
        title={t("toolbarUndo")}
      >
        <Undo2
          className="h-4 w-4"
          style={{ color: canUndo ? "#c4b5fd" : "#4b5563" }}
        />
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={`${BTN_BASE} hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed`}
        aria-label={t("toolbarRedo")}
        title={t("toolbarRedo")}
      >
        <Redo2
          className="h-4 w-4"
          style={{ color: canRedo ? "#c4b5fd" : "#4b5563" }}
        />
      </button>

      <div className="w-px h-5 bg-white/10 mx-1" />

      <button
        onClick={onToggleInlineEdit}
        className={`${BTN_BASE} ${
          isInlineEditEnabled
            ? "bg-blue-500/20 text-blue-400"
            : "hover:bg-white/10 text-gray-400"
        }`}
        aria-label={t("toolbarInlineEdit")}
        aria-pressed={isInlineEditEnabled}
        title={t("toolbarInlineEdit")}
      >
        <MousePointerClick className="h-4 w-4" />
      </button>

      <button
        onClick={onToggleDiff}
        className={`${BTN_BASE} ${
          isDiffVisible
            ? "bg-emerald-500/20 text-emerald-400"
            : "hover:bg-white/10 text-gray-400"
        }`}
        aria-label={t("toolbarDiff")}
        aria-pressed={isDiffVisible}
        title={t("toolbarDiff")}
      >
        <GitCompareArrows className="h-4 w-4" />
      </button>

      <button
        onClick={onToggleSuggestions}
        className={`${BTN_BASE} ${
          isSuggestionsVisible
            ? "bg-amber-500/20 text-amber-400"
            : "hover:bg-white/10 text-gray-400"
        }`}
        aria-label={t("toolbarSuggestions")}
        aria-pressed={isSuggestionsVisible}
        title={t("toolbarSuggestions")}
      >
        <Lightbulb className="h-4 w-4" />
      </button>

      <button
        onClick={onToggleHistory}
        className={`${BTN_BASE} ${
          isHistoryVisible
            ? "bg-purple-500/20 text-purple-400"
            : "hover:bg-white/10 text-gray-400"
        }`}
        aria-label={t("toolbarHistory")}
        aria-pressed={isHistoryVisible}
        title={t("toolbarHistory")}
      >
        <Clock className="h-4 w-4" />
      </button>

      {editCount > 0 && (
        <>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">
            {t("editsApplied", { count: editCount })}
          </span>
        </>
      )}
    </div>
  );
}
