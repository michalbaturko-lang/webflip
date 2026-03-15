"use client";

import { useTranslations } from "next-intl";
import { Zap } from "lucide-react";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="relative" style={{ borderTop: "1px solid var(--border-primary)" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo + Tagline */}
          <div className="flex flex-col items-center sm:items-start gap-1">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-400" />
              <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Webflip</span>
            </div>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>{t("tagline")}</span>
          </div>

          {/* Links + Copyright */}
          <div className="flex flex-col items-center sm:items-end gap-2">
            <div className="flex items-center gap-6 text-sm" style={{ color: "var(--text-muted)" }}>
              <a
                href="/privacy"
                className="transition-colors hover:opacity-80"
              >
                {t("privacy")}
              </a>
              <a
                href="/terms"
                className="transition-colors hover:opacity-80"
              >
                {t("terms")}
              </a>
            </div>
            <span className="text-sm" style={{ color: "var(--text-faint)" }}>
              &copy; {new Date().getFullYear()} Webflip. {t("rights")}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
