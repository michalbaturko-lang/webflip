import * as cheerio from "cheerio";
import type { Finding } from "../supabase";

// ─── Types ───

export interface AccessibilityResult {
  contrast: ContrastIssue[];
  altText: AltTextIssue[];
  forms: FormIssue[];
  semantics: SemanticScore;
  aria: AriaScore;
  keyboard: KeyboardIssue[];
  findings: Finding[];
}

interface ContrastIssue {
  element: string;
  foreground: string;
  background: string;
  ratio: number;
  required: number;
  isLargeText: boolean;
}

interface AltTextIssue {
  src: string;
  issue: "missing" | "empty" | "too-long" | "filename-pattern";
}

interface FormIssue {
  element: string;
  issue: "no-label" | "no-fieldset" | "no-required-indication";
}

interface SemanticScore {
  hasHeader: boolean;
  hasNav: boolean;
  hasMain: boolean;
  hasFooter: boolean;
  score: number;
  headingHierarchyOk: boolean;
}

interface AriaScore {
  landmarkCount: number;
  labeledInteractives: number;
  totalInteractives: number;
  ariaHiddenMisuse: boolean;
}

interface KeyboardIssue {
  issue: "positive-tabindex" | "outline-none" | "no-skip-link";
  count?: number;
}

// ─── Color Utilities ───

function parseColor(color: string): { r: number; g: number; b: number } | null {
  if (!color) return null;

  // hex
  const hexMatch = color.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    if (hex.length >= 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  // rgb/rgba
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
    };
  }

  // Named colors (common ones)
  const named: Record<string, { r: number; g: number; b: number }> = {
    white: { r: 255, g: 255, b: 255 },
    black: { r: 0, g: 0, b: 0 },
    red: { r: 255, g: 0, b: 0 },
    green: { r: 0, g: 128, b: 0 },
    blue: { r: 0, g: 0, b: 255 },
    gray: { r: 128, g: 128, b: 128 },
    grey: { r: 128, g: 128, b: 128 },
    yellow: { r: 255, g: 255, b: 0 },
    orange: { r: 255, g: 165, b: 0 },
    transparent: { r: 255, g: 255, b: 255 },
  };

  return named[color.toLowerCase().trim()] || null;
}

function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(fg: { r: number; g: number; b: number }, bg: { r: number; g: number; b: number }): number {
  const l1 = relativeLuminance(fg.r, fg.g, fg.b);
  const l2 = relativeLuminance(bg.r, bg.g, bg.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Color Contrast Check ───

function checkColorContrast(html: string): ContrastIssue[] {
  const $ = cheerio.load(html);
  const issues: ContrastIssue[] = [];

  // Extract inline style color pairs
  $("[style]").each((_, el) => {
    const style = $(el).attr("style") || "";
    const colorMatch = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
    const bgMatch = style.match(/background(?:-color)?\s*:\s*([^;]+)/i);

    if (colorMatch && bgMatch) {
      const fg = parseColor(colorMatch[1].trim());
      const bg = parseColor(bgMatch[1].trim());

      if (fg && bg) {
        const ratio = contrastRatio(fg, bg);
        const fontSize = style.match(/font-size\s*:\s*(\d+)/);
        const fontWeight = style.match(/font-weight\s*:\s*(\w+)/);
        const size = fontSize ? parseInt(fontSize[1]) : 16;
        const isBold = fontWeight && (fontWeight[1] === "bold" || parseInt(fontWeight[1]) >= 700);
        const isLargeText = size >= 18 || (size >= 14 && isBold);
        const required = isLargeText ? 3 : 4.5;

        if (ratio < required) {
          const tagName = (el as unknown as { tagName: string }).tagName || "element";
          issues.push({
            element: tagName,
            foreground: colorMatch[1].trim(),
            background: bgMatch[1].trim(),
            ratio: Math.round(ratio * 100) / 100,
            required,
            isLargeText: !!isLargeText,
          });
        }
      }
    }
  });

  // Also check CSS in <style> blocks for common problematic patterns
  $("style").each((_, el) => {
    const css = $(el).text();
    // Look for light-on-light or dark-on-dark patterns
    const rules = css.match(/\{[^}]*color[^}]*\}/g) || [];
    for (const rule of rules) {
      const colorMatch = rule.match(/(?:^|;|\{)\s*color\s*:\s*([^;}\s]+)/i);
      const bgMatch = rule.match(/background(?:-color)?\s*:\s*([^;}\s]+)/i);

      if (colorMatch && bgMatch) {
        const fg = parseColor(colorMatch[1]);
        const bg = parseColor(bgMatch[1]);
        if (fg && bg) {
          const ratio = contrastRatio(fg, bg);
          if (ratio < 4.5) {
            issues.push({
              element: "css-rule",
              foreground: colorMatch[1],
              background: bgMatch[1],
              ratio: Math.round(ratio * 100) / 100,
              required: 4.5,
              isLargeText: false,
            });
          }
        }
      }
    }
  });

  return issues;
}

