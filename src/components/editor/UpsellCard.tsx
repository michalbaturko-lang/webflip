"use client";

import { Sparkles, ArrowRight } from "lucide-react";

interface UpsellCardProps {
  message?: string;
  onContact: () => void;
}

export default function UpsellCard({ message, onContact }: UpsellCardProps) {
  return (
    <div
      className="rounded-xl overflow-hidden border border-purple-500/20 mx-1"
      style={{
        background: "linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(91, 33, 182, 0.12) 100%)",
      }}
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
          <span className="text-xs font-semibold text-purple-300">
            Pro feature
          </span>
        </div>
        {message && (
          <p className="text-xs text-gray-300 leading-relaxed">
            {message}
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="px-3 pb-3 pt-1">
        <p className="text-[11px] text-gray-400 mb-2">
          Pro profesionální realizaci vás rádi propojíme s naším týmem.
        </p>
        <button
          onClick={onContact}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white transition-all hover:brightness-110 active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
          }}
        >
          Get in touch
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
