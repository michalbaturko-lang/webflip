"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, X } from "lucide-react";
import type { ElementInfo } from "@/lib/visual-editor/messages";

interface AIContextMenuProps {
  element: ElementInfo;
  token: string;
  variantIndex: number;
  onResult: (newHtml: string) => void;
  onClose: () => void;
}

export default function AIContextMenu({
  element,
  token,
  variantIndex,
  onResult,
  onClose,
}: AIContextMenuProps) {
  const [instruction, setInstruction] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const contextLabel = `<${element.tag}> '${element.textContent.substring(0, 40)}${element.textContent.length > 40 ? "..." : ""}'`;

  const handleSubmit = async () => {
    if (!instruction.trim() || isLoading) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/analyze/${token}/edit/element`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: instruction.trim(),
          elementPath: element.cssPath,
          elementHtml: element.outerHTML,
          variantIndex,
          context: {
            tag: element.tag,
            parentTag: element.parentTag,
            computedStyles: element.computedStyles,
          },
        }),
        signal: controller.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to apply AI edit");
        return;
      }

      if (data.html) {
        onResult(data.html);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      className="fixed right-4 top-20 z-[9998] w-[320px] rounded-2xl shadow-2xl shadow-black/50 border border-white/10 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, rgba(15, 15, 25, 0.98) 0%, rgba(10, 10, 20, 0.99) 100%)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span className="text-xs font-medium text-white">AI Edit</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Context */}
        <div className="px-2 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          <span className="text-[10px] text-indigo-400 font-mono leading-relaxed">
            Selected: {contextLabel}
          </span>
        </div>

        {/* Instruction input */}
        <div className="relative">
          <textarea
            ref={inputRef}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. make it bigger and bolder"
            disabled={isLoading}
            rows={2}
            className="w-full resize-none rounded-xl px-3 py-2.5 pr-10 text-sm text-white placeholder-gray-500 border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/25 transition-colors disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />
          <button
            onClick={handleSubmit}
            disabled={!instruction.trim() || isLoading}
            className="absolute right-2 bottom-2.5 p-1.5 rounded-lg transition-all disabled:opacity-30"
            style={{
              background: instruction.trim() && !isLoading
                ? "linear-gradient(135deg, #7c3aed, #5b21b6)"
                : "transparent",
            }}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 text-purple-300 animate-spin" />
            ) : (
              <Send className="h-4 w-4 text-white" />
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-[11px] text-red-400 px-1">{error}</p>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 px-1">
            <Loader2 className="h-3 w-3 text-purple-400 animate-spin" />
            <span className="text-[11px] text-purple-300">Editing element with AI...</span>
          </div>
        )}
      </div>
    </div>
  );
}
