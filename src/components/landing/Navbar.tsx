"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Zap, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function Navbar() {
  const t = useTranslations("nav");
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const links = [
    { href: "#how-it-works", label: t("howItWorks") },
    { href: "#analysis", label: t("analysis") },
    { href: "#pricing", label: t("pricing") },
    { href: "#faq", label: t("faq") },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <a href="#" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Webflip</span>
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
              >
                {link.label}
              </a>
            ))}

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors"
              style={{ color: "var(--text-muted)", background: "var(--bg-card)" }}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            <a
              href="#hero"
              className="rounded-full bg-blue-500 px-5 py-2 text-sm font-medium text-white hover:bg-blue-400 transition-colors"
            >
              {t("startFree")}
            </a>
          </div>

          {/* Mobile buttons */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors"
              style={{ color: "var(--text-muted)", background: "var(--bg-card)" }}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2"
              style={{ color: "var(--text-muted)" }}
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden glass overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block text-sm transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#hero"
                onClick={() => setIsOpen(false)}
                className="block rounded-full bg-blue-500 px-5 py-2 text-sm font-medium text-white text-center hover:bg-blue-400 transition-colors"
              >
                {t("startFree")}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
