"use client";

import { useState } from "react";
import { Monitor, Smartphone, Eye } from "lucide-react";
import { motion } from "framer-motion";
import RecommendBadge, { type RecommendBadgeProps } from "./RecommendBadge";

type ViewMode = "desktop" | "mobile";

interface Variant {
  name: string;
  description: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    text: string;
  };
  typography: { heading: string; body: string };
  layout: string;
  keyFeatures: string[];
}

interface VariantCardProps {
  variant: Variant;
  index: number;
  token: string;
  recommendation?: RecommendBadgeProps | null;
  onSelect?: (index: number) => void;
}

export default function VariantCard({
  variant,
  index,
  token,
  recommendation,
  onSelect,
}: VariantCardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");

  const iframeSrc = `/api/analyze/${token}/preview/${index}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className="glass rounded-2xl overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300 group relative"
    >
      {/* AI doporučení badge */}
      {recommendation && (
        <div className="absolute top-3 left-3 z-10">
          <RecommendBadge {...recommendation} />
        </div>
      )}

      {/* Viewport toggle */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 glass rounded-full px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setViewMode("desktop")}
          className={`p-1 rounded-full transition-colors ${
            viewMode === "desktop"
              ? "bg-blue-500/20 text-blue-400"
              : "text-gray-400 hover:text-white"
          }`}
          title="Desktop"
        >
          <Monitor className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setViewMode("mobile")}
          className={`p-1 rounded-full transition-colors ${
            viewMode === "mobile"
              ? "bg-blue-500/20 text-blue-400"
              : "text-gray-400 hover:text-white"
          }`}
          title="Mobil"
        >
          <Smartphone className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Iframe Preview */}
      <div
        className="relative w-full overflow-hidden bg-gray-900/50"
        style={{ height: "300px" }}
      >
        {viewMode === "desktop" ? (
          <iframe
            src={iframeSrc}
            title={variant.name}
            className="absolute top-0 left-0 border-0"
            style={{
              width: "1280px",
              height: "960px",
              transform: "scale(0.3)",
              transformOrigin: "top left",
              pointerEvents: "none",
            }}
            loading="lazy"
            sandbox="allow-same-origin"
          />
        ) : (
          <div className="flex items-start justify-center pt-2 h-full">
            <iframe
              src={iframeSrc}
              title={variant.name}
              className="border-0 rounded-lg"
              style={{
                width: "375px",
                height: "667px",
                transform: "scale(0.42)",
                transformOrigin: "top center",
                pointerEvents: "none",
              }}
              loading="lazy"
              sandbox="allow-same-origin"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Palette preview */}
        <div className="flex items-center gap-1.5">
          {[
            variant.palette.primary,
            variant.palette.secondary,
            variant.palette.accent,
          ].map((color, i) => (
            <div
              key={i}
              className="h-4 w-4 rounded-full border border-white/10"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          <span
            className="text-[10px] ml-1"
            style={{ color: "var(--text-faint)" }}
          >
            {variant.typography.heading}
          </span>
        </div>

        <div>
          <h3
            className="font-bold text-base mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            {variant.name}
          </h3>
          <p
            className="text-xs leading-relaxed line-clamp-2"
            style={{ color: "var(--text-muted)" }}
          >
            {variant.description}
          </p>
        </div>

        {/* Key features */}
        <div className="flex flex-wrap gap-1">
          {variant.keyFeatures.slice(0, 3).map((feature, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded-full border border-white/10"
              style={{ color: "var(--text-muted)" }}
            >
              {feature}
            </span>
          ))}
        </div>

        <button
          onClick={() => onSelect?.(index)}
          className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-400 transition-all cursor-pointer"
        >
          <Eye className="h-4 w-4" />
          Zobrazit celý web
        </button>
      </div>
    </motion.div>
  );
}
