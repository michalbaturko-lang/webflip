"use client";

import { useRef, useMemo } from "react";
import {
  Type,
  Palette,
  ImageIcon,
  Sparkles,
  Copy,
  Trash2,
} from "lucide-react";
import type { ElementInfo } from "@/lib/visual-editor/messages";

interface FloatingToolbarProps {
  element: ElementInfo | null;
  iframeRect: DOMRect | null;
  scaleFactor: number;
  onEditText: () => void;
  onEditStyle: () => void;
  onReplaceImage: () => void;
  onAIEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export default function FloatingToolbar({
  element,
  iframeRect,
  scaleFactor,
  onEditText,
  onEditStyle,
  onReplaceImage,
  onAIEdit,
  onDuplicate,
  onDelete,
}: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  const position = useMemo(() => {
    if (!element || !iframeRect) return null;

    const er = element.boundingRect;
    const toolbarHeight = 40;
    const toolbarWidth = 260;

    let top = iframeRect.top + er.top * scaleFactor - toolbarHeight - 8;
    let left = iframeRect.left + er.left * scaleFactor + (er.width * scaleFactor) / 2 - toolbarWidth / 2;

    if (top < 8) {
      top = iframeRect.top + (er.top + er.height) * scaleFactor + 8;
    }

    left = Math.max(8, Math.min(left, window.innerWidth - toolbarWidth - 8));

    return { top, left };
  }, [element, iframeRect, scaleFactor]);

  if (!element || !position) return null;

  const isImage = element.isImage;
  const isText = ["h1","h2","h3","h4","h5","h6","p","span","a","button","li","td","th","label","blockquote"].includes(element.tag);

  const BTN = "p-1.5 rounded-lg hover:bg-white/15 transition-colors text-gray-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";

  return (
    <div
      ref={toolbarRef}
      className="fixed z-[9998] flex items-center gap-0.5 rounded-xl px-1.5 py-1 shadow-2xl shadow-black/50 border border-white/15 animate-in fade-in slide-in-from-bottom-1 duration-200"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        background: "linear-gradient(180deg, rgba(30, 30, 50, 0.97) 0%, rgba(20, 20, 38, 0.99) 100%)",
        backdropFilter: "blur(20px)",
      }}
    >
      {isText && (
        <button onClick={onEditText} className={BTN} title="Edit Text">
          <Type className="h-4 w-4" />
        </button>
      )}

      <button onClick={onEditStyle} className={BTN} title="Style">
        <Palette className="h-4 w-4" />
      </button>

      {isImage && (
        <button onClick={onReplaceImage} className={BTN} title="Replace Image">
          <ImageIcon className="h-4 w-4" />
        </button>
      )}

      <button onClick={onAIEdit} className={BTN} title="AI Edit">
        <Sparkles className="h-4 w-4 text-purple-400" />
      </button>

      <div className="w-px h-5 bg-white/10 mx-0.5" />

      <button onClick={onDuplicate} className={BTN} title="Duplicate">
        <Copy className="h-3.5 w-3.5" />
      </button>

      <button onClick={onDelete} className={`${BTN} hover:text-red-400`} title="Delete">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
