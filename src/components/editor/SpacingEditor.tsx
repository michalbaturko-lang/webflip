"use client";

import { useState, useCallback } from "react";

interface SpacingEditorProps {
  margin: string;
  padding: string;
  onMarginChange: (side: string, value: string) => void;
  onPaddingChange: (side: string, value: string) => void;
}

function parseSpacing(value: string): { top: string; right: string; bottom: string; left: string } {
  const parts = value.replace(/px/g, "").trim().split(/\s+/);
  if (parts.length === 1) {
    return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
  }
  if (parts.length === 2) {
    return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
  }
  if (parts.length === 3) {
    return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
  }
  return { top: parts[0] || "0", right: parts[1] || "0", bottom: parts[2] || "0", left: parts[3] || "0" };
}

function SpacingInput({
  value,
  onChange,
  position,
}: {
  value: string;
  onChange: (v: string) => void;
  position: "top" | "right" | "bottom" | "left";
}) {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const handleClick = useCallback(() => {
    setTempValue(value);
    setEditing(true);
  }, [value]);

  const handleBlur = useCallback(() => {
    setEditing(false);
    const num = parseInt(tempValue);
    if (!isNaN(num)) onChange(`${num}px`);
  }, [tempValue, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        (e.target as HTMLInputElement).blur();
      }
      if (e.key === "Escape") {
        setEditing(false);
      }
    },
    []
  );

  const posStyles: Record<string, string> = {
    top: "top-0.5 left-1/2 -translate-x-1/2",
    right: "right-0.5 top-1/2 -translate-y-1/2",
    bottom: "bottom-0.5 left-1/2 -translate-x-1/2",
    left: "left-0.5 top-1/2 -translate-y-1/2",
  };

  return (
    <div className={`absolute ${posStyles[position]}`}>
      {editing ? (
        <input
          type="text"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-8 text-center text-[9px] bg-white/10 border border-indigo-500/50 rounded px-0.5 py-0 text-white focus:outline-none"
        />
      ) : (
        <button
          onClick={handleClick}
          className="text-[9px] text-gray-400 hover:text-white transition-colors px-0.5 min-w-[16px] text-center"
        >
          {parseInt(value) || 0}
        </button>
      )}
    </div>
  );
}

export default function SpacingEditor({
  margin,
  padding,
  onMarginChange,
  onPaddingChange,
}: SpacingEditorProps) {
  const m = parseSpacing(margin);
  const p = parseSpacing(padding);

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] text-gray-500 uppercase tracking-wider">
        Spacing
      </label>

      {/* Visual box model */}
      <div className="relative mx-auto" style={{ width: "180px", height: "130px" }}>
        {/* Margin box */}
        <div
          className="absolute inset-0 rounded-lg border border-dashed border-orange-500/40"
          style={{ background: "rgba(249, 115, 22, 0.06)" }}
        >
          <span className="absolute -top-3 left-1 text-[8px] text-orange-400/60">margin</span>
          <SpacingInput value={m.top} onChange={(v) => onMarginChange("marginTop", v)} position="top" />
          <SpacingInput value={m.right} onChange={(v) => onMarginChange("marginRight", v)} position="right" />
          <SpacingInput value={m.bottom} onChange={(v) => onMarginChange("marginBottom", v)} position="bottom" />
          <SpacingInput value={m.left} onChange={(v) => onMarginChange("marginLeft", v)} position="left" />
        </div>

        {/* Padding box */}
        <div
          className="absolute rounded border border-dashed border-green-500/40"
          style={{
            top: "20px",
            left: "20px",
            right: "20px",
            bottom: "20px",
            background: "rgba(34, 197, 94, 0.06)",
          }}
        >
          <span className="absolute -top-3 left-1 text-[8px] text-green-400/60">padding</span>
          <SpacingInput value={p.top} onChange={(v) => onPaddingChange("paddingTop", v)} position="top" />
          <SpacingInput value={p.right} onChange={(v) => onPaddingChange("paddingRight", v)} position="right" />
          <SpacingInput value={p.bottom} onChange={(v) => onPaddingChange("paddingBottom", v)} position="bottom" />
          <SpacingInput value={p.left} onChange={(v) => onPaddingChange("paddingLeft", v)} position="left" />
        </div>

        {/* Content box */}
        <div
          className="absolute rounded border border-blue-500/30 flex items-center justify-center"
          style={{
            top: "40px",
            left: "40px",
            right: "40px",
            bottom: "40px",
            background: "rgba(59, 130, 246, 0.08)",
          }}
        >
          <span className="text-[8px] text-blue-400/50">content</span>
        </div>
      </div>
    </div>
  );
}
