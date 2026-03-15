"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Wand2,
  Send,
  X,
  Loader2,
  ChevronRight,
  Undo2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface EditHistoryEntry {
  instruction: string;
  timestamp: Date;
  status: "success" | "error";
  errorMessage?: string;
}

interface AIEditorProps {
  token: string;
  variantIndex: number;
  onHtmlUpdate: (html: string) => void;
  onUndoRequest: () => void;
  canUndo: boolean;
}

export default function AIEditor({
  token,
  variantIndex,
  onHtmlUpdate,
  onUndoRequest,
  canUndo,
}: AIEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<EditHistoryEntry[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "Change the primary color to navy blue",
    "Make the hero section taller with a gradient background",
    "Add a contact form section before the footer",
    "Increase the font size of headings",
    "Make the navigation sticky on scroll",
    "Add hover animations to the service cards",
  ];

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [history]);

  const handleSubmit = useCallback(async (text?: string) => {
    const inst = text || instruction;
    if (!inst.trim() || isLoading) return;

    setIsLoading(true);
    setInstruction("");

    try {
      const res = await fetch(`/api/analyze/${token}/edit/${variantIndex}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: inst.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setHistory((h) => [
          ...h,
          {
            instruction: inst.trim(),
            timestamp: new Date(),
            status: "error",
            errorMessage: data.error || "Failed to apply edit",
          },
        ]);
        return;
      }

      setHistory((h) => [
        ...h,
        { instruction: inst.trim(), timestamp: new Date(), status: "success" },
      ]);
      onHtmlUpdate(data.html);
    } catch {
      setHistory((h) => [
        ...h,
        {
          instruction: inst.trim(),
          timestamp: new Date(),
          status: "error",
          errorMessage: "Network error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [instruction, isLoading, token, variantIndex, onHtmlUpdate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full shadow-2xl shadow-purple-500/25 text-white font-medium text-sm transition-all hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%)",
        }}
      >
        <Wand2 className="h-4 w-4" />
        AI Editor
      </button>
    );
  }

  return (
    <div
      className="fixed right-0 top-0 bottom-0 z-50 flex flex-col shadow-2xl shadow-black/40 border-l border-white/10"
      style={{
        width: "380px",
        background: "linear-gradient(180deg, rgba(15, 15, 25, 0.98) 0%, rgba(10, 10, 20, 0.99) 100%)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div
            className="p-1.5 rounded-lg"
            style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)" }}
          >
            <Wand2 className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm text-white">AI Editor</span>
        </div>
        <div className="flex items-center gap-1">
          {canUndo && (
            <button
              onClick={onUndoRequest}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              title="Undo last edit"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* History / Empty State */}
      <div ref={historyRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {history.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-6">
              <div
                className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #7c3aed20, #5b21b620)" }}
              >
                <Wand2 className="h-6 w-6 text-purple-400" />
              </div>
              <p className="text-sm text-gray-300 font-medium">
                Describe what you want to change
              </p>
              <p className="text-xs text-gray-500 mt-1">
                The AI will modify the HTML of this variant
              </p>
            </div>

            {/* Suggestions */}
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium px-1">
                Suggestions
              </p>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(s)}
                  disabled={isLoading}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2 group disabled:opacity-50"
                >
                  <ChevronRight className="h-3 w-3 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  <span>{s}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          history.map((entry, i) => (
            <div key={i} className="space-y-1">
              {/* User instruction */}
              <div className="flex justify-end">
                <div className="max-w-[85%] px-3 py-2 rounded-xl rounded-br-sm text-xs text-white bg-purple-600/40 border border-purple-500/20">
                  {entry.instruction}
                </div>
              </div>
              {/* Status */}
              <div className="flex items-start gap-1.5">
                {entry.status === "success" ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Applied successfully</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-1.5 px-2 py-1 rounded-lg text-xs text-red-400 max-w-[85%]">
                    <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <span>{entry.errorMessage}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-2 px-2 py-1 text-xs text-purple-300">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Applying changes...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-white/10">
        {history.length > 0 && (
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs text-gray-500">
              {history.filter((h) => h.status === "success").length} edit{history.filter((h) => h.status === "success").length !== 1 ? "s" : ""} applied
            </span>
            {history.some((h) => h.status === "error") && (
              <button
                onClick={() => {
                  const lastFailed = [...history].reverse().find((h) => h.status === "error");
                  if (lastFailed) {
                    setInstruction(lastFailed.instruction);
                    textareaRef.current?.focus();
                  }
                }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Retry
              </button>
            )}
          </div>
        )}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your change..."
            disabled={isLoading}
            rows={2}
            className="w-full resize-none rounded-xl px-3 py-2.5 pr-10 text-sm text-white placeholder-gray-500 border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/25 transition-colors disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!instruction.trim() || isLoading}
            className="absolute right-2 bottom-2.5 p-1.5 rounded-lg transition-all disabled:opacity-30"
            style={{
              background: instruction.trim() && !isLoading ? "linear-gradient(135deg, #7c3aed, #5b21b6)" : "transparent",
            }}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 text-purple-300 animate-spin" />
            ) : (
              <Send className="h-4 w-4 text-white" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5 px-1">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
