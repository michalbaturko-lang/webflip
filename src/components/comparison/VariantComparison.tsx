"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Shuffle, ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import VariantCard from "./VariantCard";
import RemixModal from "./RemixModal";
import type { RecommendBadgeProps } from "./RecommendBadge";
import type { DesignVariant, RecommendationResponse } from "@/types/design";

interface VariantComparisonProps {
  variants: DesignVariant[];
  token: string;
  onSelectVariant?: (index: number) => void;
}

export default function VariantComparison({
  variants,
  token,
  onSelectVariant,
}: VariantComparisonProps) {
  const t = useTranslations("comparison");
  const locale = useLocale();
  const [recommendation, setRecommendation] =
    useState<RecommendationResponse | null>(null);
  const [recommendLoading, setRecommendLoading] = useState(true);
  const [isRemixOpen, setIsRemixOpen] = useState(false);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset mobileIndex when variants change
  useEffect(() => {
    setMobileIndex(0);
  }, [variants]);

  // Fetch AI recommendation
  useEffect(() => {
    const controller = new AbortController();
    async function fetchRecommendation() {
      setRecommendLoading(true);
      try {
        const res = await fetch(`/api/analyze/${token}/recommend`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data: RecommendationResponse = await res.json();
          setRecommendation(data);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Silent — recommendation is optional
      } finally {
        if (!controller.signal.aborted) setRecommendLoading(false);
      }
    }
    fetchRecommendation();
    return () => { controller.abort(); };
  }, [token]);

  // Fetch existing selection
  useEffect(() => {
    async function fetchSelection() {
      try {
        const res = await fetch(`/api/analyze/${token}`);
        if (res.ok) {
          const data = await res.json();
          if (typeof data.selectedVariant === "number") {
            setSelectedVariant(data.selectedVariant);
          }
        }
      } catch {
        // Silent
      }
    }
    fetchSelection();
  }, [token]);

  const handleSelectVariant = useCallback(
    async (index: number) => {
      setSelectError(null);

      if (onSelectVariant) {
        onSelectVariant(index);
        return;
      }

      // Persist selection
      try {
        const res = await fetch(`/api/analyze/${token}/select`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variantIndex: index }),
        });
        if (res.ok) {
          setSelectedVariant(index);
        }
      } catch {
        // Selection persistence failed — still open preview
      }

      window.open(`/${locale}/preview/${token}/${index}`, "_blank");
    },
    [token, onSelectVariant]
  );

  const handleRemixComplete = useCallback(
    (html: string, variantIndex: number) => {
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (win) {
        win.addEventListener("unload", () => URL.revokeObjectURL(url));
      }
      void variantIndex;
    },
    []
  );

  // Mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    const threshold = 50;

    if (diff > threshold && mobileIndex < variants.length - 1) {
      setMobileIndex((prev) => prev + 1);
    } else if (diff < -threshold && mobileIndex > 0) {
      setMobileIndex((prev) => prev - 1);
    }
    touchStartX.current = null;
  };

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && mobileIndex > 0) {
        setMobileIndex((prev) => prev - 1);
      } else if (e.key === "ArrowRight" && mobileIndex < variants.length - 1) {
        setMobileIndex((prev) => prev + 1);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileIndex, variants.length]);

  const getRecommendBadge = (index: number): RecommendBadgeProps | null => {
    if (!recommendation || recommendation.recommendedIndex !== index) return null;
    return {
      templateName: recommendation.templateName,
      reasonKey: recommendation.reasonKey,
      confidence: recommendation.confidence,
    };
  };

  return (
    <div className="w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2
          className="text-xl font-bold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          {t("title")}
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
          {t("subtitle")}
        </p>

        {recommendLoading && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {t("loadingRecommendation")}
            </span>
          </div>
        )}

        {selectError && (
          <div className="flex items-center justify-center gap-2 mb-3 text-xs text-red-400">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{selectError}</span>
            <button
              onClick={() => setSelectError(null)}
              className="underline hover:no-underline"
            >
              {t("retry")}
            </button>
          </div>
        )}

        <button
          onClick={() => setIsRemixOpen(true)}
          aria-label={t("remixButton")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105 border border-purple-400/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
        >
          <Shuffle className="h-4 w-4" />
          {t("remixButton")}
        </button>
      </motion.div>

      {/* Desktop: 3-column grid */}
      <div className="hidden md:grid md:grid-cols-3 gap-4">
        {variants.map((variant, i) => (
          <VariantCard
            key={variant.name}
            variant={variant}
            index={i}
            token={token}
            recommendation={getRecommendBadge(i)}
            isSelected={selectedVariant === i}
            onSelect={handleSelectVariant}
          />
        ))}
      </div>

      {/* Mobile: swipeable single card */}
      <div
        ref={containerRef}
        className="md:hidden relative overflow-hidden"
        role="tablist"
        aria-label={t("variantCarousel")}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <motion.div
          className="flex"
          animate={{ x: `-${mobileIndex * 100}%` }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          {variants.map((variant, i) => (
            <div key={variant.name} className="w-full flex-shrink-0 px-2">
              <VariantCard
                variant={variant}
                index={i}
                token={token}
                recommendation={getRecommendBadge(i)}
                isSelected={selectedVariant === i}
                onSelect={handleSelectVariant}
              />
            </div>
          ))}
        </motion.div>

        {/* Mobile navigation */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => setMobileIndex((prev) => Math.max(0, prev - 1))}
            disabled={mobileIndex === 0}
            aria-label={t("prevVariant")}
            className="p-2 rounded-full glass disabled:opacity-30 transition-opacity"
            style={{ color: "var(--text-muted)" }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            {variants.map((_, i) => (
              <button
                key={i}
                onClick={() => setMobileIndex(i)}
                aria-label={t("goToVariant", { num: i + 1 })}
                aria-pressed={i === mobileIndex}
                className={`h-2 rounded-full transition-all ${
                  i === mobileIndex
                    ? "w-6 bg-blue-400"
                    : "w-2 bg-white/20 hover:bg-white/30"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() =>
              setMobileIndex((prev) =>
                Math.min(variants.length - 1, prev + 1)
              )
            }
            disabled={mobileIndex === variants.length - 1}
            aria-label={t("nextVariant")}
            className="p-2 rounded-full glass disabled:opacity-30 transition-opacity"
            style={{ color: "var(--text-muted)" }}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Remix Modal */}
      <RemixModal
        isOpen={isRemixOpen}
        onClose={() => setIsRemixOpen(false)}
        variants={variants}
        token={token}
        onRemixComplete={handleRemixComplete}
      />
    </div>
  );
}