// ─── Image Alt Text ───

function checkAltText(html: string): AltTextIssue[] {
  const $ = cheerio.load(html);
  const issues: AltTextIssue[] = [];
  const filenamePattern = /\.(jpg|jpeg|png|gif|svg|webp|avif|bmp|ico)$/i;

  $("img").each((_, el) => {
    const alt = $(el).attr("alt");
    const src = $(el).attr("src") || $(el).attr("data-src") || "unknown";
    const role = $(el).attr("role");

    if (alt === undefined) {
      issues.push({ src, issue: "missing" });
    } else if (alt === "" && role !== "presentation" && role !== "none") {
      // Empty alt on potentially non-decorative image
      const isLikelyDecorative = src.includes("icon") || src.includes("spacer") || src.includes("pixel");
      if (!isLikelyDecorative) {
        issues.push({ src, issue: "empty" });
      }
    } else if (alt && alt.length > 125) {
      issues.push({ src, issue: "too-long" });
    } else if (alt && filenamePattern.test(alt)) {
      issues.push({ src, issue: "filename-pattern" });
    } else if (alt) {
      // Check if alt looks like a filename (e.g., "IMG_1234" or "photo-2024")
      const looksLikeFilename = /^(IMG|DSC|photo|image|picture|screenshot)[-_]\d/i.test(alt);
      if (looksLikeFilename) {
        issues.push({ src, issue: "filename-pattern" });
      }
    }
  });

  return issues;
}

// ─── Form Accessibility ───

function checkForms(html: string): FormIssue[] {
  const $ = cheerio.load(html);
  const issues: FormIssue[] = [];

  // Check inputs without labels
  $("input, textarea, select").each((_, el) => {
    const id = $(el).attr("id");
    const type = $(el).attr("type") || "text";
    const ariaLabel = $(el).attr("aria-label");
    const ariaLabelledBy = $(el).attr("aria-labelledby");

    // Skip hidden, submit, button types
    if (["hidden", "submit", "button", "reset", "image"].includes(type)) return;

    const hasLabel = id && $(`label[for="${id}"]`).length > 0;
    const hasWrappingLabel = $(el).closest("label").length > 0;

    if (!hasLabel && !hasWrappingLabel && !ariaLabel && !ariaLabelledBy) {
      const tagName = (el as unknown as { tagName: string }).tagName || "input";
      issues.push({ element: `${tagName}[type="${type}"]`, issue: "no-label" });
    }
  });

  // Check radio groups without fieldset
  const radioNames = new Set<string>();
  $('input[type="radio"]').each((_, el) => {
    const name = $(el).attr("name");
    if (name) radioNames.add(name);
  });
  for (const name of radioNames) {
    const radios = $(`input[name="${name}"]`);
    if (radios.length > 1) {
      const hasFieldset = radios.first().closest("fieldset").length > 0;
      if (!hasFieldset) {
        issues.push({ element: `radio[name="${name}"]`, issue: "no-fieldset" });
      }
    }
  }

  // Check for required indication
  const forms = $("form");
  forms.each((_, form) => {
    const inputs = $(form).find("input:not([type=hidden]):not([type=submit]):not([type=button]), textarea, select");
    const required = $(form).find("[required], [aria-required='true']");
    if (inputs.length > 2 && required.length === 0) {
      issues.push({ element: "form", issue: "no-required-indication" });
    }
  });

  return issues;
}

