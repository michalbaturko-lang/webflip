"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Link, Search, Palette, Rocket, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import type { AnalysisStatus } from "@/types/stepper";
import { statusToStep } from "@/types/stepper";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ConversionStepperProps {
  analysisStatus?: AnalysisStatus;
  currentStep?: number;
  variantCount?: number;
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Step config using CSS variables for theme-awareness
// ---------------------------------------------------------------------------

const ICONS = [Link, Search, Palette, Rocket] as const;

const STEP_VARS = [
  { color: "var(--stepper-color-1)", glow: "var(--stepper-glow-1)", border: "var(--stepper-border-1)" },
  { color: "var(--stepper-color-2)", glow: "var(--stepper-glow-2)", border: "var(--stepper-border-2)" },
  { color: "var(--stepper-color-3)", glow: "var(--stepper-glow-3)", border: "var(--stepper-border-3)" },
  { color: "var(--stepper-color-4)", glow: "var(--stepper-glow-4)", border: "var(--stepper-border-4)" },
];

const SCROLL_TARGETS = ["#hero", "#analysis-results", "#analysis-results", "#analysis-results"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveCurrentStep(
  propStep: number | undefined,
  status: AnalysisStatus | undefined,
  paramStep: string | null,
): number {
  if (propStep !== undefined) return propStep;
  if (status) {
    const mapped = statusToStep(status);
    return mapped === -1 ? 1 : mapped;
  }
  if (paramStep) {
    const n = parseInt(paramStep, 10);
    if (n >= 1 && n <= 4) return n;
  }
  return 0; // no active step (landing state)
}

function scrollToSection(target: string) {
  const el = document.querySelector(target);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ConversionStepper({
  analysisStatus,
  currentStep: currentStepProp,
  variantCount,
  errorMessage,
}: ConversionStepperProps) {
  const t = useTranslations("conversionStepper");
  const searchParams = useSearchParams();
  const prefersReducedMotion = useReducedMotion();

  const paramStep = searchParams.get("step");
  const active = resolveCurrentStep(currentStepProp, analysisStatus, paramStep);
  const isError = analysisStatus === "error";
  const isLoading = analysisStatus === "crawling" || analysisStatus === "analyzing";
  const isComplete = analysisStatus === "complete";

  const anim = (props: Record<string, unknown>) =>
    prefersReducedMotion ? {} : props;

  const steps = Array.from({ length: 4 }, (_, i) => {
    const idx = i + 1;
    return {
      Icon: ICONS[i],
      vars: STEP_VARS[i],
      title: t(`step${idx}Title`),
      desc: t(`step${idx}Desc`),
      detail: t(`step${idx}Detail`),
      isCompleted: active > idx,
      isCurrent: active === idx,
      isFuture: active < idx,
      isClickable: active > idx, // only completed steps are clickable
    };
  });

  return (
    <section id="how-it-works" className="relative py-32 overflow-hidden">
      <div className="section-divider mb-32" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          {...anim({ initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 } })}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-20"
        >
          <span
            className="inline-flex items-center rounded-full bg-white/[0.06] border border-white/[0.08] px-4 py-1.5 text-xs font-medium tracking-wide uppercase mb-6"
            style={{ color: "var(--text-muted)" }}
          >
            {t("badge")}
          </span>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4" style={{ color: "var(--text-primary)" }}>
            {t("title")}
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
            {t("subtitle")}
          </p>
        </motion.div>

        {/* Desktop: horizontal stepper */}
        <div
          className="hidden md:block"
          role="progressbar"
          aria-valuenow={active}
          aria-valuemin={1}
          aria-valuemax={4}
          aria-label={t("title")}
        >
          <div className="grid grid-cols-4 gap-0">
            {steps.map((step, i) => {
              const Icon = step.Icon;
              const stepColor = isError && step.isCurrent
                ? "var(--stepper-error)"
                : step.vars.color;
              const stepGlow = isError && step.isCurrent
                ? "var(--stepper-error-glow)"
                : step.vars.glow;
              const stepBorder = isError && step.isCurrent
                ? "var(--stepper-error)"
                : step.vars.border;
              const opacity = step.isFuture ? 0.35 : 1;

              return (
                <motion.div
                  key={i}
                  {...anim({
                    initial: { opacity: 0, y: 40 },
                    whileInView: { opacity: 1, y: 0 },
                    transition: { delay: i * 0.15, duration: 0.6 },
                  })}
                  viewport={{ once: true, margin: "-50px" }}
                  className="relative flex flex-col items-center text-center px-4"
                  style={{ opacity }}
                >
                  {/* Connecting line */}
                  {i < 3 && (
                    <motion.div
                      className="absolute top-[36px] left-[calc(50%+36px)] h-[2px] z-0"
                      style={{ width: "calc(100% - 72px)" }}
                      {...anim({
                        initial: { scaleX: 0 },
                        whileInView: { scaleX: step.isCompleted ? 1 : 0 },
                        transition: { delay: 0.4 + i * 0.2, duration: 0.8, ease: "easeOut" },
                      })}
                    >
                      <div
                        className="h-full w-full"
                        style={{
                          background: `linear-gradient(to right, ${STEP_VARS[i].color}, ${STEP_VARS[i + 1].color})`,
                          opacity: 0.4,
                          transformOrigin: "left",
                        }}
                      />
                    </motion.div>
                  )}

                  {/* Step circle — clickable if completed */}
                  <div
                    className={`relative mb-6 z-10 ${step.isClickable ? "cursor-pointer" : ""}`}
                    role="button"
                    tabIndex={step.isClickable ? 0 : -1}
                    aria-label={step.title}
                    onClick={() => step.isClickable && scrollToSection(SCROLL_TARGETS[i])}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && step.isClickable) {
                        e.preventDefault();
                        scrollToSection(SCROLL_TARGETS[i]);
                      }
                    }}
                  >
                    <div
                      className="absolute inset-0 rounded-full blur-xl scale-[2]"
                      style={{ background: stepGlow }}
                    />
                    <div
                      className={`relative h-[72px] w-[72px] rounded-full flex items-center justify-center ${
                        isLoading && step.isCurrent ? "stepper-shimmer" : ""
                      }`}
                      style={{
                        background: "var(--bg-card)",
                        border: `2px solid ${stepBorder}`,
                      }}
                    >
                      {step.isCompleted ? (
                        <CheckCircle className="h-7 w-7" style={{ color: stepColor }} />
                      ) : isError && step.isCurrent ? (
                        <AlertCircle className="h-7 w-7" style={{ color: stepColor }} />
                      ) : (
                        <Icon className="h-7 w-7" style={{ color: stepColor }} />
                      )}
                    </div>
                    {/* Step number badge — 44px touch target */}
                    <div
                      className="absolute -top-1.5 -right-1.5 h-8 w-8 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center shadow-lg"
                      style={{ background: stepColor }}
                    >
                      {/* Variant count badge on step 3 */}
                      {i === 2 && variantCount && variantCount > 0 ? (
                        <span className="text-xs font-bold text-white">{variantCount}</span>
                      ) : (
                        <span className="text-xs font-bold text-white">{i + 1}</span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <h3
                    className="text-lg font-semibold mb-2 line-clamp-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed mb-3 max-w-[200px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {step.desc}
                  </p>

                  {/* Error message on current step */}
                  {isError && step.isCurrent && errorMessage && (
                    <p className="text-xs mb-2 max-w-[200px]" style={{ color: "var(--stepper-error)" }}>
                      {errorMessage}
                    </p>
                  )}

                  {/* Detail chip or CTA */}
                  {i === 3 && isComplete ? (
                    <button
                      onClick={() => scrollToSection("#analysis-results")}
                      className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-colors"
                      style={{ background: "var(--stepper-color-4)" }}
                    >
                      {t("viewResults")}
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  ) : (
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium"
                      style={{
                        color: stepColor,
                        border: `1px solid ${stepBorder}`,
                        background: "var(--bg-card)",
                      }}
                    >
                      {step.detail}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile: vertical stepper */}
        <div
          className="md:hidden flex flex-col gap-0 px-2"
          role="progressbar"
          aria-valuenow={active}
          aria-valuemin={1}
          aria-valuemax={4}
          aria-label={t("title")}
        >
          {steps.map((step, i) => {
            const Icon = step.Icon;
            const stepColor = isError && step.isCurrent
              ? "var(--stepper-error)"
              : step.vars.color;
            const stepGlow = isError && step.isCurrent
              ? "var(--stepper-error-glow)"
              : step.vars.glow;
            const stepBorder = isError && step.isCurrent
              ? "var(--stepper-error)"
              : step.vars.border;
            const opacity = step.isFuture ? 0.35 : 1;

            return (
              <motion.div
                key={i}
                {...anim({
                  initial: { opacity: 0, x: -20 },
                  whileInView: { opacity: 1, x: 0 },
                  transition: { delay: i * 0.12, duration: 0.5 },
                })}
                viewport={{ once: true, margin: "-30px" }}
                className="relative flex gap-4"
                style={{ opacity }}
              >
                {/* Left: circle + line */}
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className={`relative ${step.isClickable ? "cursor-pointer" : ""}`}
                    role="button"
                    tabIndex={step.isClickable ? 0 : -1}
                    aria-label={step.title}
                    onClick={() => step.isClickable && scrollToSection(SCROLL_TARGETS[i])}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && step.isClickable) {
                        e.preventDefault();
                        scrollToSection(SCROLL_TARGETS[i]);
                      }
                    }}
                  >
                    <div
                      className="absolute inset-0 rounded-full blur-lg scale-[2]"
                      style={{ background: stepGlow }}
                    />
                    <div
                      className={`relative h-14 w-14 rounded-full flex items-center justify-center ${
                        isLoading && step.isCurrent ? "stepper-shimmer" : ""
                      }`}
                      style={{
                        background: "var(--bg-card)",
                        border: `2px solid ${stepBorder}`,
                      }}
                    >
                      {step.isCompleted ? (
                        <CheckCircle className="h-5 w-5" style={{ color: stepColor }} />
                      ) : isError && step.isCurrent ? (
                        <AlertCircle className="h-5 w-5" style={{ color: stepColor }} />
                      ) : (
                        <Icon className="h-5 w-5" style={{ color: stepColor }} />
                      )}
                    </div>
                    {/* Step number badge — min 44px touch target */}
                    <div
                      className="absolute -top-1 -right-1 h-7 w-7 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center"
                      style={{ background: stepColor }}
                    >
                      {i === 2 && variantCount && variantCount > 0 ? (
                        <span className="text-[10px] font-bold text-white">{variantCount}</span>
                      ) : (
                        <span className="text-[10px] font-bold text-white">{i + 1}</span>
                      )}
                    </div>
                  </div>
                  {i < 3 && (
                    <motion.div
                      className="w-[2px] flex-1 min-h-[32px] my-1.5"
                      style={{
                        background: step.isCompleted
                          ? `linear-gradient(to bottom, ${STEP_VARS[i].color}, ${STEP_VARS[i + 1].color})`
                          : "var(--border-subtle)",
                        opacity: step.isCompleted ? 0.5 : 1,
                        transformOrigin: "top",
                      }}
                      {...anim({
                        initial: { scaleY: 0 },
                        whileInView: { scaleY: 1 },
                        transition: { delay: 0.3 + i * 0.15, duration: 0.6 },
                      })}
                    />
                  )}
                </div>

                {/* Right: content */}
                <div className="pt-1.5 pb-6 min-w-0">
                  <h3
                    className="text-base font-semibold mb-1 line-clamp-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--text-muted)" }}>
                    {step.desc}
                  </p>

                  {isError && step.isCurrent && errorMessage && (
                    <p className="text-xs mb-2" style={{ color: "var(--stepper-error)" }}>
                      {errorMessage}
                    </p>
                  )}

                  {i === 3 && isComplete ? (
                    <button
                      onClick={() => scrollToSection("#analysis-results")}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white"
                      style={{ background: "var(--stepper-color-4)" }}
                    >
                      {t("viewResults")}
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  ) : (
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                      style={{
                        color: stepColor,
                        border: `1px solid ${stepBorder}`,
                        background: "var(--bg-card)",
                      }}
                    >
                      {step.detail}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
