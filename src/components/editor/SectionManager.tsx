"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import type { EditorMode } from "@/lib/visual-editor/messages";

interface SectionManagerProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  editorMode: EditorMode;
}

interface SectionInfo {
  index: number;
  tag: string;
  label: string;
  rect: { top: number; height: number };
}

export default function SectionManager({
  iframeRef,
  editorMode,
}: SectionManagerProps) {
  const [sections, setSections] = useState<SectionInfo[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [iframeTop, setIframeTop] = useState(0);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scan sections in iframe
  const scanSections = useCallback(() => {
    if (editorMode === "browse") return [];
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return [];

      const iRect = iframeRef.current?.getBoundingClientRect();
      if (iRect) setIframeTop(iRect.top);

      const sectionEls = doc.querySelectorAll(
        "body > section, body > header, body > main, body > footer, body > nav"
      );

      const infos: SectionInfo[] = [];
      sectionEls.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        const heading = el.querySelector("h1, h2, h3");
        const label =
          heading?.textContent?.substring(0, 30) ||
          el.tagName.toLowerCase() + (el.id ? `#${el.id}` : "");
        infos.push({
          index: i,
          tag: el.tagName.toLowerCase(),
          label,
          rect: { top: rect.top, height: rect.height },
        });
      });
      return infos;
    } catch {
      return [];
    }
  }, [iframeRef, editorMode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- polling external iframe DOM state is a valid effect side-effect
    setSections(scanSections());
    const interval = setInterval(() => setSections(scanSections()), 2000);
    return () => clearInterval(interval);
  }, [scanSections]);

  // Clean up pending scan timeout on unmount
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current !== null) clearTimeout(scanTimeoutRef.current);
    };
  }, []);

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      iframeRef.current?.contentWindow?.postMessage(
        { type: "wf-cmd-reorder-section", fromIndex: index, toIndex: index - 1 },
        window.location.origin
      );
      if (scanTimeoutRef.current !== null) clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = setTimeout(() => setSections(scanSections()), 200);
    },
    [iframeRef, scanSections]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= sections.length - 1) return;
      iframeRef.current?.contentWindow?.postMessage(
        { type: "wf-cmd-reorder-section", fromIndex: index, toIndex: index + 1 },
        window.location.origin
      );
      if (scanTimeoutRef.current !== null) clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = setTimeout(() => setSections(scanSections()), 200);
    },
    [iframeRef, sections.length, scanSections]
  );

  if (editorMode === "browse" || sections.length === 0) return null;

  return (
    <>
      {sections.map((section) => (
        <div
          key={section.index}
          className="fixed z-[9995] transition-opacity duration-200"
          style={{
            top: `${iframeTop + section.rect.top + section.rect.height / 2 - 16}px`,
            left: "8px",
            opacity: hoveredIndex === section.index ? 1 : 0,
          }}
          onMouseEnter={() => setHoveredIndex(section.index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Invisible hover target area */}
          <div
            className="absolute -inset-4"
            onMouseEnter={() => setHoveredIndex(section.index)}
          />

          {/* Control buttons */}
          <div
            className="relative flex flex-col gap-0.5 p-0.5 rounded-lg shadow-lg border border-white/10"
            style={{
              background: "rgba(15, 15, 25, 0.95)",
              backdropFilter: "blur(12px)",
            }}
          >
            <button
              onClick={() => handleMoveUp(section.index)}
              disabled={section.index === 0}
              className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-20 transition-colors"
              title="Move section up"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <div className="px-1 text-gray-600 cursor-grab">
              <GripVertical className="h-3 w-3" />
            </div>
            <button
              onClick={() => handleMoveDown(section.index)}
              disabled={section.index === sections.length - 1}
              className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-20 transition-colors"
              title="Move section down"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}

      {/* Section label tooltips on hover */}
      {hoveredIndex !== null && sections[hoveredIndex] && (
        <div
          className="fixed z-[9996] px-2 py-1 rounded-md text-[10px] text-white font-mono shadow-lg border border-white/10"
          style={{
            top: `${iframeTop + sections[hoveredIndex].rect.top + sections[hoveredIndex].rect.height / 2 - 10}px`,
            left: "52px",
            background: "rgba(15, 15, 25, 0.95)",
          }}
        >
          {sections[hoveredIndex].label}
        </div>
      )}
    </>
  );
}
