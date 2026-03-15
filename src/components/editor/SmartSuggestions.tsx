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

export default function SmartSuggestions({
  iframeRef,
  onApply,
  isVisible,
  onClose,
}: SmartSuggestionsProps) {
  const [htmlContent, setHtmlContent] = useState("");
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  // Extract HTML from iframe for analysis
  useEffect(() => {
    if (!isVisible || !iframeRef.current) return;

    const extractHtml = () => {
      try {
        const doc = iframeRef.current?.contentDocument;
        if (doc?.body) {
          setHtmlContent(doc.documentElement.outerHTML.toLowerCase());
        }
      } catch {
        // Cross-origin - try to read from srcdoc
        const srcdoc = iframeRef.current?.getAttribute("srcdoc");
        if (srcdoc) setHtmlContent(srcdoc.toLowerCase());
      }
    };

    extractHtml();
    // Re-analyze after iframe loads
    const iframe = iframeRef.current;
    iframe.addEventListener("load", extractHtml);
    return () => iframe.removeEventListener("load", extractHtml);
  }, [isVisible, iframeRef]);

  const suggestions = useMemo((): Suggestion[] => {
    if (!htmlContent) return [];

    const result: Suggestion[] = [];

    // Check for missing opening hours
    const hasHours =
      htmlContent.includes("hodiny") ||
      htmlContent.includes("hours") ||
      htmlContent.includes("otevir") ||
      htmlContent.includes("provozni");
    if (!hasHours) {
      result.push({
        id: "add-hours",
        icon: <Clock className="h-4 w-4" />,
        title: "Oteviraci doba",
        description: "Stranka neobsahuje informace o oteviraci dobe.",
        instruction:
          "Pridej sekci s oteviraci dobou (Pondeli-Patek 9:00-17:00, Sobota 9:00-12:00, Nedele zavreno) pred paticku.",
        priority: "high",
      });
    }

    // Check for contact form
    const hasForm =
      htmlContent.includes("<form") ||
      htmlContent.includes("formular") ||
      htmlContent.includes("contact form");
    if (!hasForm) {
      result.push({
        id: "add-form",
        icon: <MessageSquare className="h-4 w-4" />,
        title: "Kontaktni formular",
        description: "Chybi kontaktni formular pro snadne osloveni.",
        instruction:
          "Pridej kontaktni formular s polozkami Jmeno, Email, Zprava a tlacitkem Odeslat do kontaktni sekce.",
        priority: "high",
      });
    }

    // Check for gallery
    const hasGallery =
      htmlContent.includes("gallery") ||
      htmlContent.includes("galerie") ||
      htmlContent.includes("portfolio") ||
      htmlContent.includes("lightbox");
    if (!hasGallery) {
      result.push({
        id: "add-gallery",
        icon: <Image className="h-4 w-4" />,
        title: "Fotogalerie",
        description: "Pridejte fotogalerii pro vizualni prezentaci.",
        instruction:
          "Pridej sekci fotogalerie s 6 placeholder obrazky v gridu 3x2 s hover efektem pred paticku.",
        priority: "medium",
      });
    }

    // Check for map
    const hasMap =
      htmlContent.includes("maps") ||
      htmlContent.includes("mapa") ||
      htmlContent.includes("iframe") ||
      htmlContent.includes("map");
    if (!hasMap) {
      result.push({
        id: "add-map",
        icon: <MapPin className="h-4 w-4" />,
        title: "Mapa",
        description: "Pridejte mapu pro snazsi nalezeni provozovny.",
        instruction:
          "Pridej Google Maps iframe s placeholder lokaci do kontaktni sekce.",
        priority: "medium",
      });
    }

    // Check for testimonials
    const hasTestimonials =
      htmlContent.includes("testimonial") ||
      htmlContent.includes("recenze") ||
      htmlContent.includes("reference") ||
      htmlContent.includes("hodnoceni");
    if (!hasTestimonials) {
      result.push({
        id: "add-testimonials",
        icon: <Star className="h-4 w-4" />,
        title: "Reference zakazniku",
        description: "Pridejte reference pro zvyseni duveryhodnosti.",
        instruction:
          "Pridej sekci s 3 referencemi zakazniku - kazda s citaci, jmenem a hodnocenim hvezdami.",
        priority: "medium",
      });
    }

    // Check for phone link
    const hasPhoneLink = htmlContent.includes("tel:");
    const hasPhone =
      htmlContent.includes("telefon") || htmlContent.includes("phone");
    if (hasPhone && !hasPhoneLink) {
      result.push({
        id: "add-phone-link",
        icon: <Phone className="h-4 w-4" />,
        title: "Klikaci telefonni cislo",
        description: "Telefonni cislo neni klikaci pro mobilni zarizeni.",
        instruction:
          "Obal vsechna telefonni cisla na strance do odkazu s tel: protokolem pro snadne volani z mobilu.",
        priority: "low",
      });
    }

    // Check for FAQ
    const hasFaq =
      htmlContent.includes("faq") ||
      htmlContent.includes("otazk") ||
      htmlContent.includes("dotaz");
    if (!hasFaq) {
      result.push({
        id: "add-faq",
        icon: <FileText className="h-4 w-4" />,
        title: "Caste dotazy (FAQ)",
        description: "Sekce FAQ zlepsi SEO a zodpovi bezne otazky.",
        instruction:
          "Pridej sekci Caste dotazy s 5 otazkami a odpovedi relevantnimi pro tento typ podnikani s accordion stylem.",
        priority: "low",
      });
    }

    // Performance suggestion
    const hasLazyLoad = htmlContent.includes("loading=\"lazy\"");
    const imgCount = (htmlContent.match(/<img/g) || []).length;
    if (imgCount > 3 && !hasLazyLoad) {
      result.push({
        id: "add-lazy-load",
        icon: <Zap className="h-4 w-4" />,
        title: "Lazy loading obrazku",
        description: `${imgCount} obrazku bez lazy loadingu muze zpomalit nacitani.`,
        instruction:
          'Pridej atribut loading="lazy" vsem obrazkum na strance krome prvniho hero obrazku.',
        priority: "low",
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return result;
  }, [htmlContent]);

  if (!isVisible) return null;

  const filteredSuggestions = suggestions.filter((s) => !appliedIds.has(s.id));

  return (
    <div
      className="fixed left-6 bottom-6 z-50 w-[360px] max-h-[450px] rounded-2xl shadow-2xl shadow-black/50 border border-white/10 overflow-hidden flex flex-col"
      style={{
        background:
          "linear-gradient(180deg, rgba(15, 15, 25, 0.98) 0%, rgba(10, 10, 20, 0.99) 100%)",
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          <span className="font-semibold text-sm text-white">
            Chytre navrhy
          </span>
          {filteredSuggestions.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
              {filteredSuggestions.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Suggestions list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredSuggestions.length === 0 ? (
          <div className="text-center py-8">
            <Lightbulb className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">
              Vsechny navrhy byly aplikovany!
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
                          ? "Dulezite"
                          : suggestion.priority === "medium"
                          ? "Doporuceno"
                          : "Volitelne"}
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
                    className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-white transition-all hover:brightness-110 active:scale-[0.98]"
                    style={{
                      background:
                        "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
                    }}
                  >
                    Aplikovat
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
