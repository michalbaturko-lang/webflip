"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Globe, Shield, Sparkles } from "lucide-react";

export default function Hero() {
  const t = useTranslations("hero");
  const locale = useLocale();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setIsLoading(true);
    // Normalize URL — add https:// if missing
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    const token = btoa(normalizedUrl).replace(/[/+=]/g, "").slice(0, 12) + Date.now().toString(36);
    router.push(`/${locale}/analyze/${token}?url=${encodeURIComponent(normalizedUrl)}`);
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
    >
      {/* Animated gradient blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="gradient-blob absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-blue-600/20 blur-[140px] dark:bg-blue-600/20" />
        <div className="gradient-blob-delay absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-purple-600/15 blur-[140px]" />
        <div className="gradient-blob absolute top-1/3 left-1/2 -translate-x-1/2 h-[400px] w-[400px] rounded-full bg-cyan-500/8 blur-[120px]" />
      </div>

      {/* Dot grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(var(--text-faint) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "var(--text-muted)" }}>{t("badge")}</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-6"
        >
          {t("title")}{" "}
          <span className="gradient-text">{t("titleHighlight")}</span>
          <br />
          {t("titleEnd")}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto max-w-2xl text-base sm:text-lg mb-12 leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          {t("subtitle")}
        </motion.p>

        {/* URL Input */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mx-auto max-w-2xl mb-6"
        >
          <div className="glow-border flex items-center rounded-2xl p-2" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
            <div className="flex items-center gap-3 flex-1 px-4">
              <Globe className="h-5 w-5 shrink-0" style={{ color: "var(--text-faint)" }} />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t("inputPlaceholder")}
                className="w-full bg-transparent outline-none text-base sm:text-lg py-3"
                style={{ color: "var(--text-primary)" }}
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
                  {t("ctaLoading")}
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

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {[
                "from-blue-400 to-blue-600",
                "from-purple-400 to-purple-600",
                "from-cyan-400 to-cyan-600",
                "from-pink-400 to-pink-600",
              ].map((g, i) => (
                <div
                  key={i}
                  className={`h-6 w-6 rounded-full border-2 bg-gradient-to-br ${g}`}
                  style={{ borderColor: "var(--bg-primary)" }}
                />
              ))}
            </div>
            <span>{t("socialProof")}</span>
          </div>
          <div className="hidden sm:block h-4 w-px" style={{ background: "var(--border-primary)" }} />
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-emerald-500" />
            <span>{t("trusted")}</span>
          </div>
        </motion.div>

        {/* Analysis preview */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
          className="mt-20 relative"
        >
          {/* Glow behind preview */}
          <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 via-transparent to-transparent blur-3xl -z-10" />

          <div className="rounded-2xl p-1 mx-auto max-w-4xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}>
            <div className="rounded-xl p-6 sm:p-8" style={{ background: "var(--bg-secondary)" }}>
              {/* Mock browser chrome */}
              <div className="flex items-center gap-2 mb-6">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
                <div className="ml-4 flex-1 h-7 rounded-lg flex items-center px-3" style={{ background: "var(--bg-card)" }}>
                  <span className="text-xs font-mono" style={{ color: "var(--text-faint)" }}>webflip.io/analyze/your-website</span>
                </div>
              </div>
              {/* Mock analysis grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Performance", score: 34, color: "text-red-400", bar: "bg-red-500" },
                  { label: "SEO", score: 52, color: "text-yellow-400", bar: "bg-yellow-500" },
                  { label: "Security", score: 78, color: "text-emerald-400", bar: "bg-emerald-500" },
                  { label: "UX & Design", score: 41, color: "text-orange-400", bar: "bg-orange-500" },
                  { label: "Content", score: 65, color: "text-blue-400", bar: "bg-blue-500" },
                  { label: "AI Visibility", score: 23, color: "text-purple-400", bar: "bg-purple-500" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl p-4"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
                  >
                    <div className={`text-2xl sm:text-3xl font-bold ${item.color} mb-1`}>
                      {item.score}
                    </div>
                    <div className="text-[11px] mb-2 uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>{item.label}</div>
                    <div className="h-1 rounded-full" style={{ background: "var(--border-primary)" }}>
                      <div className={`h-full rounded-full ${item.bar} opacity-60`} style={{ width: `${item.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Fade out at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-24" style={{ background: `linear-gradient(to top, var(--bg-primary), transparent)` }} />
        </motion.div>
      </div>
    </section>
  );
}
