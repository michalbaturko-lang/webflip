"use client";

import { useState, useRef, useCallback } from "react";
import { ImageIcon, Upload, Link2, X, Check } from "lucide-react";

interface ImageReplacerProps {
  currentSrc: string;
  onReplace: (newSrc: string) => void;
  onClose: () => void;
}

export default function ImageReplacer({
  currentSrc,
  onReplace,
  onClose,
}: ImageReplacerProps) {
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [url, setUrl] = useState("");
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = useCallback(() => {
    if (!url.trim()) return;
    // Basic URL validation
    try {
      new URL(url);
      setPreviewSrc(url);
      setError(null);
    } catch {
      setError("Invalid URL");
    }
  }, [url]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewSrc(e.target?.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleApply = useCallback(() => {
    if (previewSrc) {
      onReplace(previewSrc);
    }
  }, [previewSrc, onReplace]);

  return (
    <div
      className="fixed right-4 top-20 z-[9998] w-[300px] rounded-2xl shadow-2xl shadow-black/50 border border-white/10 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, rgba(15, 15, 25, 0.98) 0%, rgba(10, 10, 20, 0.99) 100%)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-medium text-white">Replace Image</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Current image preview */}
        <div className="rounded-lg overflow-hidden border border-white/10 bg-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentSrc}
            alt="Current"
            className="w-full h-24 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23333' width='100' height='100'/%3E%3Ctext fill='%23666' x='50' y='55' text-anchor='middle' font-size='12'%3ENo image%3C/text%3E%3C/svg%3E";
            }}
          />
          <span className="text-[9px] text-gray-500 px-2 py-1 block truncate">
            {currentSrc.substring(0, 60)}
          </span>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 p-0.5 rounded-lg bg-white/5">
          <button
            onClick={() => setMode("url")}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
              mode === "url"
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            <Link2 className="h-3 w-3" /> URL
          </button>
          <button
            onClick={() => setMode("upload")}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
              mode === "upload"
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            <Upload className="h-3 w-3" /> Upload
          </button>
        </div>

        {/* URL mode */}
        {mode === "url" && (
          <div className="flex gap-1.5">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
              className="flex-1 text-xs bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
            />
            <button
              onClick={handleUrlSubmit}
              disabled={!url.trim()}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-30 transition-colors"
            >
              Load
            </button>
          </div>
        )}

        {/* Upload mode */}
        {mode === "upload" && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-500/10"
                : "border-white/10 hover:border-white/20"
            }`}
          >
            <Upload className="h-6 w-6 text-gray-500 mx-auto mb-1" />
            <p className="text-[11px] text-gray-400">
              Drop image here or click to browse
            </p>
            <p className="text-[9px] text-gray-600 mt-0.5">Max 5MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="hidden"
            />
          </div>
        )}

        {/* Error */}
        {error && <p className="text-[11px] text-red-400">{error}</p>}

        {/* Preview */}
        {previewSrc && (
          <div className="space-y-2">
            <div className="rounded-lg overflow-hidden border border-emerald-500/30 bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewSrc}
                alt="Preview"
                className="w-full h-24 object-cover"
                onError={() => setError("Failed to load image")}
              />
            </div>
            <button
              onClick={handleApply}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-white transition-all hover:brightness-110"
              style={{
                background: "linear-gradient(135deg, #059669, #047857)",
              }}
            >
              <Check className="h-3.5 w-3.5" />
              Apply Image
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
