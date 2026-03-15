"use client";

import {
  Undo2,
  Redo2,
  GitCompareArrows,
  Lightbulb,
  Clock,
  MousePointerClick,
} from "lucide-react";

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
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-full px-2 py-1.5 shadow-2xl shadow-black/40 border border-white/10"
      style={{
        background:
          "linear-gradient(180deg, rgba(20, 20, 35, 0.95) 0%, rgba(12, 12, 24, 0.98) 100%)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Zpet (Ctrl+Z)"
      >
        <Undo2
          className="h-4 w-4"
          style={{ color: canUndo ? "#c4b5fd" : "#4b5563" }}
        />
      </button>

      {/* Redo */}
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Vpred (Ctrl+Shift+Z)"
      >
        <Redo2
          className="h-4 w-4"
          style={{ color: canRedo ? "#c4b5fd" : "#4b5563" }}
        />
      </button>

      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* Inline edit toggle */}
      <button
        onClick={onToggleInlineEdit}
        className={`p-2 rounded-full transition-colors ${
          isInlineEditEnabled
            ? "bg-blue-500/20 text-blue-400"
            : "hover:bg-white/10 text-gray-400"
        }`}
        title="Inline editace kliknutim"
      >
        <MousePointerClick className="h-4 w-4" />
      </button>

      {/* Diff toggle */}
      <button
        onClick={onToggleDiff}
        className={`p-2 rounded-full transition-colors ${
          isDiffVisible
            ? "bg-emerald-500/20 text-emerald-400"
            : "hover:bg-white/10 text-gray-400"
        }`}
        title="Zobrazit zmeny"
      >
        <GitCompareArrows className="h-4 w-4" />
      </button>

      {/* Suggestions toggle */}
      <button
        onClick={onToggleSuggestions}
        className={`p-2 rounded-full transition-colors ${
          isSuggestionsVisible
            ? "bg-amber-500/20 text-amber-400"
            : "hover:bg-white/10 text-gray-400"
        }`}
        title="Chytre navrhy"
      >
        <Lightbulb className="h-4 w-4" />
      </button>

      {/* History toggle */}
      <button
        onClick={onToggleHistory}
        className={`p-2 rounded-full transition-colors ${
          isHistoryVisible
            ? "bg-purple-500/20 text-purple-400"
            : "hover:bg-white/10 text-gray-400"
        }`}
        title="Historie zmen"
      >
        <Clock className="h-4 w-4" />
      </button>

      {/* Edit count badge */}
      {editCount > 0 && (
        <>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">
            {editCount} {editCount === 1 ? "uprava" : editCount < 5 ? "upravy" : "uprav"}
          </span>
        </>
      )}
    </div>
  );
}
