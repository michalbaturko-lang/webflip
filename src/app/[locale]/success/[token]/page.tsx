"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { CheckCircle, ArrowRight, FileText } from "lucide-react";
import { motion } from "framer-motion";

export default function SuccessPage() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const t = useTranslations("success");
  const locale = useLocale();

  const isReportPurchase = searchParams.get("product") === "analysis-report";

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
          {isReportPurchase ? t("reportTitle") : t("title")}
        </h1>

        <p
          className="text-base mb-8 leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          {isReportPurchase ? t("reportDescription") : t("description")}
        </p>

        <div
          className="glass rounded-xl p-4 mb-8 text-left text-sm space-y-2"
          style={{ color: "var(--text-muted)" }}
        >
          {isReportPurchase ? (
            <>
              <p>{t("reportNextStep1")}</p>
              <p>{t("reportNextStep2")}</p>
              <p>{t("reportNextStep3")}</p>
            </>
          ) : (
            <>
              <p>{t("nextStep1")}</p>
              <p>{t("nextStep2")}</p>
              <p>{t("nextStep3")}</p>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={`/${locale}/analyze/${params.token}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold transition-colors"
          >
            {isReportPurchase ? t("backToReport") : t("backToPreview")}
            <ArrowRight className="h-4 w-4" />
          </a>
          {isReportPurchase && (
            <a
              href={`/api/analyze/${params.token}/report-pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-green-500/30 bg-green-500/10 text-green-400 font-semibold hover:bg-green-500/20 transition-colors"
            >
              <FileText className="h-4 w-4" />
              {t("downloadReport")}
            </a>
          )}
        </div>
      </motion.div>
    </div>
  );
}
