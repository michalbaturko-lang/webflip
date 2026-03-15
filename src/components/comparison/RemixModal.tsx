"use client";

import { useState, useCallback } from "react";
import { X, Loader2, Shuffle, Palette, Type, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Variant {
  name: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    text: string;
  };
  typography: { heading: string; body: string };
  layout: string;
}

interface RemixModalProps {
  isOpen: boolean;
  onClose: () => void;
  variants: Variant[];
  token: string;
  onRemixComplete: (html: string, variantIndex: number) => void;
}

type RemixCategory = "layout" | "colors" | "typography";

interface RemixSelection {
  layout: number | null;
  colors: number | null;
  typography: number | null;
}

const CATEGORY_CONFIG: {
  key: RemixCategory;
  label: string;
  icon: typeof LayoutGrid;
  description: string;
}[] = [
  {
    key: "layout",
    label: "Rozložení",
    icon: LayoutGrid,
    description: "Struktura a řazení sekcí",
  },
  {
    key: "colors",
    label: "Barvy",
    icon: Palette,
    description: "Barevná paleta a gradienty",
  },
  {
    key: "typography",
    label: "Typografie",
    icon: Type,
    description: "Fonty a velikosti textu",
  },
];

export default function RemixModal({
  isOpen,
  onClose,
  variants,
  token,
  onRemixComplete,
}: RemixModalProps) {
  const [selection, setSelection] = useState<RemixSelection>({
    layout: null,
    colors: null,
    typography: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = (category: RemixCategory, variantIndex: number) => {
    setSelection((prev) => ({
      ...prev,
      [category]: prev[category] === variantIndex ? null : variantIndex,
    }));
    setError(null);
  };

  const isValid =
    selection.layout !== null ||
    selection.colors !== null ||
    selection.typography !== null;

  const handleRemix = useCallback(async () => {
    if (!isValid || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/analyze/${token}/remix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layout: selection.layout,
          colors: selection.colors,
          typography: selection.typography,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Nepodařilo se vytvořit remix");
        return;
      }

      onRemixComplete(data.html, data.variantIndex);
      onClose();
    } catch {
      setError("Chyba sítě. Zkuste to prosím znovu.");
    } finally {
      setIsLoading(false);
    }
  }, [isValid, isLoading, token, selection, onRemixComplete, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg glass rounded-2xl shadow-2xl shadow-black/40 border border-white/10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                  <Shuffle className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3
                    className="font-bold text-base"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Remix variant
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Zkombinujte prvky z různých variant
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {CATEGORY_CONFIG.map((cat) => {
                const CatIcon = cat.icon;
                return (
                  <div key={cat.key}>
                    <div className="flex items-center gap-2 mb-2">
                      <CatIcon
                        className="h-4 w-4"
                        style={{ color: "var(--text-muted)" }}
                      />
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {cat.label}
                      </span>
                      <span
                        className="text-[10px]"
                        style={{ color: "var(--text-faint)" }}
                      >
                        {cat.description}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {variants.map((v, i) => {
                        const isSelected = selection[cat.key] === i;
                        return (
                          <button
                            key={i}
                            onClick={() => handleSelect(cat.key, i)}
                            className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                              isSelected
                                ? "border-purple-400/50 bg-purple-500/15 text-purple-300"
                                : "border-white/10 hover:border-white/20 hover:bg-white/5"
                            }`}
                            style={
                              !isSelected
                                ? { color: "var(--text-secondary)" }
                                : undefined
                            }
                          >
                            <span className="block truncate">{v.name}</span>
                            {cat.key === "colors" && (
                              <div className="flex items-center gap-1 mt-1.5 justify-center">
                                {[v.palette.primary, v.palette.secondary, v.palette.accent].map(
                                  (color, ci) => (
                                    <div
                                      key={ci}
                                      className="h-3 w-3 rounded-full border border-white/10"
                                      style={{ backgroundColor: color }}
                                    />
                                  )
                                )}
                              </div>
                            )}
                            {cat.key === "typography" && (
                              <span
                                className="block text-[9px] mt-1"
                                style={{ color: "var(--text-faint)" }}
                              >
                                {v.typography.heading}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {error && (
                <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() =>
                  setSelection({ layout: null, colors: null, typography: null })
                }
                className="text-xs transition-colors hover:text-white"
                style={{ color: "var(--text-muted)" }}
              >
                Resetovat výběr
              </button>
              <button
                onClick={handleRemix}
                disabled={!isValid || isLoading}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background:
                    isValid && !isLoading
                      ? "linear-gradient(135deg, #7c3aed, #3b82f6)"
                      : "rgba(255,255,255,0.1)",
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Vytvářím remix...
                  </>
                ) : (
                  <>
                    <Shuffle className="h-4 w-4" />
                    Vytvořit remix
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
