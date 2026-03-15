"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, CheckCircle, Loader2 } from "lucide-react";

interface Props {
  variantProgress?: { current: number; total: number; message: string } | null;
}

const VARIANT_NAMES = ["Brand-Faithful", "Modern Edge", "Conversion Max"];
const VARIANT_COLORS = [
  { from: "from-blue-500", to: "to-cyan-400", accent: "blue" },
  { from: "from-purple-500", to: "to-pink-400", accent: "purple" },
  { from: "from-emerald-500", to: "to-teal-400", accent: "emerald" },
];

function TypingText({ text, speed = 40 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      setDisplayed(text.slice(0, idx));
      if (idx >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span className="font-mono">
      {displayed}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="text-purple-400"
      >
        |
      </motion.span>
    </span>
  );
}

export default function StageGenerating({ variantProgress }: Props) {
  const current = variantProgress?.current ?? 0;
  const total = variantProgress?.total ?? 3;
  const message = variantProgress?.message ?? "Připravujeme varianty...";

  return (
    <motion.div
      key="generating"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-3xl mx-auto relative"
    >
      {/* Gradient background effect */}
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <motion.div
          className="absolute inset-0 opacity-10"
          style={{
            background: "radial-gradient(ellipse at center, rgba(139,92,246,0.3), transparent 70%)",
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="text-center mb-8">
        <motion.div
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="h-10 w-10 text-purple-400 mx-auto mb-3" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          Generujeme redesign
        </h2>
        <div className="text-sm h-5" style={{ color: "var(--text-muted)" }}>
          <TypingText text={message} />
        </div>
        {current > 0 && (
          <p className="text-purple-400 font-mono text-sm mt-2">
            Varianta {current}/{total}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md mx-auto mb-8">
        <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bar-bg)" }}>
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
            initial={{ width: 0 }}
            animate={{ width: `${total > 0 ? (current / total) * 100 : 0}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Skeleton variant cards - rising from shadow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: total }).map((_, i) => {
          const isComplete = i < current;
          const isActive = i === current - 1 || (current === 0 && i === 0);
          const colors = VARIANT_COLORS[i % VARIANT_COLORS.length];
          const name = VARIANT_NAMES[i] || `Variant ${i + 1}`;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{
                opacity: 1,
                y: isComplete ? 0 : 10,
                scale: isComplete ? 1 : 0.97,
              }}
              transition={{ delay: i * 0.15, duration: 0.6, ease: "easeOut" }}
              className={`glass rounded-2xl p-5 flex flex-col gap-4 transition-all duration-500 ${
                isComplete
                  ? "border-purple-400/30 shadow-lg shadow-purple-500/10"
                  : ""
              }`}
              style={{
                borderColor: isComplete ? "rgba(168,85,247,0.3)" : undefined,
              }}
            >
              {/* Preview area */}
              <div className="rounded-lg overflow-hidden">
                <div className="h-28 relative" style={{ background: "var(--bar-bg)" }}>
                  {/* Shimmer overlay when loading */}
                  {!isComplete && (
                    <motion.div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.08) 50%, transparent 100%)`,
                      }}
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                    />
                  )}

                  {/* Complete state */}
                  {isComplete && (
                    <motion.div
                      className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${colors.from} ${colors.to} opacity-20`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.2 }}
                    >
                    </motion.div>
                  )}

                  <div className="absolute inset-0 flex items-center justify-center">
                    {isComplete ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      >
                        <CheckCircle className="h-8 w-8 text-purple-400" />
                      </motion.div>
                    ) : isActive ? (
                      <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Content skeleton - progressively revealed */}
              <div className="space-y-3">
                {/* Title */}
                {isComplete ? (
                  <motion.h3
                    className="text-sm font-bold"
                    style={{ color: "var(--text-primary)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {name}
                  </motion.h3>
                ) : (
                  <div
                    className="h-5 rounded-md"
                    style={{ background: "var(--bar-bg)", width: "70%" }}
                  />
                )}

                {/* Description lines */}
                {isComplete ? (
                  <motion.p
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    Varianta připravena
                  </motion.p>
                ) : (
                  <div className="space-y-2">
                    <div className="h-3 rounded" style={{ background: "var(--bar-bg)", width: "100%" }} />
                    <div className="h-3 rounded" style={{ background: "var(--bar-bg)", width: "65%" }} />
                  </div>
                )}

                {/* Feature dots */}
                <div className="space-y-1.5 pt-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{
                          background: isComplete
                            ? "rgba(168,85,247,0.3)"
                            : "var(--bar-bg)",
                        }}
                      />
                      <div
                        className="h-3 rounded flex-1"
                        style={{ background: "var(--bar-bg)" }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
