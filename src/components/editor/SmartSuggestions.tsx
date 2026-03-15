"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Lightbulb,
  Clock,
  Phone,
  Image,
  FileText,
  MessageSquare,
  MapPin,
  Star,
  Zap,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface Suggestion {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  instruction: string;
  priority: "high" | "medium" | "low";
}

interface SmartSuggestionsProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onApply: (instruction: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

// Multilingual keyword sets for detection (#11)
const KEYWORDS = {
  hours: ["hodiny", "hodin", "hours", "opening", "otevir", "provozni", "otvár", "öffnungszeiten", "geschäftszeiten"],
  form: ["<form", "formular", "formulář", "formulár", "contact form", "kontaktformular"],
  gallery: ["gallery", "galerie", "galéria", "portfolio", "lightbox", "fotogal"],
  map: ["maps", "mapa", "iframe", "map", "karte"],
  testimonials: ["testimonial", "recenze", "reference", "hodnocen", "hodnoteni", "bewertung", "kundenstimme", "referencie"],
  phone: ["tel:"],
  phoneText: ["telefon", "phone", "telefón", "anruf"],
  faq: ["faq", "otázk", "otazk", "dotaz", "häufig", "frequently", "otázky"],
  lazyLoad: ["loading=\"lazy\""],
};

function matchesAny(content: string, keywords: string[]): boolean {
  return keywords.some((kw) => content.includes(kw));
}

export default function SmartSuggestions({
  iframeRef,
  onApply,
  isVisible,
  onClose,
}: SmartSuggestionsProps) {
  const t = useTranslations("editor");
  const [htmlContent, setHtmlContent] = useState("");
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isVisible || !iframeRef.current) return;

    const iframe = iframeRef.current;

    const extractHtml = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc?.body) {
          setHtmlContent(doc.documentElement.outerHTML.toLowerCase());
        }
      } catch {
        const srcdoc = iframe.getAttribute("srcdoc");
        if (srcdoc) setHtmlContent(srcdoc.toLowerCase());
      }
    };

    extractHtml();
    iframe.addEventListener("load", extractHtml);
    return () => iframe.removeEventListener("load", extractHtml);
  }, [isVisible, iframeRef]);

  const suggestions = useMemo((): Suggestion[] => {
    if (!htmlContent) return [];

    const result: Suggestion[] = [];

    if (!matchesAny(htmlContent, KEYWORDS.hours)) {
      result.push({
        id: "add-hours",
        icon: <Clock className="h-4 w-4" />,
        title: t("suggestHoursTitle"),
        description: t("suggestHoursDesc"),
        instruction: t("suggestHoursInstruction"),
        priority: "high",
      });
    }

    if (!matchesAny(htmlContent, KEYWORDS.form)) {
      result.push({
        id: "add-form",
        icon: <MessageSquare className="h-4 w-4" />,
        title: t("suggestFormTitle"),
        description: t("suggestFormDesc"),
        instruction: t("suggestFormInstruction"),
        priority: "high",
      });
    }

    if (!matchesAny(htmlContent, KEYWORDS.gallery)) {
      result.push({
        id: "add-gallery",
        icon: <Image className="h-4 w-4" />,
        title: t("suggestGalleryTitle"),
        description: t("suggestGalleryDesc"),
        instruction: t("suggestGalleryInstruction"),
        priority: "medium",
      });
    }

    if (!matchesAny(htmlContent, KEYWORDS.map)) {
      result.push({
        id: "add-map",
        icon: <MapPin className="h-4 w-4" />,
        title: t("suggestMapTitle"),
        description: t("suggestMapDesc"),
        instruction: t("suggestMapInstruction"),
        priority: "medium",
      });
    }

    if (!matchesAny(htmlContent, KEYWORDS.testimonials)) {
      result.push({
        id: "add-testimonials",
        icon: <Star className="h-4 w-4" />,
        title: t("suggestTestimonialsTitle"),
        description: t("suggestTestimonialsDesc"),
        instruction: t("suggestTestimonialsInstruction"),
        priority: "medium",
      });
    }

    if (matchesAny(htmlContent, KEYWORDS.phoneText) && !matchesAny(htmlContent, KEYWORDS.phone)) {
      result.push({
        id: "add-phone-link",
        icon: <Phone className="h-4 w-4" />,
        title: t("suggestPhoneTitle"),
        description: t("suggestPhoneDesc"),
        instruction: t("suggestPhoneInstruction"),
        priority: "low",
      });
    }

    if (!matchesAny(htmlContent, KEYWORDS.faq)) {
      result.push({
        id: "add-faq",
        icon: <FileText className="h-4 w-4" />,
        title: t("suggestFaqTitle"),
        description: t("suggestFaqDesc"),
        instruction: t("suggestFaqInstruction"),
        priority: "low",
      });
    }

    const imgCount = (htmlContent.match(/<img/g) || []).length;
    if (imgCount > 3 && !matchesAny(htmlContent, KEYWORDS.lazyLoad)) {
      result.push({
        id: "add-lazy-load",
        icon: <Zap className="h-4 w-4" />,
        title: t("suggestLazyTitle"),
        description: t("suggestLazyDesc", { count: imgCount }),
        instruction: t("suggestLazyInstruction"),
        priority: "low",
      });
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return result;
  }, [htmlContent, t]);

  if (!isVisible) return null;

  const filteredSuggestions = suggestions.filter((s) => !appliedIds.has(s.id));

  return (
    <div
      role="region"
      aria-label={t("suggestionsTitle")}
      className="fixed left-6 bottom-6 z-50 w-[360px] max-h-[450px] rounded-2xl shadow-2xl shadow-black/50 border border-white/10 overflow-hidden flex flex-col"
      style={{
        background:
          "linear-gradient(180deg, rgba(15, 15, 25, 0.98) 0%, rgba(10, 10, 20, 0.99) 100%)",
        backdropFilter: "blur(24px)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          <span className="font-semibold text-sm text-white">
            {t("suggestionsTitle")}
          </span>
          {filteredSuggestions.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
              {filteredSuggestions.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label={t("close")}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredSuggestions.length === 0 ? (
          <div className="text-center py-8">
            <Lightbulb className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">
              {t("suggestionsAllApplied")}
            </p>
          </div>
        ) : (
          filteredSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="rounded-xl border border-white/5 overflow-hidden hover:border-white/10 transition-colors"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div className="px-3 py-2.5">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                      suggestion.priority === "high"
                        ? "bg-red-500/15 text-red-400"
                        : suggestion.priority === "medium"
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-blue-500/15 text-blue-400"
                    }`}
                  >
                    {suggestion.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-white">
                        {suggestion.title}
                      </p>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                          suggestion.priority === "high"
                            ? "bg-red-500/15 text-red-400"
                            : suggestion.priority === "medium"
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-blue-500/15 text-blue-400"
                        }`}
                      >
                        {suggestion.priority === "high"
                          ? t("suggestPriorityHigh")
                          : suggestion.priority === "medium"
                          ? t("suggestPriorityMedium")
                          : t("suggestPriorityLow")}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                      {suggestion.description}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => {
                      onApply(suggestion.instruction);
                      setAppliedIds((prev) => new Set([...prev, suggestion.id]));
                    }}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-white transition-all hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                    style={{
                      background:
                        "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
                    }}
                  >
                    {t("suggestApply")}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
