"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Globe } from "lucide-react";

export default function FinalCTA() {
  const t = useTranslations("finalCta");
  const tHero = useTranslations("hero");
  const locale = useLocale();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setIsLoading(true);
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    const token = btoa(normalizedUrl).replace(/[/+=]/g, "").slice(0, 12) + Date.now().toString(36);
    router.push(`/${locale}/analyze/${token}?url=${encodeURIComponent(normalizedUrl)}`);
  };

  return (
    <section className="relative py-32 overflow-hidden">
      {/* Section divider */}
      <div className="section-divider mb-32" />

      {/* Background glow */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-blue-500/[0.08] blur-[180px]" />
        <div className="absolute top-1/3 left-1/4 h-[200px] w-[200px] rounded-full bg-purple-500/[0.05] blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            {t("title")}
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto mb-12">
            {t("subtitle")}
          </p>
        </motion.div>

        {/* URL Input */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mx-auto max-w-2xl"
        >
          <div className="glow-border flex items-center rounded-2xl bg-white/[0.04] border border-white/[0.08] p-2">
            <div className="flex items-center gap-3 flex-1 px-4">
              <Globe className="h-5 w-5 text-gray-600 shrink-0" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={tHero("inputPlaceholder")}
                className="w-full bg-transparent text-white placeholder-gray-600 outline-none text-base sm:text-lg py-3"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="shrink-0 flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold text-white hover:bg-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed pulse-glow"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {tHero("ctaLoading")}
                </>
              ) : (
                <>
                  {t("cta")}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </motion.form>
      </div>
    </section>
  );
}
