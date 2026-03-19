"use client";

import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { CheckCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function SuccessPage() {
  const params = useParams<{ token: string }>();
  const t = useTranslations("success");
  const locale = useLocale();

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg-primary)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass rounded-2xl p-8 md:p-12 max-w-lg w-full text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <h1
          className="text-2xl md:text-3xl font-bold mb-3"
          style={{ color: "var(--text-primary)" }}
        >
          {t("title")}
        </h1>

        <p
          className="text-base mb-8 leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          {t("description")}
        </p>

        <div
          className="glass rounded-xl p-4 mb-8 text-left text-sm space-y-2"
          style={{ color: "var(--text-muted)" }}
        >
          <p>{t("nextStep1")}</p>
          <p>{t("nextStep2")}</p>
          <p>{t("nextStep3")}</p>
        </div>

        <a
          href={`/${locale}/analyze/${params.token}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold transition-colors"
        >
          {t("backToPreview")}
          <ArrowRight className="h-4 w-4" />
        </a>
      </motion.div>
    </div>
  );
}
