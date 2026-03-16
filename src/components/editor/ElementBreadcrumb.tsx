"use client";

import { ChevronRight } from "lucide-react";

interface ElementBreadcrumbProps {
  cssPath: string;
  onSelectSegment: (cssPath: string) => void;
}

export default function ElementBreadcrumb({
  cssPath,
  onSelectSegment,
}: ElementBreadcrumbProps) {
  if (!cssPath) return null;

  // Parse CSS path into segments
  const segments = cssPath.split(" > ").map((seg) => {
    // Extract tag and class info for display
    const match = seg.match(/^([a-z0-9#]+)(?::nth-of-type\(\d+\))?/);
    return {
      raw: seg,
      label: match ? match[1] : seg,
    };
  });

  return (
    <div
      className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[9997] flex items-center gap-0.5 rounded-full px-3 py-1.5 shadow-xl shadow-black/30 border border-white/10"
      style={{
        background: "rgba(15, 15, 25, 0.95)",
        backdropFilter: "blur(16px)",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      }}
    >
      {segments.map((seg, i) => {
        // Build the CSS path up to this segment
        const partialPath = segments
          .slice(0, i + 1)
          .map((s) => s.raw)
          .join(" > ");

        return (
          <span key={i} className="flex items-center">
            {i > 0 && (
              <ChevronRight className="h-3 w-3 text-gray-600 mx-0.5 flex-shrink-0" />
            )}
            <button
              onClick={() => onSelectSegment(partialPath)}
              className={`text-[11px] px-1 py-0.5 rounded transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 ${
                i === segments.length - 1
                  ? "text-indigo-400 font-medium"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {seg.label}
            </button>
          </span>
        );
      })}
    </div>
  );
}
