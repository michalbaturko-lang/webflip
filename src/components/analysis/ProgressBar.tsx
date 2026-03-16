"use client";

import { motion } from "framer-motion";
import { Globe, Scan, BarChart3, Sparkles, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

type Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const STEPS = [
  { labelKey: "stepConnect" as const, icon: Globe },
  { labelKey: "stepCrawl" as const, icon: Scan },
  { labelKey: "stepAnalyze" as const, icon: BarChart3 },
  { labelKey: "stepGenerate" as const, icon: Sparkles },
  { labelKey: "stepResults" as const, icon: CheckCircle },
];

export default function ProgressBar({ stage }: { stage: Stage }) {
  const t = useTranslations("analysis");
  // Map stage to step index (0=connect, 1=crawl, 2=analyze, 3=generating, 4+=results)
  const stepIndex = stage <= 3 ? stage : 4;

  return (
    <>
      {/* Desktop: horizontal stepper */}
      <div className="hidden sm:flex items-center justify-center gap-1 mb-12">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = stepIndex >= i;
          const isCurrent = stepIndex === i;
          return (
            <div key={t(step.labelKey)} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <motion.div
                  className={`h-9 w-9 rounded-full flex items-center justify-center border-2 transition-colors duration-500 ${
                    isActive
                      ? "border-blue-400/60 bg-blue-400/10"
                      : "border-gray-700 bg-gray-800/50"
                  }`}
                  animate={
                    isCurrent
                      ? { boxShadow: ["0 0 0px rgba(59,130,246,0)", "0 0 16px rgba(59,130,246,0.4)", "0 0 0px rgba(59,130,246,0)"] }
                      : { boxShadow: "0 0 0px rgba(59,130,246,0)" }
                  }
                  transition={isCurrent ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
                >
                  <Icon className={`h-4 w-4 transition-colors duration-500 ${isActive ? "text-blue-400" : "text-gray-600"}`} />
                </motion.div>
                <span className={`text-[10px] font-medium transition-colors duration-500 ${isActive ? "text-gray-300" : "text-gray-600"}`}>
                  {t(step.labelKey)}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-10 sm:w-16 h-px mx-2 mb-5 relative">
                  <div className="absolute inset-0 bg-gray-700" />
                  <motion.div
                    className="absolute inset-0 h-full bg-blue-400/50"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: stepIndex > i ? 1 : 0 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    style={{ transformOrigin: "left" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical stepper */}
      <div className="flex sm:hidden flex-col items-start gap-0 mb-10 ml-6">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = stepIndex >= i;
          const isCurrent = stepIndex === i;
          return (
            <div key={t(step.labelKey)} className="flex items-start">
              <div className="flex flex-col items-center">
                <motion.div
                  className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors duration-500 ${
                    isActive
                      ? "border-blue-400/60 bg-blue-400/10"
                      : "border-gray-700 bg-gray-800/50"
                  }`}
                  animate={
                    isCurrent
                      ? { boxShadow: ["0 0 0px rgba(59,130,246,0)", "0 0 12px rgba(59,130,246,0.4)", "0 0 0px rgba(59,130,246,0)"] }
                      : { boxShadow: "0 0 0px rgba(59,130,246,0)" }
                  }
                  transition={isCurrent ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
                >
                  <Icon className={`h-3.5 w-3.5 transition-colors duration-500 ${isActive ? "text-blue-400" : "text-gray-600"}`} />
                </motion.div>
                {i < STEPS.length - 1 && (
                  <div className="w-px h-6 relative">
                    <div className="absolute inset-0 bg-gray-700" />
                    <motion.div
                      className="absolute inset-0 w-full bg-blue-400/50"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: stepIndex > i ? 1 : 0 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      style={{ transformOrigin: "top" }}
                    />
                  </div>
                )}
              </div>
              <span
                className={`ml-3 text-xs font-medium mt-1.5 transition-colors duration-500 ${
                  isCurrent ? "text-blue-400" : isActive ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {t(step.labelKey)}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
