"use client";

import { Sparkles } from "lucide-react";

export interface RecommendBadgeProps {
  templateName: string;
  reason: string;
  confidence: number;
}

/**
 * AI doporučení badge — zobrazuje se na doporučené variantě
 * na základě business_profile (restaurace=warm, tech=clean, beauty=elegant).
 */
export default function RecommendBadge({
  reason,
  confidence,
}: RecommendBadgeProps) {
  return (
    <div className="flex items-center gap-2 rounded-full px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-400/30">
      <Sparkles className="h-3.5 w-3.5 text-purple-400" />
      <span className="text-xs font-semibold text-purple-300">
        AI doporučení
      </span>
      {confidence >= 80 && (
        <span className="text-[10px] bg-purple-500/30 text-purple-200 rounded-full px-1.5 py-0.5">
          {confidence}%
        </span>
      )}
      <span className="text-[10px] text-purple-300/70 hidden sm:inline">
        — {reason}
      </span>
    </div>
  );
}
