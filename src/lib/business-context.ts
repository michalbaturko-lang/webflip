import type { Finding, ExtractedAssets, BusinessProfile } from "./supabase";
import type { PrioritizedFinding, PrioritizationResult } from "./prioritizer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BusinessType =
  | "e-commerce"
  | "saas"
  | "portfolio"
  | "blog"
  | "corporate"
  | "catalog";

export interface BusinessContextResult {
  businessType: BusinessType;
  adjustedFindings: PrioritizedFinding[];
  recommendations: BusinessRecommendation[];
  impactEstimates: ImpactEstimates;
  healthScore: number;
  letterGrade: string;
}

export interface BusinessRecommendation {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  category: string;
}

export interface ImpactEstimates {
  trafficImprovement: number; // percentage
  conversionImprovement: number; // percentage
  accessibilityCompliance: number; // percentage 0-100
  healthScoreImprovement: number; // points
}

// ---------------------------------------------------------------------------
// Business type detection (deterministic, no LLM)
// ---------------------------------------------------------------------------

interface DetectionSignals {
  ecommerce: number;
  saas: number;
  portfolio: number;
  blog: number;
  corporate: number;
  catalog: number;
}

function detectBusinessType(
  findings: Finding[],
  assets: ExtractedAssets | null,
  businessProfile: BusinessProfile | null
): BusinessType {
  const signals: DetectionSignals = {
    ecommerce: 0,
    saas: 0,
    portfolio: 0,
    blog: 0,
    corporate: 0,
    catalog: 0,
  };

  // --- Signal from business profile industry ---
  if (businessProfile) {
    const industry = (businessProfile.industry || "").toLowerCase();
    const segment = (businessProfile.industrySegment || "").toLowerCase();
    const combined = `${industry} ${segment}`;

    if (/e-?commerce|shop|store|obchod|eshop|prodej/.test(combined)) {
      signals.ecommerce += 5;
    }
    if (/saas|software|platforma|app|api|cloud/.test(combined)) {
      signals.saas += 5;
    }
    if (/portfolio|design|foto|photograph|umění|art|freelanc/.test(combined)) {
      signals.portfolio += 5;
    }
    if (/blog|media|magazín|zprávy|news|content/.test(combined)) {
      signals.blog += 5;
    }
    if (/corporate|firma|company|porad|consult|advok|práv|účet/.test(combined)) {
      signals.corporate += 5;
    }
    if (/katalog|catalog|directory|seznam|listing/.test(combined)) {
      signals.catalog += 5;
    }

    // Brand voice hints
    if (businessProfile.brandVoice === "luxury" || businessProfile.brandVoice === "formal") {
      signals.corporate += 2;
    }
    if (businessProfile.brandVoice === "technical") {
      signals.saas += 2;
    }
    if (businessProfile.brandVoice === "casual") {
      signals.blog += 1;
      signals.portfolio += 1;
    }
  }

  // --- Signals from extracted assets ---
  if (assets) {
    const navTexts = (assets.navLinks || []).map((l) => l.text.toLowerCase()).join(" ");

    // E-commerce signals
    if (/košík|cart|obchod|shop|produkt|product|ceník|price|objedn/.test(navTexts)) {
      signals.ecommerce += 3;
    }
    // SaaS signals
    if (/pricing|ceník|demo|trial|registr|sign.?up|api|docs|dokumentace/.test(navTexts)) {
      signals.saas += 3;
    }
    // Portfolio signals
    if (/portfolio|galerie|gallery|práce|works|projekt/.test(navTexts)) {
      signals.portfolio += 3;
    }
    // Blog signals
    if (/blog|články|articles|novinky|news|magazín/.test(navTexts)) {
      signals.blog += 2;
    }
    // Corporate signals
    if (/o nás|about|kontakt|contact|služby|services|reference|team|tým/.test(navTexts)) {
      signals.corporate += 2;
    }
    // Catalog signals
    if (/katalog|catalog|kategorie|categories|filtr|filter/.test(navTexts)) {
      signals.catalog += 3;
    }

    // Image count hints
    if (assets.images.length > 20) {
      signals.ecommerce += 1;
      signals.catalog += 2;
      signals.portfolio += 1;
    }
  }

  // --- Signals from findings ---
  for (const f of findings) {
    const desc = f.description.toLowerCase();
    if (/product|produkt|shop|obchod/.test(desc)) signals.ecommerce += 1;
    if (/pricing|cena|trial|demo/.test(desc)) signals.saas += 1;
  }

  // Default to corporate if no strong signal
  const entries = Object.entries(signals) as [keyof DetectionSignals, number][];
  entries.sort((a, b) => b[1] - a[1]);

  const [topType, topScore] = entries[0];
  if (topScore < 2) return "corporate"; // fallback

  const typeMap: Record<keyof DetectionSignals, BusinessType> = {
    ecommerce: "e-commerce",
    saas: "saas",
    portfolio: "portfolio",
    blog: "blog",
    corporate: "corporate",
    catalog: "catalog",
  };

  return typeMap[topType];
}

