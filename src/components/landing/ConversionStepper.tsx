"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Link, Search, Palette, Rocket } from "lucide-react";

const STEP_CONFIG = [
  {
    icon: Link,
    color: "text-blue-400",
    gradient: "from-blue-500 to-blue-400",
    glow: "bg-blue-500/20",
    border: "border-blue-500/20",
    ring: "rgba(59,130,246,0.3)",
  },
  {
    icon: Search,
    color: "text-purple-400",
    gradient: "from-purple-500 to-purple-400",
    glow: "bg-purple-500/20",
    border: "border-purple-500/20",
    ring: "rgba(139,92,246,0.3)",
  },
  {
    icon: Palette,
    color: "text-emerald-400",
    gradient: "from-emerald-500 to-emerald-400",
    glow: "bg-emerald-500/20",
    border: "border-emerald-500/20",
    ring: "rgba(16,185,129,0.3)",
  },
  {
    icon: Rocket,
    color: "text-amber-400",
    gradient: "from-amber-500 to-amber-400",
    glow: "bg-amber-500/20",
    border: "border-amber-500/20",
    ring: "rgba(245,158,11,0.3)",
  },
];

const LINE_GRADIENTS = [
  "from-blue-500/40 to-purple-500/40",
  "from-purple-500/40 to-emerald-500/40",
  "from-emerald-500/40 to-amber-500/40",
];

export default function ConversionStepper() {
  const t = useTranslations("conversionStepper");

  const steps = STEP_CONFIG.map((cfg, i) => ({
    ...cfg,
    title: t(`step${i + 1}Title`),
    desc: t(`step${i + 1}Desc`),
    detail: t(`step${i + 1}Detail`),
  }));

  return (
    <section id="how-it-works" className="relative py-32 overflow-hidden">
      <div className="section-divider mb-32" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-20"
        >
          <span className="inline-flex items-center rounded-full bg-white/[0.06] border border-white/[0.08] px-4 py-1.5 text-xs font-medium tracking-wide uppercase mb-6" style={{ color: "var(--text-muted)" }}>
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
        <div className="hidden md:block">
          <div className="grid grid-cols-4 gap-0">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: i * 0.15, duration: 0.6 }}
                  className="relative flex flex-col items-center text-center px-4"
                >
                  {/* Connecting line to next step */}
                  {i < steps.length - 1 && (
                    <motion.div
                      className="absolute top-[36px] left-[calc(50%+36px)] h-[2px] z-0"
                      style={{ width: "calc(100% - 72px)" }}
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + i * 0.2, duration: 0.8, ease: "easeOut" }}
                    >
                      <div className={`h-full w-full bg-gradient-to-r ${LINE_GRADIENTS[i]}`} style={{ transformOrigin: "left" }} />
                    </motion.div>
                  )}

                  {/* Step circle */}
                  <motion.div
                    className="relative mb-6 z-10"
                    whileHover={{ scale: 1.08 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className={`absolute inset-0 rounded-full ${step.glow} blur-xl scale-[2]`} />
                    <div
                      className={`relative h-[72px] w-[72px] rounded-full border ${step.border} flex items-center justify-center`}
                      style={{ background: "var(--bg-card)" }}
                    >
                      <Icon className={`h-7 w-7 ${step.color}`} />
                    </div>
                    {/* Step number badge */}
                    <div
                      className={`absolute -top-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg`}
                    >
                      <span className="text-[11px] font-bold text-white">{i + 1}</span>
                    </div>
                  </motion.div>

                  {/* Content */}
                  <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed mb-3 max-w-[200px]" style={{ color: "var(--text-muted)" }}>
                    {step.desc}
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ${step.color} border ${step.border}`}
                    style={{ background: "var(--bg-card)" }}
                  >
                    {step.detail}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile: vertical stepper */}
        <div className="md:hidden flex flex-col gap-0">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="relative flex gap-5"
              >
                {/* Left: circle + line */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className={`absolute inset-0 rounded-full ${step.glow} blur-lg scale-[2]`} />
                    <div
                      className={`relative h-14 w-14 rounded-full border ${step.border} flex items-center justify-center`}
                      style={{ background: "var(--bg-card)" }}
                    >
                      <Icon className={`h-5 w-5 ${step.color}`} />
                    </div>
                    <div
                      className={`absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center`}
                    >
                      <span className="text-[10px] font-bold text-white">{i + 1}</span>
                    </div>
                  </div>
                  {i < steps.length - 1 && (
                    <motion.div
                      className={`w-[2px] flex-1 min-h-[40px] bg-gradient-to-b ${LINE_GRADIENTS[i]} my-2`}
                      initial={{ scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.15, duration: 0.6 }}
                      style={{ transformOrigin: "top" }}
                    />
                  )}
                </div>

                {/* Right: content */}
                <div className="pt-2 pb-8">
                  <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--text-muted)" }}>
                    {step.desc}
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium ${step.color} border ${step.border}`}
                    style={{ background: "var(--bg-card)" }}
                  >
                    {step.detail}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
