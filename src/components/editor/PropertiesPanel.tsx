"use client";

import { useState } from "react";
import { X, ChevronDown, ChevronRight, Save } from "lucide-react";
import type { ElementInfo } from "@/lib/visual-editor/messages";
import ColorPicker, { rgbToHex } from "./ColorPicker";
import SpacingEditor from "./SpacingEditor";

interface PropertiesPanelProps {
  element: ElementInfo;
  onStyleChange: (property: string, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

const FONT_FAMILIES = [
  "inherit",
  "Inter, sans-serif",
  "Roboto, sans-serif",
  "Open Sans, sans-serif",
  "Lato, sans-serif",
  "Poppins, sans-serif",
  "Montserrat, sans-serif",
  "Playfair Display, serif",
  "Merriweather, serif",
  "Georgia, serif",
  "system-ui, sans-serif",
  "monospace",
];

const FONT_WEIGHTS = ["300", "400", "500", "600", "700", "800", "900"];
const TEXT_ALIGNS = ["left", "center", "right", "justify"];

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({ title, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full px-3 py-2 text-[11px] font-medium text-gray-400 hover:text-white transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {title}
      </button>
      {open && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  );
}

function SliderInput({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  unit = "px",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  unit?: string;
}) {
  const numValue = parseInt(value) || 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] text-gray-500">{label}</label>
        <span className="text-[10px] text-gray-400 font-mono">
          {numValue}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={numValue}
        onChange={(e) => onChange(`${e.target.value}${unit}`)}
        className="w-full h-1 rounded-full appearance-none cursor-pointer accent-indigo-500"
        style={{ background: "rgba(255,255,255,0.1)" }}
      />
    </div>
  );
}

export default function PropertiesPanel({
  element,
  onStyleChange,
  onClose,
  onSave,
}: PropertiesPanelProps) {
  const cs = element.computedStyles;
  const isText = ["h1","h2","h3","h4","h5","h6","p","span","a","button","li","label","blockquote"].includes(element.tag);

  return (
    <div
      className="fixed right-4 top-20 bottom-20 z-[9997] w-[280px] rounded-2xl shadow-2xl shadow-black/50 border border-white/10 overflow-hidden flex flex-col"
      style={{
        background: "linear-gradient(180deg, rgba(15, 15, 25, 0.98) 0%, rgba(10, 10, 20, 0.99) 100%)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
            {element.tag}
          </span>
          <span className="text-xs font-medium text-white">Properties</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onSave}
            title="Save changes"
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-emerald-400 hover:text-emerald-300"
          >
            <Save className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Typography */}
        {isText && (
          <Section title="Typography">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Font Family</label>
              <select
                value={cs.fontFamily?.split(",")[0]?.replace(/['"]/g, "").trim() || "inherit"}
                onChange={(e) => onStyleChange("fontFamily", e.target.value)}
                className="w-full text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-indigo-500/50"
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f} value={f} className="bg-gray-900">
                    {f.split(",")[0]}
                  </option>
                ))}
              </select>
            </div>

            <SliderInput
              label="Font Size"
              value={cs.fontSize || "16px"}
              onChange={(v) => onStyleChange("fontSize", v)}
              min={8}
              max={96}
            />

            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Weight</label>
              <div className="flex gap-1 flex-wrap">
                {FONT_WEIGHTS.map((w) => (
                  <button
                    key={w}
                    onClick={() => onStyleChange("fontWeight", w)}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                      cs.fontWeight === w
                        ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/40"
                        : "bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <ColorPicker
              label="Text Color"
              color={cs.color || "#000000"}
              onChange={(c) => onStyleChange("color", c)}
            />

            <SliderInput
              label="Line Height"
              value={cs.lineHeight || "1.5"}
              onChange={(v) => onStyleChange("lineHeight", v)}
              min={8}
              max={60}
            />

            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Align</label>
              <div className="flex gap-1">
                {TEXT_ALIGNS.map((a) => (
                  <button
                    key={a}
                    onClick={() => onStyleChange("textAlign", a)}
                    className={`flex-1 px-2 py-1 rounded text-[10px] capitalize transition-colors ${
                      cs.textAlign === a
                        ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/40"
                        : "bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* Background */}
        <Section title="Background" defaultOpen={!isText}>
          <ColorPicker
            label="Background Color"
            color={cs.backgroundColor || "transparent"}
            onChange={(c) => onStyleChange("backgroundColor", c)}
          />
        </Section>

        {/* Spacing */}
        <Section title="Spacing" defaultOpen={false}>
          <SpacingEditor
            margin={cs.margin || "0"}
            padding={cs.padding || "0"}
            onMarginChange={(prop, val) => onStyleChange(prop, val)}
            onPaddingChange={(prop, val) => onStyleChange(prop, val)}
          />
        </Section>

        {/* Border */}
        <Section title="Border" defaultOpen={false}>
          <SliderInput
            label="Border Width"
            value={cs.borderWidth || "0px"}
            onChange={(v) => onStyleChange("borderWidth", v)}
            min={0}
            max={20}
          />
          <ColorPicker
            label="Border Color"
            color={cs.borderColor || "#000000"}
            onChange={(c) => onStyleChange("borderColor", c)}
          />
          <SliderInput
            label="Border Radius"
            value={cs.borderRadius || "0px"}
            onChange={(v) => onStyleChange("borderRadius", v)}
            min={0}
            max={50}
          />
        </Section>

        {/* Size */}
        <Section title="Size" defaultOpen={false}>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Width</label>
            <input
              type="text"
              value={cs.width || "auto"}
              onChange={(e) => onStyleChange("width", e.target.value)}
              className="w-full text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-white font-mono focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Height</label>
            <input
              type="text"
              value={cs.height || "auto"}
              onChange={(e) => onStyleChange("height", e.target.value)}
              className="w-full text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-white font-mono focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Max Width</label>
            <input
              type="text"
              value={cs.maxWidth || "none"}
              onChange={(e) => onStyleChange("maxWidth", e.target.value)}
              className="w-full text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-white font-mono focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
