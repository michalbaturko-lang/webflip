"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

export default function FAQ() {
  const t = useTranslations("faq");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  const items = Array.from({ length: 8 }, (_, i) => ({
    question: t(`q${i + 1}`),
    answer: t(`a${i + 1}`),
  }));

  return (
    <section id="faq" className="relative py-32 overflow-hidden">
      {/* Section divider */}
      <div className="section-divider mb-32" />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-medium tracking-wide uppercase mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", color: "var(--text-muted)" }}>
            {t("badge")}
          </span>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {t("title")}
          </h2>
        </div>

        {/* Accordion — no whileInView delays to fix rendering bug */}
        <div className="space-y-2">
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded-xl transition-colors duration-300"
              style={{
                background: openIndex === i ? "var(--bg-card)" : "var(--bg-secondary)",
                border: `1px solid var(--border-primary)`,
                opacity: openIndex === i ? 1 : 0.8,
              }}
            >
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="font-medium text-[15px]" style={{ color: "var(--text-primary)" }}>
                  {item.question}
                </span>
                <motion.div
                  animate={{ rotate: openIndex === i ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0"
                >
                  <ChevronDown className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 leading-relaxed text-[15px]" style={{ color: "var(--text-muted)" }}>
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
