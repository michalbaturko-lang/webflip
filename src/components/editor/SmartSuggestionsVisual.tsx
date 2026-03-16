"use client";

import { useMemo } from "react";
import type { ElementInfo } from "@/lib/visual-editor/messages";

interface SmartSuggestionsVisualProps {
  element: ElementInfo;
  onStyleChange: (property: string, value: string) => void;
  onAIEdit: () => void;
}

interface Chip {
  label: string;
  action: () => void;
  isAI?: boolean;
}

export default function SmartSuggestionsVisual({
  element,
  onStyleChange,
  onAIEdit,
}: SmartSuggestionsVisualProps) {
  const chips = useMemo((): Chip[] => {
    const tag = element.tag;
    const result: Chip[] = [];

    // Text elements
    if (["h1","h2","h3","h4","h5","h6","p","span","a","button","li","label","blockquote"].includes(tag)) {
      result.push(
        { label: "Shorten", action: onAIEdit, isAI: true },
        { label: "Rewrite", action: onAIEdit, isAI: true },
        { label: "Bold", action: () => onStyleChange("fontWeight", "700") },
        { label: "Larger", action: () => {
          const size = parseInt(element.computedStyles.fontSize || "16");
          onStyleChange("fontSize", `${Math.min(size + 4, 96)}px`);
        }},
        { label: "Smaller", action: () => {
          const size = parseInt(element.computedStyles.fontSize || "16");
          onStyleChange("fontSize", `${Math.max(size - 4, 8)}px`);
        }},
      );
    }

    // Images
    if (tag === "img") {
      result.push(
        { label: "Add shadow", action: () => onStyleChange("boxShadow", "0 10px 30px rgba(0,0,0,0.3)") },
        { label: "Round corners", action: () => onStyleChange("borderRadius", "12px") },
        { label: "Add border", action: () => { onStyleChange("border", "2px solid rgba(255,255,255,0.1)"); } },
        { label: "Make circular", action: () => onStyleChange("borderRadius", "50%") },
      );
    }

    // Buttons/CTAs
    if (tag === "button" || tag === "a") {
      result.push(
        { label: "Make larger", action: () => { onStyleChange("padding", "16px 32px"); onStyleChange("fontSize", "18px"); }},
        { label: "Enhance", action: onAIEdit, isAI: true },
      );
    }

    // Sections
    if (["section","div","header","footer","nav"].includes(tag)) {
      result.push(
        { label: "More padding", action: () => onStyleChange("padding", "48px 24px") },
        { label: "Enhance", action: onAIEdit, isAI: true },
      );
    }

    return result;
  }, [element, onStyleChange, onAIEdit]);

  if (chips.length === 0) return null;

  return (
    <div
      className="fixed right-4 top-20 z-[9996] flex flex-wrap gap-1.5 max-w-[240px] p-2 rounded-xl shadow-xl shadow-black/30 border border-white/10"
      style={{
        background: "rgba(15, 15, 25, 0.95)",
        backdropFilter: "blur(16px)",
      }}
    >
      {chips.map((chip) => (
        <button
          key={chip.label}
          onClick={chip.action}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all hover:brightness-110 active:scale-95 ${
            chip.isAI
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30"
              : "bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10"
          }`}
        >
          {chip.isAI && "✦ "}{chip.label}
        </button>
      ))}
    </div>
  );
}