// ---------------------------------------------------------------------------
// Industry-specific scoring adjustments
// ---------------------------------------------------------------------------

const INDUSTRY_BOOSTS: Record<BusinessType, Record<string, number>> = {
  "e-commerce": {
    "No structured data": 1.6,
    "No Schema.org markup": 1.5,
    "Slow LCP": 1.5,
    "Very large page": 1.4,
    "Large page size": 1.3,
    "No modern image formats": 1.4,
    "Poor image alt text coverage": 1.5,
    "Incomplete alt text": 1.3,
    "No trust signals": 1.5,
    "No contact information": 1.4,
    "No clear CTA buttons": 1.6,
    "High layout shift": 1.4,
    "No lazy loading": 1.3,
    "No cookie consent detected": 1.3,
  },
  saas: {
    "No clear CTA buttons": 1.7,
    "No trust signals": 1.5,
    "Slow LCP": 1.3,
    "Missing meta description": 1.3,
    "Missing page title": 1.3,
    "No structured data": 1.2,
    "No contact information": 1.2,
    "Poor semantic structure": 1.3,
    "No accessibility features": 1.3,
    "No privacy policy link": 1.4,
    "No cookie consent detected": 1.3,
  },
  blog: {
    "Very thin content": 1.6,
    "Limited content": 1.5,
    "Thin content": 1.5,
    "Broken heading hierarchy": 1.5,
    "Poor content structure": 1.5,
    "Missing H1 heading": 1.4,
    "Few internal links": 1.6,
    "Missing meta description": 1.4,
    "No structured data": 1.3,
    "No FAQ section": 1.3,
    "Weak brand signals": 1.2,
  },
  corporate: {
    "No contact information": 1.6,
    "No trust signals": 1.5,
    "No HTTPS": 1.5,
    "Missing CSP header": 1.4,
    "No privacy policy link": 1.5,
    "No cookie consent detected": 1.4,
    "Exposed email addresses": 1.3,
    "Outdated copyright": 1.4,
    "Weak brand signals": 1.4,
    "No clear CTA buttons": 1.3,
    "Missing Open Graph tags": 1.3,
  },
  portfolio: {
    "No modern image formats": 1.6,
    "No lazy loading": 1.5,
    "Very large page": 1.5,
    "Poor image alt text coverage": 1.4,
    "Slow LCP": 1.4,
    "No clear CTA buttons": 1.3,
    "No contact information": 1.5,
    "Weak brand signals": 1.3,
    "No trust signals": 1.2,
  },
  catalog: {
    "No structured data": 1.6,
    "No Schema.org markup": 1.5,
    "No modern image formats": 1.5,
    "No lazy loading": 1.4,
    "Poor image alt text coverage": 1.5,
    "Very large page": 1.4,
    "Slow LCP": 1.4,
    "No clear CTA buttons": 1.3,
    "No navigation found": 1.5,
    "Minimal navigation": 1.4,
  },
};

function applyIndustryBoosts(
  prioritized: PrioritizedFinding[],
  businessType: BusinessType
): PrioritizedFinding[] {
  const boosts = INDUSTRY_BOOSTS[businessType] || {};

  return prioritized.map((pf) => {
    const boost = boosts[pf.finding.title] ?? 1.0;
    if (boost <= 1.0) return pf;

    const newValue = Math.min(100, Math.round(pf.businessValueScore * boost));
    const newRoi = pf.effortScore > 0 ? Math.round((newValue / pf.effortScore) * 10) / 10 : 0;

    // Re-classify based on new values
    const highValue = newValue >= 40;
    const lowEffort = pf.effortScore <= 2;
    let category = pf.category;
    if (highValue && lowEffort) category = "quick-win";
    else if (highValue && !lowEffort) category = "strategic";
    else if (!highValue && lowEffort) category = "low-priority";
    else category = "complex";

    return {
      ...pf,
      businessValueScore: newValue,
      roi: newRoi,
      category,
    };
  });
}

