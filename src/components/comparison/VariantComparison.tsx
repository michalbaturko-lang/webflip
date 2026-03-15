"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Shuffle, ChevronLeft, ChevronRight } from "lucide-react";
import VariantCard from "./VariantCard";
import RemixModal from "./RemixModal";
import type { RecommendBadgeProps } from "./RecommendBadge";

interface Variant {
  name: string;
  description: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    text: string;
  };
  typography: { heading: string; body: string };
  layout: string;
  keyFeatures: string[];
}

interface VariantComparisonProps {
  variants: Variant[];
  token: string;
  onSelectVariant?: (index: number) => void;
}

interface RecommendationResponse {
  recommendedIndex: number;
  templateName: string;
  reason: string;
  confidence: number;
}

export default function VariantComparison({
  variants,
  token,
  onSelectVariant,
}: VariantComparisonProps) {
  const [recommendation, setRecommendation] =
    useState<RecommendationResponse | null>(null);
  const [isRemixOpen, setIsRemixOpen] = useState(false);
  const [mobileIndex, setMobileIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Načtení AI doporučení
  useEffect(() => {
    async function fetchRecommendation() {
      try {
        const res = await fetch(`/api/analyze/${token}/recommend`);
        if (res.ok) {
          const data: RecommendationResponse = await res.json();
          setRecommendation(data);
        }
      } catch {
        // Tiché selhání — doporučení je nepovinné
      }
    }
    fetchRecommendation();
  }, [token]);

  const handleSelectVariant = useCallback(
    (index: number) => {
      if (onSelectVariant) {
        onSelectVariant(index);
      } else {
        window.open(`/preview/${token}/${index}`, "_blank");
      }
    },
    [token, onSelectVariant]
  );

  const handleRemixComplete = useCallback(
    (html: string, variantIndex: number) => {
      // Otevře remix v novém okně přes blob URL
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

  const getRecommendBadge = (index: number): RecommendBadgeProps | null => {
    if (!recommendation || recommendation.recommendedIndex !== index) return null;
    return {
      templateName: recommendation.templateName,
      reason: recommendation.reason,
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
          Porovnání variant
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
          Porovnejte všechny varianty vedle sebe a vyberte tu nejlepší
        </p>
        <button
          onClick={() => setIsRemixOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105 border border-purple-400/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
        >
          <Shuffle className="h-4 w-4" />
          Remix variant
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
            onSelect={handleSelectVariant}
          />
        ))}
      </div>

      {/* Mobile: swipeable single card */}
      <div
        ref={containerRef}
        className="md:hidden relative overflow-hidden"
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
