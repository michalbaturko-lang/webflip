/**
 * Performance Analyzer
 *
 * Wrapper kolem performance-measurer.ts, který převádí měření
 * na CategoryScore (score + findings) kompatibilní se zbytkem systému.
 */

import { measurePerformance } from "../performance-measurer";
import type { CategoryScore, Finding } from "../supabase";
import type { PerformanceMeasurement } from "../performance-measurer";

export function analyzePerformance(html: string, url: string, headers?: Record<string, string>): CategoryScore {
  const measurement = measurePerformance(html, url, headers);
  const findings = buildFindings(measurement);

  // Base score from Lighthouse-weighted estimate, adjusted by findings
  let score = measurement.performanceScore.overall;

  // Apply additional penalties from findings
  const criticals = findings.filter(f => f.severity === "critical").length;
  const warnings = findings.filter(f => f.severity === "warning").length;
  score = Math.max(0, Math.min(100, score - criticals * 3 - warnings * 1));

  return { score, findings };
}

export { measurePerformance } from "../performance-measurer";
export type { PerformanceMeasurement } from "../performance-measurer";

function buildFindings(m: PerformanceMeasurement): Finding[] {
  const findings: Finding[] = [];

  // ─── Critical Rendering Path ───
  const crp = m.criticalRenderingPath;
  if (crp.renderBlockingCss > 3) {
    findings.push({ category: "performance", severity: "critical", title: "Příliš mnoho blokujících CSS", description: `Nalezeno ${crp.renderBlockingCss} render-blocking CSS souborů. Zpomalují první vykreslení stránky.` });
  } else if (crp.renderBlockingCss > 1) {
    findings.push({ category: "performance", severity: "warning", title: "Blokující CSS soubory", description: `${crp.renderBlockingCss} CSS souborů blokuje vykreslení. Zvažte inline critical CSS.` });
  } else if (crp.renderBlockingCss === 0) {
    findings.push({ category: "performance", severity: "ok", title: "Žádné blokující CSS", description: "Žádné render-blocking CSS — první vykreslení není blokováno styly." });
  }

  if (crp.renderBlockingJs > 2) {
    findings.push({ category: "performance", severity: "critical", title: "Blokující JavaScript v <head>", description: `${crp.renderBlockingJs} skriptů v <head> bez async/defer. Přidejte atribut async nebo defer.` });
  } else if (crp.renderBlockingJs > 0) {
    findings.push({ category: "performance", severity: "warning", title: "Blokující JS skripty", description: `${crp.renderBlockingJs} skriptů blokuje vykreslení. Použijte async/defer.` });
  }

  if (crp.inlineCssSize > 50000) {
    findings.push({ category: "performance", severity: "warning", title: "Velký inline CSS", description: `Inline CSS má ${Math.round(crp.inlineCssSize / 1024)} KB — zvažte externí soubor s cache.` });
  }

  // ─── Image Optimization ───
  const img = m.imageOptimization;
  if (img.totalImages > 0) {
    if (img.withLazyLoading === 0) {
      findings.push({ category: "performance", severity: "warning", title: "Chybí lazy loading obrázků", description: "Žádný obrázek nepoužívá loading=\"lazy\". Offscreen obrázky zpomalují načítání." });
    } else if (img.withLazyLoading < img.totalImages * 0.5) {
      findings.push({ category: "performance", severity: "info", title: "Málo lazy loading obrázků", description: `Pouze ${img.withLazyLoading}/${img.totalImages} obrázků má lazy loading.` });
    } else {
      findings.push({ category: "performance", severity: "ok", title: "Lazy loading obrázků", description: `${img.withLazyLoading}/${img.totalImages} obrázků má lazy loading.` });
    }

    if (img.withModernFormat === 0) {
      findings.push({ category: "performance", severity: "warning", title: "Chybí moderní formáty obrázků", description: "Žádný obrázek nepoužívá WebP nebo AVIF. Moderní formáty jsou o 25-50% menší." });
    } else if (img.withModernFormat > img.totalImages * 0.5) {
      findings.push({ category: "performance", severity: "ok", title: "Moderní formáty obrázků", description: `${img.withModernFormat}/${img.totalImages} obrázků v moderním formátu (WebP/AVIF).` });
    }

    if (img.withDimensions === 0) {
      findings.push({ category: "performance", severity: "critical", title: "Obrázky bez rozměrů (CLS)", description: "Žádný obrázek nemá width/height atributy. Způsobuje posun obsahu při načítání (CLS)." });
    } else if (img.withDimensions < img.totalImages * 0.7) {
      findings.push({ category: "performance", severity: "warning", title: "Neúplné rozměry obrázků", description: `Pouze ${img.withDimensions}/${img.totalImages} obrázků má width/height. Chybějící rozměry zhoršují CLS.` });
    }

    if (img.withSrcset === 0 && img.totalImages > 3) {
      findings.push({ category: "performance", severity: "info", title: "Chybí responzivní obrázky", description: "Obrázky nemají srcset — mobilní zařízení stahují zbytečně velké soubory." });
    }
  }

  // ─── Third-Party Impact ───
  const tp = m.thirdPartyImpact;
  if (tp.totalThirdParty > 8) {
    findings.push({ category: "performance", severity: "critical", title: "Příliš mnoho služeb třetích stran", description: `${tp.totalThirdParty} externích služeb detekováno. Odhadovaný dopad: ~${tp.estimatedBlockingTime}ms.` });
  } else if (tp.totalThirdParty > 4) {
    findings.push({ category: "performance", severity: "warning", title: "Mnoho služeb třetích stran", description: `${tp.totalThirdParty} externích služeb. Odhadovaný dopad: ~${tp.estimatedBlockingTime}ms.` });
  } else if (tp.totalThirdParty > 0) {
    findings.push({ category: "performance", severity: "info", title: "Služby třetích stran", description: `${tp.totalThirdParty} externích služeb (dopad ~${tp.estimatedBlockingTime}ms): ${tp.slowServices.map(s => s.name).join(", ")}.` });
  } else {
    findings.push({ category: "performance", severity: "ok", title: "Minimální třetí strany", description: "Žádné známé pomalé služby třetích stran." });
  }

  const highImpact = tp.slowServices.filter(s => s.impactLevel === "vysoký");
  if (highImpact.length > 0) {
    findings.push({ category: "performance", severity: "warning", title: "Vysokodopadové služby", description: `${highImpact.map(s => `${s.name} (~${s.estimatedMs}ms)`).join(", ")}. Zvažte odložené načítání.` });
  }

  // ─── Font Optimization ───
  const font = m.fontOptimization;
  if (font.totalFonts > 0) {
    if (!font.withFontDisplaySwap) {
      findings.push({ category: "performance", severity: "warning", title: "Chybí font-display: swap", description: "Fonty nemají font-display: swap — text je neviditelný při načítání (FOIT)." });
    } else {
      findings.push({ category: "performance", severity: "ok", title: "font-display: swap nastaven", description: "Fonty používají font-display: swap — text je okamžitě viditelný." });
    }

    if (font.withPreload === 0) {
      findings.push({ category: "performance", severity: "info", title: "Fonty bez preload", description: "Přidejte <link rel=\"preload\"> pro kritické fonty k rychlejšímu zobrazení textu." });
    }

    if (font.usesGoogleFonts && !font.googleFontsOptimized) {
      findings.push({ category: "performance", severity: "warning", title: "Neoptimalizované Google Fonts", description: "Google Fonts: přidejte preconnect k fonts.gstatic.com a parametr display=swap." });
    }
  }

  // ─── Performance Score ───
  const ps = m.performanceScore;
  if (ps.overall >= 90) {
    findings.push({ category: "performance", severity: "ok", title: "Vynikající odhadované skóre výkonu", description: `Odhadované Lighthouse skóre: ${ps.overall}/100. LCP ~${(ps.estimatedLCP / 1000).toFixed(1)}s, TBT ~${ps.estimatedTBT}ms, CLS ~${ps.estimatedCLS.toFixed(3)}.` });
  } else if (ps.overall >= 50) {
    findings.push({ category: "performance", severity: "warning", title: "Průměrné odhadované skóre výkonu", description: `Odhadované Lighthouse skóre: ${ps.overall}/100. LCP ~${(ps.estimatedLCP / 1000).toFixed(1)}s, TBT ~${ps.estimatedTBT}ms, CLS ~${ps.estimatedCLS.toFixed(3)}.` });
  } else {
    findings.push({ category: "performance", severity: "critical", title: "Nízké odhadované skóre výkonu", description: `Odhadované Lighthouse skóre: ${ps.overall}/100. LCP ~${(ps.estimatedLCP / 1000).toFixed(1)}s, TBT ~${ps.estimatedTBT}ms, CLS ~${ps.estimatedCLS.toFixed(3)}.` });
  }

  // ─── CDN & Caching ───
  const cdn = m.cdnCaching;
  if (!cdn.usesCdn) {
    findings.push({ category: "performance", severity: "info", title: "Žádné CDN detekováno", description: "Stránka nepoužívá CDN. Použití CDN může výrazně zrychlit doručení obsahu." });
  } else {
    findings.push({ category: "performance", severity: "ok", title: "CDN detekováno", description: `Používá CDN: ${cdn.cdnProvider}. Statický obsah je doručován rychleji.` });
  }

  if (cdn.staticAssetsCached) {
    findings.push({ category: "performance", severity: "ok", title: "Cache-busting pro statické soubory", description: "Statické soubory mají verze/hashe v URL — správné cache chování." });
  }

  // ─── Mobile Optimization ───
  const mob = m.mobileOptimization;
  if (!mob.hasViewport) {
    findings.push({ category: "performance", severity: "critical", title: "Chybí viewport pro mobilní zařízení", description: "Stránka nemá viewport meta tag — nebude správně zobrazena na mobilních zařízeních." });
  }

  if (!mob.usesMediaQueries && !mob.usesResponsiveImages) {
    findings.push({ category: "performance", severity: "warning", title: "Slabá mobilní optimalizace", description: "Nenalezeny media queries ani responzivní obrázky. Stránka nemusí být mobilně přívětivá." });
  } else if (mob.usesMediaQueries) {
    findings.push({ category: "performance", severity: "ok", title: "Responzivní design", description: "Stránka používá media queries / responzivní framework." });
  }

  if (!mob.fontSizeReadable) {
    findings.push({ category: "performance", severity: "info", title: "Malé písmo", description: "Detekováno příliš malé písmo — na mobilních zařízeních může být nečitelné." });
  }

  // ─── Compression ───
  const comp = m.compressionDetection;
  if (!comp.textCompression) {
    findings.push({ category: "performance", severity: "info", title: "HTML není minifikovaný", description: `HTML soubor (${Math.round(comp.totalUncompressedSize / 1024)} KB) není minifikovaný. Minifikace může ušetřit 10-30% velikosti.` });
  }

  if (!comp.minifiedCss) {
    findings.push({ category: "performance", severity: "info", title: "CSS není minifikovaný", description: "Inline CSS kód není minifikovaný. Zvažte minifikaci pro menší přenos." });
  }

  if (!comp.minifiedJs) {
    findings.push({ category: "performance", severity: "info", title: "JavaScript není minifikovaný", description: "Inline JavaScript není minifikovaný. Minifikace zmenší velikost a zrychlí zpracování." });
  }

  if (comp.totalUncompressedSize > 2 * 1024 * 1024) {
    findings.push({ category: "performance", severity: "critical", title: "Příliš velká HTML stránka", description: `HTML je ${(comp.totalUncompressedSize / (1024 * 1024)).toFixed(1)} MB. Doporučeno pod 0.5 MB.` });
  } else if (comp.totalUncompressedSize > 500 * 1024) {
    findings.push({ category: "performance", severity: "warning", title: "Velká HTML stránka", description: `HTML je ${Math.round(comp.totalUncompressedSize / 1024)} KB. Zvažte redukci obsahu.` });
  }

  return findings;
}
