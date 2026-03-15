"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface InlineEditorProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onEditApplied: (instruction: string) => void;
  enabled: boolean;
}

export default function InlineEditor({
  iframeRef,
  onEditApplied,
  enabled,
}: InlineEditorProps) {
  const [editingElement, setEditingElement] = useState<{
    selector: string;
    originalText: string;
    rect: DOMRect;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Inject inline editing styles and handlers into iframe
  useEffect(() => {
    if (!enabled || !iframeRef.current) return;

    const iframe = iframeRef.current;

    const setupInlineEdit = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;

        // Inject hover styles
        const styleId = "webflip-inline-edit-styles";
        if (!doc.getElementById(styleId)) {
          const style = doc.createElement("style");
          style.id = styleId;
          style.textContent = `
            .webflip-editable-hover {
              outline: 2px solid #3b82f6 !important;
              outline-offset: 2px !important;
              cursor: text !important;
              transition: outline 0.15s ease !important;
            }
            .webflip-editable-hover::after {
              content: 'Klikni pro editaci' !important;
              position: absolute !important;
              top: -24px !important;
              left: 0 !important;
              background: #3b82f6 !important;
              color: white !important;
              font-size: 10px !important;
              padding: 2px 6px !important;
              border-radius: 3px !important;
              pointer-events: none !important;
              z-index: 99999 !important;
              font-family: system-ui, sans-serif !important;
              white-space: nowrap !important;
            }
          `;
          doc.head.appendChild(style);
        }

        // Editable text tags
        const editableTags = new Set([
          "H1", "H2", "H3", "H4", "H5", "H6",
          "P", "SPAN", "A", "LI", "TD", "TH",
          "LABEL", "BUTTON", "STRONG", "EM", "B", "I",
        ]);

        const isEditableText = (el: Element): boolean => {
          if (!editableTags.has(el.tagName)) return false;
          const text = el.textContent?.trim() || "";
          return text.length > 0 && text.length < 500;
        };

        // Generate a unique CSS selector for an element
        const getSelector = (el: Element): string => {
          if (el.id) return `#${el.id}`;
          const path: string[] = [];
          let current: Element | null = el;
          while (current && current !== doc.body) {
            let selector = current.tagName.toLowerCase();
            if (current.id) {
              path.unshift(`#${current.id}`);
              break;
            }
            const parent = current.parentElement;
            if (parent) {
              const siblings = Array.from(parent.children).filter(
                (c) => c.tagName === current!.tagName
              );
              if (siblings.length > 1) {
                const idx = siblings.indexOf(current) + 1;
                selector += `:nth-of-type(${idx})`;
              }
            }
            path.unshift(selector);
            current = current.parentElement;
          }
          return path.join(" > ");
        };

        // Mouse handlers
        const handleMouseOver = (e: MouseEvent) => {
          const target = e.target as Element;
          if (isEditableText(target)) {
            target.classList.add("webflip-editable-hover");
            target.style.position = target.style.position || "relative";
          }
        };

        const handleMouseOut = (e: MouseEvent) => {
          const target = e.target as Element;
          target.classList.remove("webflip-editable-hover");
        };

        const handleClick = (e: MouseEvent) => {
          const target = e.target as Element;
          if (!isEditableText(target)) return;
          e.preventDefault();
          e.stopPropagation();

          const iframeRect = iframe.getBoundingClientRect();
          const elRect = target.getBoundingClientRect();

          // Offset rect to page coordinates
          const adjustedRect = new DOMRect(
            iframeRect.left + elRect.left,
            iframeRect.top + elRect.top,
            elRect.width,
            elRect.height
          );

          const text = target.textContent?.trim() || "";
          const selector = getSelector(target);

          // Post message to parent
          window.parent.postMessage(
            {
              type: "webflip-inline-edit",
              selector,
              text,
              rect: {
                left: adjustedRect.left,
                top: adjustedRect.top,
                width: adjustedRect.width,
                height: adjustedRect.height,
              },
            },
            "*"
          );
        };

        doc.body.addEventListener("mouseover", handleMouseOver, true);
        doc.body.addEventListener("mouseout", handleMouseOut, true);
        doc.body.addEventListener("click", handleClick, true);

        return () => {
          doc.body.removeEventListener("mouseover", handleMouseOver, true);
          doc.body.removeEventListener("mouseout", handleMouseOut, true);
          doc.body.removeEventListener("click", handleClick, true);
        };
      } catch {
        // Cross-origin fallback - ignore
      }
    };

    // Setup on load
    iframe.addEventListener("load", setupInlineEdit);
    const cleanup = setupInlineEdit();

    return () => {
      iframe.removeEventListener("load", setupInlineEdit);
      cleanup?.();
    };
  }, [enabled, iframeRef]);

  // Listen for postMessage from iframe
  useEffect(() => {
    if (!enabled) return;

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "webflip-inline-edit") {
        setEditingElement({
          selector: e.data.selector,
          originalText: e.data.text,
          rect: e.data.rect,
        });
        setEditValue(e.data.text);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [enabled]);

  // Close popover on outside click
  useEffect(() => {
    if (!editingElement) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setEditingElement(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [editingElement]);

  const handleApply = useCallback(() => {
    if (!editingElement || editValue === editingElement.originalText) {
      setEditingElement(null);
      return;
    }

    // Apply directly in iframe
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc) {
        const el = doc.querySelector(editingElement.selector);
        if (el) {
          el.textContent = editValue;
        }
      }
    } catch {
      // Ignore cross-origin
    }

    // Notify parent about the edit
    onEditApplied(
      `Zmeni text "${editingElement.originalText.substring(0, 40)}${editingElement.originalText.length > 40 ? "..." : ""}" na "${editValue.substring(0, 40)}${editValue.length > 40 ? "..." : ""}"`
    );
    setEditingElement(null);
  }, [editingElement, editValue, iframeRef, onEditApplied]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleApply();
    }
    if (e.key === "Escape") {
      setEditingElement(null);
    }
  };

  if (!editingElement) return null;

  // Calculate popover position
  const popoverTop = editingElement.rect.top + editingElement.rect.height + 8;
  const popoverLeft = Math.max(8, Math.min(editingElement.rect.left, window.innerWidth - 340));

  return (
    <div
      ref={popoverRef}
      className="fixed z-[9999] w-[320px] rounded-xl shadow-2xl shadow-black/50 border border-white/15 overflow-hidden"
      style={{
        top: `${popoverTop}px`,
        left: `${popoverLeft}px`,
        background: "linear-gradient(180deg, rgba(20, 20, 35, 0.98) 0%, rgba(15, 15, 28, 0.99) 100%)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="px-3 py-2 border-b border-white/10">
        <span className="text-xs font-medium text-blue-400">Upravit text</span>
      </div>
      <div className="p-3">
        <textarea
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          className="w-full resize-none rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 border border-white/10 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/25 transition-colors"
          style={{ background: "rgba(255,255,255,0.05)" }}
        />
        <div className="flex items-center justify-between mt-2">
          <button
            onClick={() => setEditingElement(null)}
            className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            Zrusit
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:brightness-110 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            }}
          >
            Ulozit
          </button>
        </div>
      </div>
    </div>
  );
}