// ---------------------------------------------------------------------------
// Business-specific recommendations (Czech)
// ---------------------------------------------------------------------------

function generateRecommendations(
  businessType: BusinessType,
  prioritized: PrioritizedFinding[]
): BusinessRecommendation[] {
  const recommendations: BusinessRecommendation[] = [];

  const hasFinding = (title: string) =>
    prioritized.some(
      (p) =>
        p.finding.title === title &&
        (p.finding.severity === "critical" || p.finding.severity === "warning")
    );

  // Common recommendations based on findings
  if (hasFinding("No HTTPS")) {
    recommendations.push({
      title: "Přejděte na HTTPS",
      description: "Bez HTTPS šifrování ztrácíte důvěru návštěvníků i pozice ve vyhledávačích. Google upřednostňuje zabezpečené weby.",
      impact: "high",
      category: "security",
    });
  }

  if (hasFinding("No structured data") || hasFinding("No Schema.org markup")) {
    recommendations.push({
      title: "Přidejte strukturovaná data (Schema.org)",
      description: "Strukturovaná data pomáhají vyhledávačům i AI systémům lépe pochopit váš obsah a zobrazit rich snippety ve výsledcích.",
      impact: "high",
      category: "seo",
    });
  }

  // Business-type-specific
  switch (businessType) {
    case "e-commerce":
      if (hasFinding("No trust signals")) {
        recommendations.push({
          title: "Přidejte recenze a hodnocení produktů",
          description: "Pro e-shop jsou recenze zákazníků klíčové. Zvyšují konverze o 15-30% a budují důvěru.",
          impact: "high",
          category: "content",
        });
      }
      if (hasFinding("Slow LCP") || hasFinding("Very large page")) {
        recommendations.push({
          title: "Optimalizujte rychlost načítání produktových stránek",
          description: "Každá sekunda zpoždění snižuje konverze e-shopu o 7%. Optimalizujte obrázky a zapněte lazy loading.",
          impact: "high",
          category: "performance",
        });
      }
      break;

    case "saas":
      if (hasFinding("No clear CTA buttons")) {
        recommendations.push({
          title: "Zvýrazněte call-to-action tlačítka",
          description: "SaaS web potřebuje jasné CTA — 'Vyzkoušet zdarma', 'Začít demo'. Umístěte je nad fold a na konci každé sekce.",
          impact: "high",
          category: "ux",
        });
      }
      recommendations.push({
        title: "Přidejte stránku s ceníkem",
        description: "Transparentní ceník zvyšuje konverze SaaS webů. Návštěvníci chtějí vidět cenu ještě před registrací.",
        impact: "medium",
        category: "content",
      });
      break;

    case "blog":
      if (hasFinding("Very thin content") || hasFinding("Thin content")) {
        recommendations.push({
          title: "Rozšiřte obsah článků",
          description: "Kvalitní blogové články by měly mít alespoň 800-1500 slov. Delší obsah se lépe umisťuje ve vyhledávačích.",
          impact: "high",
          category: "content",
        });
      }
      if (hasFinding("Few internal links")) {
        recommendations.push({
          title: "Vytvořte síť interních odkazů",
          description: "Prolinkujte související články mezi sebou. Interní linking zlepšuje SEO a drží čtenáře déle na webu.",
          impact: "high",
          category: "seo",
        });
      }
      break;

    case "corporate":
      if (hasFinding("No contact information")) {
        recommendations.push({
          title: "Doplňte kontaktní údaje",
          description: "Firemní web musí mít viditelné kontaktní údaje — telefon, email, adresa. Budují důvěru a profesionalitu.",
          impact: "high",
          category: "content",
        });
      }
      if (hasFinding("Outdated copyright")) {
        recommendations.push({
          title: "Aktualizujte copyright a obsah",
          description: "Zastaralý copyright signalizuje zanedbaný web. Aktualizujte rok a zkontrolujte, zda je obsah stále relevantní.",
          impact: "medium",
          category: "content",
        });
      }
      break;

    case "portfolio":
      if (hasFinding("No modern image formats") || hasFinding("No lazy loading")) {
        recommendations.push({
          title: "Optimalizujte zobrazení obrázků",
          description: "Portfolio web závisí na obrázcích. Použijte WebP formát a lazy loading pro rychlé načítání galerie.",
          impact: "high",
          category: "performance",
        });
      }
      break;

    case "catalog":
      if (hasFinding("No navigation found") || hasFinding("Minimal navigation")) {
        recommendations.push({
          title: "Vylepšete navigaci a filtrování",
          description: "Katalogový web potřebuje přehledné kategorie a filtry. Bez nich návštěvníci nenajdou, co hledají.",
          impact: "high",
          category: "ux",
        });
      }
      break;
  }

  // General: always recommend these if issues exist
  if (hasFinding("No accessibility features") || hasFinding("Limited accessibility")) {
    recommendations.push({
      title: "Zlepšete přístupnost webu",
      description: "Přidejte ARIA atributy, skip linky a zajistěte dostatečný kontrast. Přístupnost je zákonný požadavek v EU.",
      impact: "medium",
      category: "ux",
    });
  }

  if (hasFinding("Missing meta description") || hasFinding("Missing page title")) {
    recommendations.push({
      title: "Doplňte základní SEO meta tagy",
      description: "Titulek a meta popis jsou nejzákladnější SEO prvky. Bez nich se váš web špatně zobrazuje ve výsledcích vyhledávání.",
      impact: "high",
      category: "seo",
    });
  }

  return recommendations.slice(0, 8); // max 8 recommendations
}