// ─── Semantic HTML ───

function checkSemantics(html: string): SemanticScore {
  const $ = cheerio.load(html);

  const hasHeader = $("header").length > 0;
  const hasNav = $("nav").length > 0;
  const hasMain = $("main").length > 0;
  const hasFooter = $("footer").length > 0;
  const hasArticle = $("article").length > 0;
  const hasSection = $("section").length > 0;

  const semanticElements = [hasHeader, hasNav, hasMain, hasFooter].filter(Boolean).length;

  // Heading hierarchy check
  const headings = $("h1, h2, h3, h4, h5, h6").toArray();
  let headingHierarchyOk = true;
  let prevLevel = 0;
  for (const h of headings) {
    const level = parseInt((h as unknown as { tagName: string }).tagName.replace("h", ""));
    if (level > prevLevel + 1 && prevLevel > 0) {
      headingHierarchyOk = false;
      break;
    }
    prevLevel = level;
  }

  // Bonus for article/section
  const bonus = (hasArticle ? 1 : 0) + (hasSection ? 1 : 0);
  const score = Math.min(4, semanticElements + Math.min(bonus, 1));

  return {
    hasHeader,
    hasNav,
    hasMain,
    hasFooter,
    score,
    headingHierarchyOk,
  };
}

// ─── ARIA ───

function checkAria(html: string): AriaScore {
  const $ = cheerio.load(html);

  // ARIA landmarks
  const landmarks = $('[role="navigation"], [role="main"], [role="banner"], [role="contentinfo"], [role="complementary"], [role="search"]');

  // Interactive elements with labels
  const interactives = $("button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=link], [tabindex]");
  const labeled = interactives.filter((_, el) => {
    const ariaLabel = $(el).attr("aria-label");
    const ariaLabelledBy = $(el).attr("aria-labelledby");
    const title = $(el).attr("title");
    const text = $(el).text().trim();
    return !!(ariaLabel || ariaLabelledBy || title || text);
  });

  // aria-hidden misuse: aria-hidden on focusable elements
  let ariaHiddenMisuse = false;
  $('[aria-hidden="true"]').each((_, el) => {
    const focusable = $(el).find("a, button, input, select, textarea, [tabindex]");
    if (focusable.length > 0) {
      ariaHiddenMisuse = true;
    }
  });

  return {
    landmarkCount: landmarks.length,
    labeledInteractives: labeled.length,
    totalInteractives: interactives.length,
    ariaHiddenMisuse,
  };
}

// ─── Keyboard & Focus ───

function checkKeyboard(html: string): KeyboardIssue[] {
  const $ = cheerio.load(html);
  const issues: KeyboardIssue[] = [];

  // Positive tabindex
  const positiveTabindex = $("[tabindex]").filter((_, el) => {
    const val = parseInt($(el).attr("tabindex") || "0");
    return val > 0;
  });
  if (positiveTabindex.length > 0) {
    issues.push({ issue: "positive-tabindex", count: positiveTabindex.length });
  }

  // outline:none in styles
  let outlineNoneCount = 0;
  $("style").each((_, el) => {
    const css = $(el).text();
    const outlineNone = (css.match(/outline\s*:\s*(none|0)/gi) || []).length;
    outlineNoneCount += outlineNone;
  });
  // Also check inline styles
  $("[style]").each((_, el) => {
    const style = $(el).attr("style") || "";
    if (/outline\s*:\s*(none|0)/i.test(style)) {
      outlineNoneCount++;
    }
  });
  if (outlineNoneCount > 0) {
    issues.push({ issue: "outline-none", count: outlineNoneCount });
  }

  // Skip navigation link
  const skipLink = $("a[href='#main'], a[href='#content'], a[href='#main-content'], a.skip-link, a.skip-nav, a.skip-to-content");
  if (skipLink.length === 0) {
    issues.push({ issue: "no-skip-link" });
  }

  return issues;
}

// ─── Main Export ───

