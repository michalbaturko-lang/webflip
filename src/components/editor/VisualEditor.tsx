"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { EditorMode, EditorMessage, ElementInfo } from "@/lib/visual-editor/messages";
import { getInjectionScript } from "@/lib/visual-editor/inject";
import FloatingToolbar from "./FloatingToolbar";
import ElementBreadcrumb from "./ElementBreadcrumb";
import PropertiesPanel from "./PropertiesPanel";
import AIContextMenu from "./AIContextMenu";
import ImageReplacer from "./ImageReplacer";
import SmartSuggestionsVisual from "./SmartSuggestionsVisual";
import SectionManager from "./SectionManager";

interface VisualEditorProps {
  token: string;
  variantIndex: number;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  editorMode: EditorMode;
  onHtmlUpdate: (html: string) => void;
}

export default function VisualEditor({
  token,
  variantIndex,
  iframeRef,
  editorMode,
  onHtmlUpdate,
}: VisualEditorProps) {
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null);
  const [iframeRect, setIframeRect] = useState<DOMRect | null>(null);
  const [scaleFactor] = useState(1);
  const [showProperties, setShowProperties] = useState(false);
  const [showAIContext, setShowAIContext] = useState(false);
  const [showImageReplacer, setShowImageReplacer] = useState(false);
  const injectedRef = useRef(false);

  // Inject visual editor script into iframe
  const injectScript = useCallback(() => {
    if (!iframeRef.current) return;
    try {
      const doc = iframeRef.current.contentDocument;
      if (!doc) return;

      // Check if already injected
      if (doc.getElementById("wf-visual-editor-script")) return;

      const script = doc.createElement("script");
      script.id = "wf-visual-editor-script";
      script.textContent = getInjectionScript();
      doc.body.appendChild(script);
      injectedRef.current = true;
    } catch {
      // Cross-origin — use srcdoc injection instead
    }
  }, [iframeRef]);

  // Sync editor mode to iframe and clear selection on mode change
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "wf-cmd-set-mode", mode: editorMode },
      window.location.origin
    );
    if (editorMode !== "browse") {
      injectScript();
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing selection in response to external mode prop change is intentional
    if (editorMode === "browse") setSelectedElement(null);
  }, [editorMode, injectScript, iframeRef]);

  // Re-inject on iframe load (when srcdoc changes)
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleLoad = () => {
      if (editorMode !== "browse") {
        injectedRef.current = false;
        // Small delay to ensure DOM is ready
        timeoutId = setTimeout(() => {
          injectScript();
          iframe.contentWindow?.postMessage(
            { type: "wf-cmd-set-mode", mode: editorMode },
            window.location.origin
          );
        }, 100);
      }
    };

    iframe.addEventListener("load", handleLoad);
    return () => {
      iframe.removeEventListener("load", handleLoad);
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [editorMode, injectScript, iframeRef]);

  // Update iframe rect for positioning
  useEffect(() => {
    const updateRect = () => {
      if (iframeRef.current) {
        setIframeRect(iframeRef.current.getBoundingClientRect());
      }
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect);

    const interval = setInterval(updateRect, 500);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect);
      clearInterval(interval);
    };
  }, [iframeRef]);

  // Listen for postMessage from iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      const data = e.data as EditorMessage;
      if (!data || typeof data.type !== "string" || !data.type.startsWith("wf-")) return;

      switch (data.type) {
        case "wf-select":
          setSelectedElement(data.element);
          break;
        case "wf-deselect":
          setSelectedElement(null);
          setShowProperties(false);
          setShowAIContext(false);
          setShowImageReplacer(false);
          break;
        case "wf-text-edit":
          onHtmlUpdate(data.newHtml);
          break;
        case "wf-html-update":
          onHtmlUpdate(data.html);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onHtmlUpdate]);

  // Send style change to iframe
  const handleStyleChange = useCallback(
    (property: string, value: string) => {
      if (!selectedElement) return;
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: "wf-cmd-style",
          cssPath: selectedElement.cssPath,
          property,
          value,
        },
        window.location.origin
      );
    },
    [selectedElement, iframeRef]
  );

  // Save current state (get HTML from iframe and persist)
  const handleSaveState = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "wf-cmd-get-html" },
      window.location.origin
    );
  }, [iframeRef]);

  // Select element by CSS path (for breadcrumb)
  const handleSelectByPath = useCallback(
    (cssPath: string) => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "wf-cmd-select", cssPath },
        window.location.origin
      );
    },
    [iframeRef]
  );

  // Toolbar actions
  const handleEditText = useCallback(() => {
    if (!selectedElement) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: "wf-cmd-text-edit", cssPath: selectedElement.cssPath, enable: true },
      window.location.origin
    );
  }, [selectedElement, iframeRef]);

  const handleEditStyle = useCallback(() => {
    setShowProperties(true);
    setShowAIContext(false);
    setShowImageReplacer(false);
  }, []);

  const handleReplaceImage = useCallback(() => {
    setShowImageReplacer(true);
    setShowProperties(false);
    setShowAIContext(false);
  }, []);

  const handleAIEdit = useCallback(() => {
    setShowAIContext(true);
    setShowProperties(false);
    setShowImageReplacer(false);
  }, []);

  const handleDuplicate = useCallback(() => {
    if (!selectedElement) return;
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      const el = doc.querySelector(selectedElement.cssPath);
      if (el && el.parentNode) {
        const clone = el.cloneNode(true) as HTMLElement;
        el.parentNode.insertBefore(clone, el.nextSibling);
        iframeRef.current?.contentWindow?.postMessage(
          { type: "wf-cmd-get-html" },
          window.location.origin
        );
      }
    } catch {
      // Cross-origin
    }
  }, [selectedElement, iframeRef]);

  const handleDelete = useCallback(() => {
    if (!selectedElement) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: "wf-cmd-delete", cssPath: selectedElement.cssPath },
      window.location.origin
    );
  }, [selectedElement, iframeRef]);

  // Handle AI element edit result
  const handleAIEditResult = useCallback(
    (newElementHtml: string) => {
      if (!selectedElement) return;
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: "wf-cmd-replace-element",
          cssPath: selectedElement.cssPath,
          newHtml: newElementHtml,
        },
        window.location.origin
      );
      setShowAIContext(false);
    },
    [selectedElement, iframeRef]
  );

  // Handle image replacement
  const handleImageReplace = useCallback(
    (newSrc: string) => {
      if (!selectedElement) return;
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: "wf-cmd-style",
          cssPath: selectedElement.cssPath,
          property: "src",
          value: newSrc,
        },
        window.location.origin
      );
      // Request updated HTML after attribute change
      setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "wf-cmd-get-html" },
          window.location.origin
        );
      }, 50);
      setShowImageReplacer(false);
    },
    [selectedElement, iframeRef]
  );

  if (editorMode === "browse") return null;

  return (
    <>
      {/* Floating toolbar above selected element */}
      <FloatingToolbar
        element={selectedElement}
        iframeRect={iframeRect}
        scaleFactor={scaleFactor}
        onEditText={handleEditText}
        onEditStyle={handleEditStyle}
        onReplaceImage={handleReplaceImage}
        onAIEdit={handleAIEdit}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />

      {/* Breadcrumb bar */}
      {selectedElement && (
        <ElementBreadcrumb
          cssPath={selectedElement.cssPath}
          onSelectSegment={handleSelectByPath}
        />
      )}

      {/* Smart suggestions chips */}
      {selectedElement && !showProperties && !showAIContext && !showImageReplacer && (
        <SmartSuggestionsVisual
          element={selectedElement}
          onStyleChange={handleStyleChange}
          onAIEdit={() => setShowAIContext(true)}
        />
      )}

      {/* Properties panel */}
      {showProperties && selectedElement && (
        <PropertiesPanel
          element={selectedElement}
          onStyleChange={handleStyleChange}
          onClose={() => setShowProperties(false)}
          onSave={handleSaveState}
        />
      )}

      {/* AI context menu */}
      {showAIContext && selectedElement && (
        <AIContextMenu
          element={selectedElement}
          token={token}
          variantIndex={variantIndex}
          onResult={handleAIEditResult}
          onClose={() => setShowAIContext(false)}
        />
      )}

      {/* Image replacer */}
      {showImageReplacer && selectedElement?.isImage && (
        <ImageReplacer
          currentSrc={selectedElement.imgSrc || ""}
          onReplace={handleImageReplace}
          onClose={() => setShowImageReplacer(false)}
        />
      )}

      {/* Section manager */}
      <SectionManager
        iframeRef={iframeRef}
        editorMode={editorMode}
      />
    </>
  );
}
