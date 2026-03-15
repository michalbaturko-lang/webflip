"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Maximize2, Minimize2, Smartphone, Monitor } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import AIEditor from "@/components/editor/AIEditor";

type ViewMode = "desktop" | "mobile";

export default function PreviewPage() {
  const params = useParams<{ token: string; index: string }>();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isEditorActive, setIsEditorActive] = useState(false);

  const iframeSrc = `/api/analyze/${params.token}/preview/${params.index}`;
  const variantNum = Number(params.index) + 1;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleHtmlUpdate = useCallback((newHtml: string) => {
    if (iframeRef.current) {
      try {
        const doc = iframeRef.current.contentDocument;
        if (doc) {
          doc.open();
          doc.write(newHtml);
          doc.close();
          setIsEditorActive(true);
        }
      } catch {
        // Fallback: use srcdoc
        iframeRef.current.srcdoc = newHtml;
        setIsEditorActive(true);
      }
    }
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "var(--bg-primary)" }}>
      {/* Floating Toolbar */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 glass rounded-full px-4 py-2 shadow-2xl shadow-black/30 border border-white/10"
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors"
          style={{ color: "var(--text-primary)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="w-px h-5 bg-white/10" />

        <span className="text-xs font-medium px-2" style={{ color: "var(--text-muted)" }}>
          Variant {variantNum}
        </span>

        {isEditorActive && (
          <>
            <div className="w-px h-5 bg-white/10" />
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">
              Edited
            </span>
          </>
        )}

        <div className="w-px h-5 bg-white/10" />

        {/* Viewport toggles */}
        <button
          onClick={() => setViewMode("desktop")}
          className={`p-1.5 rounded-full transition-colors ${viewMode === "desktop" ? "bg-blue-500/20 text-blue-400" : "hover:bg-white/10"}`}
          style={viewMode !== "desktop" ? { color: "var(--text-muted)" } : undefined}
          title="Desktop"
        >
          <Monitor className="h-4 w-4" />
        </button>
        <button
          onClick={() => setViewMode("mobile")}
          className={`p-1.5 rounded-full transition-colors ${viewMode === "mobile" ? "bg-blue-500/20 text-blue-400" : "hover:bg-white/10"}`}
          style={viewMode !== "mobile" ? { color: "var(--text-muted)" } : undefined}
          title="Mobile"
        >
          <Smartphone className="h-4 w-4" />
        </button>

        <div className="w-px h-5 bg-white/10" />

        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
          style={{ color: "var(--text-muted)" }}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>

        <a
          href={iframeSrc}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
          style={{ color: "var(--text-muted)" }}
          title="Open in new tab"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* Iframe */}
      <div className="flex-1 flex items-center justify-center p-4 pt-16">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          title={`Variant ${variantNum}`}
          className="border-0 bg-white rounded-lg shadow-2xl transition-all duration-300"
          style={{
            width: viewMode === "mobile" ? "375px" : "100%",
            height: "100%",
            maxWidth: viewMode === "mobile" ? "375px" : "100%",
          }}
        />
      </div>

      {/* AI Editor */}
      <AIEditor
        token={params.token}
        variantIndex={Number(params.index)}
        onHtmlUpdate={handleHtmlUpdate}
      />
    </div>
  );
}