export function analyzeAccessibility(html: string): AccessibilityResult {
  const findings: Finding[] = [];

  // 1. Color contrast
  const contrast = checkColorContrast(html);
  if (contrast.length > 0) {
    findings.push({
      category: "accessibility",
      severity: "critical",
      title: "Nedostatečný barevný kontrast",
      description: `Nalezeno ${contrast.length} prvků s nedostatečným kontrastem textu vůči pozadí. Přidejte dostatečný kontrast (minimálně 4.5:1 pro normální text, 3:1 pro velký text), protože uživatelé se zhoršeným zrakem nemohou text přečíst.`,
    });
  } else {
    findings.push({
      category: "accessibility",
      severity: "ok",
      title: "Barevný kontrast v pořádku",
      description: "Kontrolované barvy splňují minimální kontrastní poměr WCAG 2.1 AA.",
    });
  }

  // 2. Alt text
  const altText = checkAltText(html);
  const missingAlt = altText.filter((a) => a.issue === "missing");
  const emptyAlt = altText.filter((a) => a.issue === "empty");
  const longAlt = altText.filter((a) => a.issue === "too-long");
  const filenameAlt = altText.filter((a) => a.issue === "filename-pattern");

  if (missingAlt.length > 0) {
    findings.push({
      category: "accessibility",
      severity: "critical",
      title: "Obrázky bez alt textu",
      description: `${missingAlt.length} obrázků nemá atribut alt. Přidejte popisný alt text ke každému obrázku, protože čtečky obrazovky ho potřebují pro nevidomé uživatele a vyhledávače ho používají pro porozumění obsahu.`,
    });
  }
  if (emptyAlt.length > 0) {
    findings.push({
      category: "accessibility",
      severity: "warning",
      title: "Obrázky s prázdným alt textem",
      description: `${emptyAlt.length} obrázků má prázdný alt text, ale nejsou označeny jako dekorativní (role="presentation"). Přidejte popisný text nebo je označte jako dekorativní, aby čtečky obrazovky správně interpretovaly jejich účel.`,
    });
  }
  if (longAlt.length > 0) {
    findings.push({
      category: "accessibility",
      severity: "info",
      title: "Příliš dlouhý alt text",
      description: `${longAlt.length} obrázků má alt text delší než 125 znaků. Zkraťte alt text a podrobný popis přesuňte do kontextu stránky, protože příliš dlouhý alt text je pro uživatele čteček nepříjemný.`,
    });
  }
  if (filenameAlt.length > 0) {
    findings.push({
      category: "accessibility",
      severity: "warning",
      title: "Alt text vypadá jako název souboru",
      description: `${filenameAlt.length} obrázků má alt text, který vypadá jako název souboru. Nahraďte ho smysluplným popisem obsahu obrázku, protože "IMG_1234.jpg" nepomáhá uživatelům pochopit, co obrázek zobrazuje.`,
    });
  }

  // 3. Forms
  const forms = checkForms(html);
  const noLabel = forms.filter((f) => f.issue === "no-label");
  const noFieldset = forms.filter((f) => f.issue === "no-fieldset");

  if (noLabel.length > 0) {
    findings.push({
      category: "accessibility",
      severity: "critical",
      title: "Formulářová pole bez popisků",
      description: `${noLabel.length} vstupních polí nemá přidružený label element. Přidejte <label for="..."> ke každému poli, protože bez něj čtečky obrazovky nemohou identifikovat účel pole a uživatelé nevědí, co mají vyplnit.`,
    });
  }
  if (noFieldset.length > 0) {
    findings.push({
      category: "accessibility",
      severity: "warning",
      title: "Skupiny radio tlačítek bez fieldset",
      description: `${noFieldset.length} skupin radio tlačítek není zabaleno do <fieldset> s <legend>. Přidejte fieldset, protože skupinový popisek pomáhá uživatelům pochopit kontext volby.`,
    });
  }

  // 4. Semantic HTML
  const semantics = checkSemantics(html);
  if (semantics.score === 0) {
    findings.push({
      category: "accessibility",
      severity: "critical",
      title: "Chybí sémantická struktura HTML",
      description: "Stránka nepoužívá žádné sémantické elementy (header, nav, main, footer). Přidejte sémantické HTML tagy, protože pomáhají čtečkám obrazovky navigovat v obsahu a zlepšují SEO.",
    });
  } else if (semantics.score <= 2) {
    findings.push({
      category: "accessibility",
      severity: "warning",
      title: "Neúplná sémantická struktura",
      description: `Nalezeny pouze ${semantics.score}/4 sémantické elementy. Přidejte chybějící: ${[!semantics.hasHeader && "header", !semantics.hasNav && "nav", !semantics.hasMain && "main", !semantics.hasFooter && "footer"].filter(Boolean).join(", ")}. Kompletní sémantická struktura usnadňuje navigaci pro čtečky obrazovky.`,
    });
  } else {
    findings.push({
      category: "accessibility",
      severity: "ok",
      title: "Dobrá sémantická struktura",
      description: `Nalezeny ${semantics.score}/4 sémantické elementy.`,
    });
  }

  if (!semantics.headingHierarchyOk) {
    findings.push({
      category: "accessibility",
      severity: "warning",
      title: "Porušená hierarchie nadpisů",
      description: "Nadpisy přeskakují úrovně (např. H1 → H3 bez H2). Dodržujte sekvenční pořadí nadpisů, protože čtečky obrazovky je používají pro navigaci v obsahu stránky.",
    });
  }

  // 5. ARIA
  const aria = checkAria(html);
  if (aria.landmarkCount === 0) {
    findings.push({
      category: "accessibility",
      severity: "warning",
      title: "Chybí ARIA landmarks",
      description: "Stránka nepoužívá ARIA role pro hlavní oblasti (navigation, main, banner). Přidejte landmark role, protože pomáhají uživatelům čteček rychle se orientovat na stránce.",
    });
  }

  if (aria.ariaHiddenMisuse) {
    findings.push({
      category: "accessibility",
      severity: "critical",
      title: "Nesprávné použití aria-hidden",
      description: 'Element s aria-hidden="true" obsahuje fokusovatelné prvky (odkazy, tlačítka, pole). Odstraňte aria-hidden nebo přesuňte interaktivní prvky mimo skrytý element, protože uživatelé klávesnice se na ně dostanou, ale čtečky je nevidí.',
    });
  }

  if (aria.totalInteractives > 0) {
    const unlabeledRatio = 1 - aria.labeledInteractives / aria.totalInteractives;
    if (unlabeledRatio > 0.3) {
      findings.push({
        category: "accessibility",
        severity: "warning",
        title: "Interaktivní prvky bez popisků",
        description: `${Math.round(unlabeledRatio * 100)} % interaktivních prvků nemá textový popisek. Přidejte aria-label, title nebo viditelný text, protože bez nich uživatelé čteček nevědí, co prvek dělá.`,
      });
    }
  }

  // 6. Keyboard & Focus
  const keyboard = checkKeyboard(html);
  for (const issue of keyboard) {
    if (issue.issue === "positive-tabindex") {
      findings.push({
        category: "accessibility",
        severity: "warning",
        title: "Kladný tabindex",
        description: `${issue.count} prvků má tabindex > 0. Odstraňte kladné hodnoty tabindex, protože mění přirozené pořadí navigace klávesnicí a matou uživatele. Používejte tabindex="0" nebo "-1".`,
      });
    } else if (issue.issue === "outline-none") {
      findings.push({
        category: "accessibility",
        severity: "warning",
        title: "Skrytý focus indikátor",
        description: `Nalezeno ${issue.count}× outline:none/0 v CSS. Neodstraňujte výchozí focus indikátor, protože uživatelé klávesnice potřebují vidět, který prvek je právě aktivní. Nahraďte vlastním viditelným stylem.`,
      });
    } else if (issue.issue === "no-skip-link") {
      findings.push({
        category: "accessibility",
        severity: "info",
        title: "Chybí skip link",
        description: 'Stránka nemá odkaz "Přeskočit na obsah". Přidejte skip link na začátek stránky, protože umožňuje uživatelům klávesnice a čteček přeskočit opakující se navigaci.',
      });
    }
  }

  return {
    contrast,
    altText,
    forms,
    semantics,
    aria,
    keyboard,
    findings,
  };
}
