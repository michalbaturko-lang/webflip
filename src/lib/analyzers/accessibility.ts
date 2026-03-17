import * as cheerio from "cheerio";
import type { CategoryScore, Finding } from "../supabase";

interface CrawledPage {
  url: string;
  title: string;
  markdown: string;
  html: string;
}

// ─── WCAG 2.1 Luminance & Contrast ───

function parseColor(color: string): [number, number, number] | null {
  // #rgb
  let m = color.match(/^#([0-9a-f]{3})$/i);
  if (m) {
    const hex = m[1];
    return [
      parseInt(hex[0] + hex[0], 16),
      parseInt(hex[1] + hex[1], 16),
      parseInt(hex[2] + hex[2], 16),
    ];
  }
  // #rrggbb
  m = color.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    const hex = m[1];
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  // rgb(r, g, b)
  m = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) {
    return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
  }
  // Named colors (common subset)
  const named: Record<string, [number, number, number]> = {
    white: [255, 255, 255],
    black: [0, 0, 0],
    red: [255, 0, 0],
    green: [0, 128, 0],
    blue: [0, 0, 255],
    yellow: [255, 255, 0],
    gray: [128, 128, 128],
    grey: [128, 128, 128],
    silver: [192, 192, 192],
    navy: [0, 0, 128],
    orange: [255, 165, 0],
  };
  return named[color.toLowerCase().trim()] ?? null;
}

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function extractStyleProp(style: string, prop: string): string | null {
  const regex = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, "i");
  const m = style.match(regex);
  return m ? m[1].trim() : null;
}

function isLargeText(el: any, $: cheerio.CheerioAPI): boolean {
  const style = $(el).attr("style") || "";
  const fontSize = extractStyleProp(style, "font-size");
  const fontWeight = extractStyleProp(style, "font-weight");
  const tag = el.tagName?.toLowerCase() || "";

  // Heading tags are treated as large text
  if (/^h[1-3]$/.test(tag)) return true;

  if (fontSize) {
    const ptMatch = fontSize.match(/([\d.]+)\s*pt/);
    const pxMatch = fontSize.match(/([\d.]+)\s*px/);
    if (ptMatch) {
      const pt = parseFloat(ptMatch[1]);
      const isBold = fontWeight === "bold" || parseInt(fontWeight || "0") >= 700;
      return pt >= 18 || (pt >= 14 && isBold);
    }
    if (pxMatch) {
      const px = parseFloat(pxMatch[1]);
      const pt = px * 0.75;
      const isBold = fontWeight === "bold" || parseInt(fontWeight || "0") >= 700;
      return pt >= 18 || (pt >= 14 && isBold);
    }
  }
  return false;
}

const GENERIC_LINK_TEXTS = new Set([
  "click here", "here", "read more", "more", "link", "learn more",
  "details", "info", "this", "klikněte zde", "zde", "více",
  "čtěte dále", "čtěte více", "odkaz", "sem",
]);

// ─── Main Analyzer ───

