"use client";

import { useState, useCallback } from "react";
import { Monitor, Smartphone, Eye, Check, CreditCard, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import RecommendBadge, { type RecommendBadgeProps } from "./RecommendBadge";
import type { DesignVariant, ViewMode } from "@/types/design";

// Czech display names for standard variant styles
const VARIANT_NAMES_CS: Record<string, string> = {
  "Corporate Clean": "Profesionální",
  "Modern Bold": "Moderní & Odvážný",
  "Elegant Minimal": "Elegantní Minimál",
};

interface VariantCardProps {
  variant: DesignVariant;
  index: number;
  token: string;
  recommendation?: RecommendBadgeProps | null;
  isSelected?: boolean;
  onSelect?: (index: number) => void;
}

export default function VariantCard({
  variant,
  index,
  token,
  recommendation,
  isSelected,
  onSelect,
}: VariantCardProps) {
  const t = useTranslations("comparison");
  const locale = useLocale();
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [iframeError, setIframeError] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const iframeSrc = `/api/analyze/${token}/preview/${index}`;

  const handleIframeError = useCallback(() => {
    setIframeError(true);
  }, []);

  const handleCheckout = useCallback(async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, variantIndex: index, locale }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      }
    } catch {
      // Fall through to reset loading
    }
    setCheckoutLoading(false);
  }, [token, index, locale]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className={`glass rounded-2xl overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300 group relative ${
        isSelected ? "ring-2 ring-green-400/60 border-green-400/30" : ""
      }`}
    >
      {/* AI recommendation badge */}
      {recommendation && (
        <div className="absolute top-3 left-3 z-10">
          <RecommendBadge {...recommendation} />
        </div>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-3 right-14 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-green-500/20 border border-green-400/30">
          <Check className="h-3.5 w-3.5 text-green-400" />
          <span className="text-xs font-medium text-green-300">
            {t("selected")}
          </span>
        </div>
      )}

      {/* Viewport toggle */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 glass rounded-full px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setViewMode("desktop")}
          aria-label={t("desktop")}
          className={`p-1 rounded-full transition-colors ${
            viewMode === "desktop"
              ? "bg-blue-500/20 text-blue-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Monitor className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setViewMode("mobile")}
          aria-label={t("mobile")}
          className={`p-1 rounded-full transition-colors ${
            viewMode === "mobile"
              ? "bg-blue-500/20 text-blue-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Smartphone className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Iframe Preview */}
      <div
        className="relative w-full overflow-hidden bg-gray-900/50"
        style={{ height: "300px" }}
      >
        {iframeError ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              {t("previewUnavailable")}
            </span>
          </div>
        ) : viewMode === "desktop" ? (
          <iframe
            src={iframeSrc}
            title={variant.name}
            className="absolute top-0 left-0 border-0"
            style={{
              width: "1280px",
              height: "960px",
              transform: "scale(0.3)",
              transformOrigin: "top left",
              pointerEvents: "none",
            }}
            loading="lazy"
            sandbox="allow-same-origin"
            onError={handleIframeError}
          />
        ) : (
          <div className="flex items-start justify-center pt-2 h-full">
            <iframe
              src={iframeSrc}
              title={variant.name}
              className="border-0 rounded-lg"
              style={{
                width: "375px",
                height: "667px",
                transform: "scale(0.42)",
                transformOrigin: "top center",
                pointerEvents: "none",
              }}
              loading="lazy"
              sandbox="allow-same-origin"
              onError={handleIframeError}
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Palette preview */}
        <div className="flex items-center gap-1.5">
          {[
            variant.palette.primary,
            variant.palette.secondary,
            variant.palette.accent,
          ].map((color, i) => (
            <div
              key={i}
              className="h-4 w-4 rounded-full border border-white/10"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          <span
            className="text-[10px] ml-1"
            style={{ color: "var(--text-faint)" }}
          >
            {variant.typography.heading}
          </span>
        </div>

        <div>
          <h3
            className="font-bold text-base mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            {VARIANT_NAMES_CS[variant.name] || variant.name}
          </h3>
          <p
            className="text-xs leading-relaxed line-clamp-2"
            style={{ color: "var(--text-muted)" }}
          >
            {variant.description}
          </p>
        </div>

        {/* Key features */}
        <div className="flex flex-wrap gap-1">
          {variant.keyFeatures.slice(0, 3).map((feature, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded-full border border-white/10"
              style={{ color: "var(--text-muted)" }}
            >
              {feature}
            </span>
          ))}
        </div>

        <button
          onClick={() => onSelect?.(index)}
          aria-label={
            isSelected
              ? t("changeSelection")
              : `${t("viewFullSite")} — ${variant.name}`
          }
          className={`mt-auto flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all cursor-pointer ${
            isSelected
              ? "bg-green-600 hover:bg-green-500"
              : "bg-blue-500 hover:bg-blue-400"
          }`}
        >
          {isSelected ? (
            <>
              <Check className="h-4 w-4" />
              {t("changeSelection")}
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              {t("viewFullSite")}
            </>
          )}
        </button>

        {isSelected && (
          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all cursor-pointer bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {checkoutLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("checkoutLoading")}
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                {t("confirmAndPay")}
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}
