"use client";

import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Maximize2,
  Minimize2,
  Smartphone,
  Monitor,
  MousePointer2,
  Hand,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import AIEditor from "@/components/editor/AIEditor";
import VisualEditor from "@/components/editor/VisualEditor";
import type { EditorMode } from "@/lib/visual-editor/messages";

type ViewMode = "desktop" | "mobile";

export default function PreviewPage() {
  const params = useParams<{ token: string; index: string }>();
  const router = useRouter();
  const t = useTranslations("editor");
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isEditorActive, setIsEditorActive] = useState(false);
  const [initialHtml, setInitialHtml] = useState<string | undefined>(undefined);
  const [editorMode, setEditorMode] = useState<EditorMode>("browse");

  const iframeSrc = `/api/analyze/${params.token}/preview/${params.index}`;
  const variantNum = Number(params.index) + 1;

  // Capture initial HTML once iframe loads — with race condition fix (#7)
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc?.documentElement) {
          setInitialHtml(doc.documentElement.outerHTML);
        }
      } catch {
        // Cross-origin
      }
    };

    iframe.addEventListener("load", handleLoad);
    // Check immediately in case iframe already loaded before effect
    if (iframe.contentDocument?.readyState === "complete") {
      handleLoad();
    }
    return () => iframe.removeEventListener("load", handleLoad);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Use srcdoc for safe HTML updates (#8)
  const handleHtmlUpdate = useCallback((newHtml: string) => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = newHtml;
      setIsEditorActive(true);
    }
  }, []);

  // Keyboard shortcut: Escape to exit edit mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if in input/textarea
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable);
      if (isInput) return;

      if (e.key === "Escape" && editorMode !== "browse") {
        setEditorMode("browse");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editorMode]);

  const toggleEditorMode = useCallback(() => {
    setEditorMode((prev) => (prev === "browse" ? "select" : "browse"));
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Floating Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 glass rounded-full px-4 py-2 shadow-2xl shadow-black/30 border border-white/10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          style={{ color: "var(--text-primary)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </button>

        <div className="w-px h-5 bg-white/10" />

        <span
          className="text-xs font-medium px-2"
          style={{ color: "var(--text-muted)" }}
        >
          {t("variant", { num: variantNum })}
        </span>

        {isEditorActive && (
          <>
            <div className="w-px h-5 bg-white/10" />
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">
              {t("edited")}
            </span>
          </>
        )}

        <div className="w-px h-5 bg-white/10" />

        {/* Edit mode toggle */}
        <button
          onClick={toggleEditorMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            editorMode !== "browse"
              ? "bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30"
              : "hover:bg-white/10"
          }`}
          style={
            editorMode === "browse"
              ? { color: "var(--text-muted)" }
              : undefined
          }
          title={editorMode === "browse" ? "Enter Edit Mode" : "Exit Edit Mode"}
        >
          {editorMode === "browse" ? (
            <>
              <MousePointer2 className="h-3.5 w-3.5" />
              Edit
            </>
          ) : (
            <>
              <Hand className="h-3.5 w-3.5" />
              Editing
            </>
          )}
        </button>

        <div className="w-px h-5 bg-white/10" />

        <button
          onClick={() => setViewMode("desktop")}
          className={`p-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
            viewMode === "desktop"
              ? "bg-blue-500/20 text-blue-400"
              : "hover:bg-white/10"
          }`}
          style={
            viewMode !== "desktop"
              ? { color: "var(--text-muted)" }
              : undefined
          }
          aria-label="Desktop"
          title="Desktop"
        >
          <Monitor className="h-4 w-4" />
        </button>
        <button
          onClick={() => setViewMode("mobile")}
          className={`p-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
            viewMode === "mobile"
              ? "bg-blue-500/20 text-blue-400"
              : "hover:bg-white/10"
          }`}
          style={
            viewMode !== "mobile"
              ? { color: "var(--text-muted)" }
              : undefined
          }
          aria-label="Mobile"
          title="Mobile"
        >
          <Smartphone className="h-4 w-4" />
        </button>

        <div className="w-px h-5 bg-white/10" />

        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          style={{ color: "var(--text-muted)" }}
          aria-label={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
          title={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </button>

        <a
          href={iframeSrc}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          style={{ color: "var(--text-muted)" }}
          aria-label={t("openNewTab")}
          title={t("openNewTab")}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* Iframe */}
      <div className="flex-1 flex items-center justify-center p-4 pt-16">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          title={t("variant", { num: variantNum })}
          sandbox="allow-same-origin allow-scripts"
          className="border-0 bg-white rounded-lg shadow-2xl transition-all duration-300"
          style={{
            width: viewMode === "mobile" ? "375px" : "100%",
            height: "100%",
            maxWidth: viewMode === "mobile" ? "375px" : "100%",
          }}
        />
      </div>

      {/* Visual Editor overlay — active when in select/edit mode */}
      {initialHtml !== undefined && (
        <VisualEditor
          token={params.token}
          variantIndex={Number(params.index)}
          iframeRef={iframeRef}
          editorMode={editorMode}
          onHtmlUpdate={handleHtmlUpdate}
        />
      )}

      {/* AI Editor — render only after initial HTML captured */}
      {initialHtml !== undefined && (
        <AIEditor
          token={params.token}
          variantIndex={Number(params.index)}
          onHtmlUpdate={handleHtmlUpdate}
          iframeRef={iframeRef}
          initialHtml={initialHtml}
        />
      )}
    </div>
  );
}