export function analyzeAccessibility(pages: CrawledPage[]): CategoryScore {
  const findings: Finding[] = [];
  const category = "Přístupnost";

  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  function addFinding(severity: Finding["severity"], title: string, description: string) {
    findings.push({ category, severity, title, description });
    if (severity === "critical") criticalCount++;
    else if (severity === "warning") warningCount++;
    else if (severity === "info") infoCount++;
  }

  for (const page of pages) {
    const $ = cheerio.load(page.html);
    const pageLabel = pages.length > 1 ? ` (${page.url})` : "";

    // ════════════════════════════════════════
    // PERCEIVABLE (WCAG 1.x)
    // ════════════════════════════════════════

    // 1.1.1 — Images without alt text (critical)
    const images = $("img");
    const imagesNoAlt = images.filter((_, el) => {
      const alt = $(el).attr("alt");
      const role = $(el).attr("role");
      // Decorative images with role=presentation or empty alt are OK
      if (role === "presentation" || role === "none") return false;
      return alt === undefined;
    });
    if (imagesNoAlt.length > 0) {
      addFinding(
        "critical",
        `Obrázky bez alt textu${pageLabel}`,
        `Nalezeno ${imagesNoAlt.length} obrázků bez atributu alt. Čtečky obrazovky nemohou sdělit obsah obrázku. (WCAG 1.1.1)`
      );
    }

    // 1.3.1 — Missing labels for form inputs (critical)
    const inputs = $("input, select, textarea").filter((_, el) => {
      const type = $(el).attr("type")?.toLowerCase();
      return type !== "hidden" && type !== "submit" && type !== "button" && type !== "reset" && type !== "image";
    });
    const inputsNoLabel = inputs.filter((_, el) => {
      const id = $(el).attr("id");
      const ariaLabel = $(el).attr("aria-label");
      const ariaLabelledBy = $(el).attr("aria-labelledby");
      const title = $(el).attr("title");
      const hasWrappingLabel = $(el).closest("label").length > 0;
      const hasLinkedLabel = id ? $(`label[for="${id}"]`).length > 0 : false;
      return !ariaLabel && !ariaLabelledBy && !title && !hasWrappingLabel && !hasLinkedLabel;
    });
    if (inputsNoLabel.length > 0) {
      addFinding(
        "critical",
        `Formulářové prvky bez popisku${pageLabel}`,
        `Nalezeno ${inputsNoLabel.length} vstupních polí bez přiřazeného <label>, aria-label nebo title. (WCAG 1.3.1)`
      );
    }

    // 3.1.1 — Missing lang attribute on <html> (critical)
    const lang = $("html").attr("lang");
    if (!lang) {
      addFinding(
        "critical",
        `Chybí atribut lang na <html>${pageLabel}`,
        "Element <html> nemá atribut lang. Čtečky obrazovky nemohou určit jazyk stránky. (WCAG 3.1.1)"
      );
    }

    // 1.4.3 — Color contrast check (warning)
    const textElements = $("[style]").filter((_, el) => {
      const style = $(el).attr("style") || "";
      return style.includes("color") && style.includes("background");
    });
    textElements.each((_, el) => {
      const style = $(el).attr("style") || "";
      const fg = extractStyleProp(style, "(?<!background-)color");
      const bg = extractStyleProp(style, "background-color") || extractStyleProp(style, "background");
      if (!fg || !bg) return;

      const fgRgb = parseColor(fg);
      const bgRgb = parseColor(bg);
      if (!fgRgb || !bgRgb) return;

      const fgLum = relativeLuminance(...fgRgb);
      const bgLum = relativeLuminance(...bgRgb);
      const ratio = contrastRatio(fgLum, bgLum);
      const isLarge = isLargeText(el, $);
      const required = isLarge ? 3 : 4.5;

      if (ratio < required) {
        addFinding(
          "warning",
          `Nedostatečný barevný kontrast${pageLabel}`,
          `Kontrastní poměr ${ratio.toFixed(2)}:1 (požadováno ${required}:1 pro ${isLarge ? "velký" : "normální"} text). Barvy: ${fg} na ${bg}. (WCAG 1.4.3)`
        );
      }
    });

    // 1.2.2 — Missing video captions (warning)
    const videos = $("video");
    const videosNoCaptions = videos.filter((_, el) => {
      return $(el).find("track[kind='captions'], track[kind='subtitles']").length === 0;
    });
    if (videosNoCaptions.length > 0) {
      addFinding(
        "warning",
        `Videa bez titulků${pageLabel}`,
        `Nalezeno ${videosNoCaptions.length} videí bez elementu <track> s titulky. (WCAG 1.2.2)`
      );
    }

    // ════════════════════════════════════════
    // OPERABLE (WCAG 2.x)
    // ════════════════════════════════════════

    // 2.4.1 — No skip navigation link (warning)
    const firstLinks = $("a").slice(0, 5);
    let hasSkipNav = false;
    firstLinks.each((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().toLowerCase();
      if (href.startsWith("#") && (text.includes("skip") || text.includes("přeskočit") || text.includes("hlavní"))) {
        hasSkipNav = true;
      }
    });
    if (!hasSkipNav) {
      addFinding(
        "warning",
        `Chybí odkaz pro přeskočení navigace${pageLabel}`,
        "Na začátku stránky nebyl nalezen skip-to-content odkaz. Uživatelé klávesnice musí procházet celou navigaci. (WCAG 2.4.1)"
      );
    }

    // 2.4.4 — Empty links without text or aria-label (critical)
    const allLinks = $("a");
    let emptyLinkCount = 0;
    allLinks.each((_, el) => {
      const text = $(el).text().trim();
      const ariaLabel = $(el).attr("aria-label")?.trim();
      const ariaLabelledBy = $(el).attr("aria-labelledby");
      const title = $(el).attr("title")?.trim();
      const imgAlt = $(el).find("img[alt]").attr("alt")?.trim();
      const svgTitle = $(el).find("svg title").text().trim();
      if (!text && !ariaLabel && !ariaLabelledBy && !title && !imgAlt && !svgTitle) {
        emptyLinkCount++;
      }
    });
    if (emptyLinkCount > 0) {
      addFinding(
        "critical",
        `Prázdné odkazy bez textu${pageLabel}`,
        `Nalezeno ${emptyLinkCount} odkazů bez jakéhokoli přístupného textu (text, aria-label, title, img alt). (WCAG 2.4.4)`
      );
    }

    // 2.4.4 — Generic link text (warning)
    let genericLinkCount = 0;
    allLinks.each((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      if (text && GENERIC_LINK_TEXTS.has(text)) {
        genericLinkCount++;
      }
    });
    if (genericLinkCount > 0) {
      addFinding(
        "warning",
        `Nespecifický text odkazu${pageLabel}`,
        `Nalezeno ${genericLinkCount} odkazů s generickým textem (např. "klikněte zde", "více"). Odkaz by měl popisovat svůj cíl. (WCAG 2.4.4)`
      );
    }

    // 4.1.2 — onclick on non-interactive elements without role (critical)
    const onclickElements = $("[onclick]");
    let onclickNoRoleCount = 0;
    onclickElements.each((_, el) => {
      const tag = el.tagName?.toLowerCase();
      const interactiveTags = new Set(["a", "button", "input", "select", "textarea", "summary"]);
      if (interactiveTags.has(tag)) return;
      const role = $(el).attr("role");
      const tabindex = $(el).attr("tabindex");
      if (!role && !tabindex) {
        onclickNoRoleCount++;
      }
    });
    if (onclickNoRoleCount > 0) {
      addFinding(
        "critical",
        `Klikací prvky bez role=${'"'}button${'"'}${pageLabel}`,
        `Nalezeno ${onclickNoRoleCount} neinteraktivních prvků s onclick bez role="button" a tabindex. Nejsou přístupné klávesnicí. (WCAG 4.1.2)`
      );
    }

    // ════════════════════════════════════════
    // UNDERSTANDABLE (WCAG 3.x)
    // ════════════════════════════════════════

    // 3.3.1 — Forms without error messages (warning)
    const forms = $("form");
    if (forms.length > 0) {
      const hasErrorPattern = $("[role='alert'], [aria-live], .error, .form-error, .field-error, [aria-invalid], [aria-describedby]").length > 0;
      if (!hasErrorPattern) {
        addFinding(
          "warning",
          `Formuláře bez chybových zpráv${pageLabel}`,
          "Formuláře na stránce neobsahují vzory pro zobrazení chyb (role=\"alert\", aria-live, aria-invalid). (WCAG 3.3.1)"
        );
      }
    }

    // 1.3.5 — Missing autocomplete on common inputs (info)
    const autocompletableInputs = $("input[type='text'], input[type='email'], input[type='tel'], input[type='password'], input[name*='name'], input[name*='email'], input[name*='phone'], input[name*='address']");
    const inputsNoAutocomplete = autocompletableInputs.filter((_, el) => {
      return !$(el).attr("autocomplete");
    });
    if (inputsNoAutocomplete.length > 0) {
      addFinding(
        "info",
        `Chybí atribut autocomplete${pageLabel}`,
        `Nalezeno ${inputsNoAutocomplete.length} vstupních polí bez atributu autocomplete. Automatické vyplňování zlepšuje použitelnost. (WCAG 1.3.5)`
      );
    }

    // ════════════════════════════════════════
    // ROBUST (WCAG 4.x)
    // ════════════════════════════════════════

    // 4.1.1 — Duplicate IDs (critical)
    const allIds = new Map<string, number>();
    $("[id]").each((_, el) => {
      const id = $(el).attr("id");
      if (id) {
        allIds.set(id, (allIds.get(id) || 0) + 1);
      }
    });
    const duplicateIds = [...allIds.entries()].filter(([, count]) => count > 1);
    if (duplicateIds.length > 0) {
      addFinding(
        "critical",
        `Duplicitní ID atributy${pageLabel}`,
        `Nalezeno ${duplicateIds.length} duplicitních ID (${duplicateIds.slice(0, 3).map(([id]) => `"${id}"`).join(", ")}${duplicateIds.length > 3 ? "..." : ""}). Způsobuje problémy s ARIA a label vazbami. (WCAG 4.1.1)`
      );
    }

    // 4.1.2 — Missing ARIA landmark roles (warning)
    const hasMain = $("main, [role='main']").length > 0;
    const hasNav = $("nav, [role='navigation']").length > 0;
    const missingRoles: string[] = [];
    if (!hasMain) missingRoles.push("main");
    if (!hasNav) missingRoles.push("navigation");
    if (missingRoles.length > 0) {
      addFinding(
        "warning",
        `Chybí ARIA landmark role${pageLabel}`,
        `Stránce chybí: ${missingRoles.join(", ")}. Landmark role pomáhají uživatelům čteček obrazovky navigovat stránkou. (WCAG 4.1.2)`
      );
    }
  }

  // ─── Score Calculation ───
  // 100 base, critical -8pts (max 3), warning -4pts (max 3), info -1pt (max 2), min 0
  const cappedCritical = Math.min(criticalCount, 3);
  const cappedWarning = Math.min(warningCount, 3);
  const cappedInfo = Math.min(infoCount, 2);
  const score = Math.max(0, 100 - cappedCritical * 8 - cappedWarning * 4 - cappedInfo * 1);

  return { score, findings };
}
