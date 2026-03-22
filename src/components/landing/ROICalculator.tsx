"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Paintbrush,
  Code,
  PenTool,
  Search,
  Check,
  ArrowRight,
  Clock,
  Zap,
} from "lucide-react";

export default function ROICalculator() {
  const t = useTranslations("roi");

  const traditionalItems = [
    { icon: Paintbrush, label: t("designer"), price: t("designerPrice") },
    { icon: Code, label: t("developer"), price: t("developerPrice") },
    { icon: PenTool, label: t("copywriter"), price: t("copywriterPrice") },
    { icon: Search, label: t("seoAudit"), price: t("seoAuditPrice") },
  ];

  const includes = [
    t("includes1"),
    t("includes2"),
    t("includes3"),
    t("includes4"),
    t("includes5"),
  ];

  return (
    <section id="pricing" className="relative py-32 overflow-hidden">
      {/* Section divider */}
      <div className="section-divider mb-32" />

      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[800px] rounded-full bg-purple-500/[0.04] blur-[180px]" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
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

        {/* Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Traditional */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-8"
          >
            <div className="flex items-center gap-2 mb-8">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                Traditional Way
              </span>
            </div>

            <div className="space-y-0">
              {traditionalItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-4 border-b border-white/[0.04] last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-gray-600" />
                    <span className="text-gray-400">{item.label}</span>
                  </div>
                  <span className="font-medium text-gray-500 tabular-nums">
                    {item.price}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-6 mt-4 border-t border-white/[0.08]">
              <span className="font-semibold text-lg text-gray-300">
                {t("totalTraditional")}
              </span>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-400/80 line-through decoration-2">
                  {t("totalTraditionalPrice")}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {t("totalTraditionalTime")}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Webflipper */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            className="relative rounded-2xl bg-white/[0.03] border border-blue-500/20 p-8 overflow-hidden"
          >
            {/* Gradient glow behind card */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent blur-xl -z-10" />

            <div className="flex items-center gap-2 mb-8">
              <Zap className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-blue-400 uppercase tracking-wider font-medium">
                Webflipper
              </span>
            </div>

            <div className="mb-8">
              <div className="text-5xl sm:text-6xl font-bold gradient-text mb-2">
                {t("webflipperPrice")}
              </div>
              <div className="text-gray-400 text-sm">{t("webflipperIncludes")}</div>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5" />
                {t("webflipperTime")}
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {includes.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-blue-400" />
                  </div>
                  <span className="text-gray-400 text-sm">{item}</span>
                </div>
              ))}
            </div>

            <a
              href="#hero"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-blue-500 py-4 text-base font-semibold text-white hover:bg-blue-400 transition-all pulse-glow"
            >
              {t("badge")}
              <ArrowRight className="h-4 w-4" />
            </a>
          </motion.div>
        </div>

        {/* No risk note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-gray-600 mt-10 text-sm"
        >
          {t("noRisk")}
        </motion.p>
      </div>
    </section>
  );
}
