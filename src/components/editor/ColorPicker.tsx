"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
}

const RECENT_COLORS_KEY = "wf-recent-colors";
const MAX_RECENT = 8;

function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return rgb.startsWith("#") ? rgb : "#000000";
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function getRecentColors(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_COLORS_KEY) || "[]");
  } catch {
    return [];
  }
}

function addRecentColor(color: string) {
  try {
    const recent = getRecentColors().filter((c) => c !== color);
    recent.unshift(color);
    localStorage.setItem(
      RECENT_COLORS_KEY,
      JSON.stringify(recent.slice(0, MAX_RECENT))
    );
  } catch {
    // ignore
  }
}

export default function ColorPicker({ color, onChange, label }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recentVersion, setRecentVersion] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const hexColor = rgbToHex(color);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recentColors = useMemo(() => getRecentColors(), [isOpen, recentVersion]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const handleChange = (newColor: string) => {
    onChange(newColor);
  };

  const handleComplete = (newColor: string) => {
    addRecentColor(newColor);
    setRecentVersion((v) => v + 1);
  };

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">
          {label}
        </label>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors w-full"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        <div
          className="w-5 h-5 rounded border border-white/20 flex-shrink-0"
          style={{ background: hexColor }}
        />
        <span className="text-xs text-gray-300 font-mono">{hexColor}</span>
      </button>

      {isOpen && (
        <div
          className="absolute bottom-full mb-2 left-0 z-[9999] rounded-xl p-3 shadow-2xl shadow-black/50 border border-white/15"
          style={{
            background: "rgba(20, 20, 35, 0.98)",
            backdropFilter: "blur(20px)",
          }}
        >
          <HexColorPicker
            color={hexColor}
            onChange={handleChange}
            onMouseUp={() => handleComplete(hexColor)}
            style={{ width: "180px", height: "140px" }}
          />
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500">#</span>
            <HexColorInput
              color={hexColor}
              onChange={handleChange}
              onBlur={() => handleComplete(hexColor)}
              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          {recentColors.length > 0 && (
            <div className="mt-2">
              <span className="text-[9px] text-gray-600 uppercase tracking-wider">
                Recent
              </span>
              <div className="flex gap-1 mt-1 flex-wrap">
                {recentColors.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      onChange(c);
                    }}
                    className="w-5 h-5 rounded border border-white/20 hover:ring-1 hover:ring-indigo-400 transition-all"
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { rgbToHex };
