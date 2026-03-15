"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Gauge,
  Search,
  Shield,
  Monitor,
  FileText,
  Bot,
} from "lucide-react";

export default function AnalysisDemo() {
  const t = useTranslations("analysisDemo");

  const categories = [
    {
      icon: Gauge,
      label: t("performance"),
      score: 34,
      items: t("performanceItems"),
      color: "text-red-400",
      accent: "#ef4444",
      span: "lg:col-span-2",
    },
    {
      icon: Search,
      label: t("seo"),
      score: 52,
      items: t("seoItems"),
      color: "text-yellow-400",
      accent: "#eab308",
      span: "",
    },
    {
      icon: Shield,
      label: t("security"),
      score: 78,
      items: t("securityItems"),
      color: "text-emerald-400",
      accent: "#22c55e",
      span: "",
    },
    {
      icon: Monitor,
      label: t("ux"),
      score: 41,
      items: t("uxItems"),
      color: "text-orange-400",
      accent: "#f97316",
      span: "lg:col-span-2",
    },
    {
      icon: FileText,
      label: t("content"),
      score: 65,
      items: t("contentItems"),
      color: "text-blue-400",
      accent: "#3b82f6",
      span: "lg:col-span-2",
    },
    {
      icon: Bot,
      label: t("aiVisibility"),
      score: 23,
      items: t("aiVisibilityItems"),
      color: "text-purple-400",
      accent: "#8b5cf6",
      span: "",
    },
  ];

  return (
    <section id="analysis" className="relative py-32 overflow-hidden">
      {/* Section divider */}
      <div className="section-divider mb-32" />

      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[800px] rounded-full bg-blue-500/[0.04] blur-[180px]" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
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
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </motion.div>

        {/* Bento grid - varied sizes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className={`group relative rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 hover:bg-white/[0.04] transition-all duration-500 ${cat.span}`}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
                style={{
                  background: `radial-gradient(400px circle at 50% 50%, ${cat.accent}08, transparent)`,
                }}
              />

              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${cat.accent}10` }}>
                    <cat.icon className={`h-5 w-5 ${cat.color}`} />
                  </div>
                  <span className="font-medium text-gray-300">{cat.label}</span>
                </div>
              </div>

              {/* Score */}
              <div className="flex items-baseline gap-2 mb-3">
                <span className={`text-4xl font-bold ${cat.color}`}>
                  {cat.score}
                </span>
                <span className="text-sm text-gray-600">/100</span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-white/[0.04] mb-4 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${cat.score}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, delay: 0.3 + i * 0.1, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: cat.accent, opacity: 0.7 }}
                />
              </div>

              <p className="text-sm text-gray-600 leading-relaxed">
                {cat.items}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
