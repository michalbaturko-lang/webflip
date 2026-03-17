"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DesignVariant } from "@/types/design";

interface VariantComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  variants: DesignVariant[];
  token: string;
  selectedVariant: number | null;
  onSelectVariant: (index: number) => void;
}

export default function VariantComparisonModal({
  isOpen,
  onClose,
  variants,
  token,
  selectedVariant,
  onSelectVariant,
}: VariantComparisonModalProps) {
  const t = useTranslations("comparison");
  const [mobileIndex, setMobileIndex] = useState(0);
  const dragConstraintsRef = useRef<HTMLDivElement>(null);

  // Escape closes modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && mobileIndex > 0) {
        setMobileIndex((prev) => prev - 1);
      }
      if (e.key === "ArrowRight" && mobileIndex < variants.length - 1) {
        setMobileIndex((prev) => prev + 1);
      }
    },
    [onClose, mobileIndex, variants.length]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  const handleDragEnd = (
    _: unknown,
    info: { offset: { x: number }; velocity: { x: number } }
  ) => {
    const threshold = 50;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    if (offset < -threshold || velocity < -500) {
      setMobileIndex((prev) => Math.min(variants.length - 1, prev + 1));
    } else if (offset > threshold || velocity > 500) {
      setMobileIndex((prev) => Math.max(0, prev - 1));
    }
  };

  const iframeSrc = (index: number) =>
    `/api/analyze/${token}/preview/${index}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex flex-col"
          style={{ background: "rgba(0, 0, 0, 0.92)" }}
          role="dialog"
          aria-modal="true"
          aria-label={t("title")}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-white/10 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-white">{t("title")}</h2>
              <p className="text-xs text-gray-400">{t("subtitle")}</p>
            </div>
            <button
              onClick={onClose}
              aria-label={t("closeComparison")}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Desktop: 3-column layout */}
          <div className="hidden md:flex flex-1 overflow-hidden">
            {variants.map((variant, i) => (
              <div
                key={variant.name}
                className="flex-1 flex flex-col border-r border-white/10 last:border-r-0"
              >
                {/* Variant header */}
                <div className="px-4 py-2 flex items-center justify-between border-b border-white/10 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: variant.palette.primary }}
                    />
                    <span className="text-sm font-semibold text-white">
                      {variant.name}
                    </span>
                  </div>
                  {selectedVariant === i && (
                    <div className="flex items-center gap-1 text-green-400">
                      <Check className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">
                        {t("selected")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Iframe container */}
                <div className="flex-1 relative overflow-hidden bg-gray-950">
                  <iframe
                    src={iframeSrc(i)}
                    title={variant.name}
                    className="absolute top-0 left-0 border-0"
                    style={{
                      width: "1440px",
                      height: "900px",
                      transform: "scale(0.33)",
                      transformOrigin: "top left",
                    }}
                    sandbox="allow-same-origin"
                  />
                </div>

                {/* Select button */}
                <div className="px-4 py-3 flex-shrink-0 border-t border-white/10">
                  <button
                    onClick={() => onSelectVariant(i)}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                      selectedVariant === i
                        ? "bg-green-600 hover:bg-green-500 text-white ring-2 ring-green-400/40"
                        : "bg-blue-500 hover:bg-blue-400 text-white"
                    }`}
                  >
                    {selectedVariant === i ? (
                      <>
                        <Check className="h-4 w-4" />
                        {t("selected")}
                      </>
                    ) : (
                      t("selectThisVariant")
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Tablet: 2-column with scroll */}
          <div className="hidden sm:flex md:hidden flex-1 overflow-x-auto snap-x snap-mandatory">
            {variants.map((variant, i) => (
              <div
                key={variant.name}
                className="min-w-[50%] snap-start flex flex-col border-r border-white/10 last:border-r-0"
              >
                <div className="px-3 py-2 flex items-center justify-between border-b border-white/10 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: variant.palette.primary }}
                    />
                    <span className="text-sm font-semibold text-white">
                      {variant.name}
                    </span>
                  </div>
                  {selectedVariant === i && (
                    <div className="flex items-center gap-1 text-green-400">
                      <Check className="h-3.5 w-3.5" />
                      <span className="text-xs">{t("selected")}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 relative overflow-hidden bg-gray-950">
                  <iframe
                    src={iframeSrc(i)}
                    title={variant.name}
                    className="absolute top-0 left-0 border-0"
                    style={{
                      width: "1280px",
                      height: "900px",
                      transform: "scale(0.38)",
                      transformOrigin: "top left",
                    }}
                    sandbox="allow-same-origin"
                  />
                </div>
                <div className="px-3 py-2 flex-shrink-0 border-t border-white/10">
                  <button
                    onClick={() => onSelectVariant(i)}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all cursor-pointer ${
                      selectedVariant === i
                        ? "bg-green-600 hover:bg-green-500 text-white ring-2 ring-green-400/40"
                        : "bg-blue-500 hover:bg-blue-400 text-white"
                    }`}
                  >
                    {selectedVariant === i ? (
                      <>
                        <Check className="h-4 w-4" />
                        {t("selected")}
                      </>
                    ) : (
                      t("selectThisVariant")
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile: swipeable carousel with Framer Motion */}
          <div
            ref={dragConstraintsRef}
            className="sm:hidden flex-1 flex flex-col overflow-hidden"
          >
            <div className="flex-1 relative overflow-hidden">
              <motion.div
                className="flex h-full"
                animate={{ x: `-${mobileIndex * 100}%` }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragEnd={handleDragEnd}
              >
                {variants.map((variant, i) => (
                  <div
                    key={variant.name}
                    className="w-full flex-shrink-0 flex flex-col h-full"
                  >
                    {/* Variant name */}
                    <div className="px-4 py-2 flex items-center justify-between border-b border-white/10 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: variant.palette.primary,
                          }}
                        />
                        <span className="text-sm font-semibold text-white">
                          {variant.name}
                        </span>
                      </div>
                      {selectedVariant === i && (
                        <div className="flex items-center gap-1 text-green-400">
                          <Check className="h-3.5 w-3.5" />
                          <span className="text-xs">{t("selected")}</span>
                        </div>
                      )}
                    </div>

                    {/* Iframe */}
                    <div className="flex-1 relative overflow-hidden bg-gray-950">
                      <iframe
                        src={iframeSrc(i)}
                        title={variant.name}
                        className="absolute top-0 left-0 border-0"
                        style={{
                          width: "375px",
                          height: "812px",
                          transform: "scale(1)",
                          transformOrigin: "top left",
                        }}
                        sandbox="allow-same-origin"
                      />
                    </div>

                    {/* Select button */}
                    <div className="px-4 py-3 flex-shrink-0 border-t border-white/10">
                      <button
                        onClick={() => onSelectVariant(i)}
                        className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                          selectedVariant === i
                            ? "bg-green-600 hover:bg-green-500 text-white ring-2 ring-green-400/40"
                            : "bg-blue-500 hover:bg-blue-400 text-white"
                        }`}
                      >
                        {selectedVariant === i ? (
                          <>
                            <Check className="h-4 w-4" />
                            {t("selected")}
                          </>
                        ) : (
                          t("selectThisVariant")
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Mobile navigation dots + arrows */}
            <div className="flex items-center justify-center gap-4 px-4 py-3 border-t border-white/10 flex-shrink-0">
              <button
                onClick={() => setMobileIndex((prev) => Math.max(0, prev - 1))}
                disabled={mobileIndex === 0}
                aria-label={t("prevVariant")}
                className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 transition-all text-gray-400"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2">
                {variants.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setMobileIndex(i)}
                    aria-label={t("goToVariant", { num: i + 1 })}
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
                className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 transition-all text-gray-400"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
