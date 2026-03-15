"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Link, Search, Palette } from "lucide-react";

export default function HowItWorks() {
  const t = useTranslations("howItWorks");

  const steps = [
    {
      icon: Link,
      title: t("step1Title"),
      desc: t("step1Desc"),
      color: "text-blue-400",
      glow: "bg-blue-500/20",
      border: "border-blue-500/20",
    },
    {
      icon: Search,
      title: t("step2Title"),
      desc: t("step2Desc"),
      color: "text-purple-400",
      glow: "bg-purple-500/20",
      border: "border-purple-500/20",
    },
    {
      icon: Palette,
      title: t("step3Title"),
      desc: t("step3Desc"),
      color: "text-emerald-400",
      glow: "bg-emerald-500/20",
      border: "border-emerald-500/20",
    },
  ];

  return (
    <section id="how-it-works" className="relative py-32 overflow-hidden">
      {/* Section divider top */}
      <div className="section-divider mb-32" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-20"
        >
          <span className="inline-flex items-center rounded-full bg-white/[0.06] border border-white/[0.08] px-4 py-1.5 text-xs font-medium text-gray-400 tracking-wide uppercase mb-6">
            {t("badge")}
          </span>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            {t("title")}
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            {t("subtitle")}
          </p>
        </motion.div>

        {/* Steps - vertical timeline on mobile, horizontal on desktop */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-[60px] left-[16.67%] right-[16.67%] h-px">
            <div className="h-full bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-emerald-500/30" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.2, duration: 0.6 }}
                className="relative text-center"
              >
                {/* Step number circle */}
                <div className="relative inline-flex items-center justify-center mb-8">
                  <div className={`absolute inset-0 rounded-full ${step.glow} blur-xl scale-150`} />
                  <div className={`relative h-[72px] w-[72px] rounded-full bg-white/[0.04] border ${step.border} flex items-center justify-center`}>
                    <span className={`text-2xl font-bold ${step.color}`}>{i + 1}</span>
                  </div>
                </div>

                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <step.icon className={`h-5 w-5 ${step.color} opacity-60`} />
                </div>

                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