// ---------------------------------------------------------------------------
// Impact estimates
// ---------------------------------------------------------------------------

function estimateImpact(
  prioritized: PrioritizedFinding[],
  findings: Finding[]
): ImpactEstimates {
  // SEO-related findings that can improve traffic
  const seoFixable = prioritized.filter(
    (p) =>
      p.finding.category === "seo" &&
      p.businessValueScore > 30 &&
      (p.finding.severity === "critical" || p.finding.severity === "warning")
  );

  // UX-related findings that can improve conversion
  const uxFixable = prioritized.filter(
    (p) =>
      (p.finding.category === "ux" || p.finding.category === "performance") &&
      p.businessValueScore > 30 &&
      (p.finding.severity === "critical" || p.finding.severity === "warning")
  );

  // Accessibility compliance
  const accessibilityFindings = findings.filter(
    (f) =>
      f.category === "ux" &&
      (f.title.includes("accessibility") ||
        f.title.includes("přístupnost") ||
        f.title.includes("ARIA") ||
        f.title.includes("semantic") ||
        f.title.includes("labels") ||
        f.title.includes("touch"))
  );
  const accessOk = accessibilityFindings.filter((f) => f.severity === "ok").length;
  const accessTotal = Math.max(accessibilityFindings.length, 1);
  const accessibilityCompliance = Math.round((accessOk / accessTotal) * 100);

  // Traffic improvement estimate (conservative: 5-25%)
  const trafficImprovement = Math.min(
    25,
    Math.round(seoFixable.length * 3.5)
  );

  // Conversion improvement estimate (conservative: 3-15%)
  const conversionImprovement = Math.min(
    15,
    Math.round(uxFixable.length * 2.5)
  );

  // Health score improvement estimate
  const quickWins = prioritized.filter((p) => p.category === "quick-win");
  const healthScoreImprovement = Math.min(
    30,
    Math.round(quickWins.length * 2.5)
  );

  return {
    trafficImprovement,
    conversionImprovement,
    accessibilityCompliance,
    healthScoreImprovement,
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Apply business context to prioritized findings.
 * Detection is deterministic (no LLM calls).
 */
export function applyBusinessContext(
  prioritizationResult: PrioritizationResult,
  findings: Finding[],
  assets: ExtractedAssets | null,
  businessProfile: BusinessProfile | null
): BusinessContextResult {
  const businessType = detectBusinessType(findings, assets, businessProfile);

  // Apply industry-specific boosts to business value scores
  const adjusted = applyIndustryBoosts(
    prioritizationResult.prioritized,
    businessType
  );

  // Re-sort after boosts
  adjusted.sort((a, b) => {
    if (b.roi !== a.roi) return b.roi - a.roi;
    return b.businessValueScore - a.businessValueScore;
  });

  const recommendations = generateRecommendations(businessType, adjusted);
  const impactEstimates = estimateImpact(adjusted, findings);

  const overallScore = prioritizationResult.overallScore;
  const grade = overallScore >= 90 ? "A" : overallScore >= 80 ? "B" : overallScore >= 70 ? "C" : overallScore >= 60 ? "D" : "F";

  return {
    businessType,
    adjustedFindings: adjusted,
    recommendations,
    impactEstimates,
    healthScore: overallScore,
    letterGrade: grade,
  };
}
