import Anthropic from "@anthropic-ai/sdk";
import type { Finding } from "./supabase";
import type { PrioritizedFinding } from "./prioritizer";
import type { BusinessType } from "./business-context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnrichedFinding {
  findingId: string;
  finding: Finding;
  explanation: string; // WHY it matters (Czech)
  howToFix: string; // HOW to fix it (Czech)
  expectedImprovement: string; // WHAT improves (Czech)
  priorityScore: number; // 1-10
  businessImpact: string; // business context (Czech)
}

export interface LLMExplanationResult {
  enrichedFindings: EnrichedFinding[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Anthropic client (singleton)
// ---------------------------------------------------------------------------

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
    client = new Anthropic({ apiKey });
  }
  return client;
}

// ---------------------------------------------------------------------------
// Simple in-memory cache
// ---------------------------------------------------------------------------

const cache = new Map<string, EnrichedFinding[]>();

function getCacheKey(findings: Finding[]): string {
  const titles = findings.map((f) => f.title).sort().join("|");
  return titles;
}

// ---------------------------------------------------------------------------
// Batch findings to minimize API calls
// ---------------------------------------------------------------------------

function batchFindings(
  prioritized: PrioritizedFinding[],
  maxTotal: number
): PrioritizedFinding[][] {
  // Take top N findings by ROI (skip "ok" and zero-value)
  const actionable = prioritized
    .filter((p) => p.businessValueScore > 0)
    .slice(0, maxTotal);

  // Group into batches of 10-15
  const batchSize = 12;
  const batches: PrioritizedFinding[][] = [];
  for (let i = 0; i < actionable.length; i += batchSize) {
    batches.push(actionable.slice(i, i + batchSize));
  }
  return batches;
}

// ---------------------------------------------------------------------------
// LLM call
// ---------------------------------------------------------------------------

async function explainBatch(
  batch: PrioritizedFinding[],
  businessType: BusinessType
): Promise<EnrichedFinding[]> {
  const anthropic = getClient();

  const findingsDesc = batch
    .map(
      (pf, i) =>
        `${i + 1}. [${pf.finding.severity.toUpperCase()}] ${pf.finding.title} (kategorie: ${pf.finding.category})\n   Popis: ${pf.finding.description}\n   Business value: ${pf.businessValueScore}/100, Effort: ${pf.effortScore}/5`
    )
    .join("\n\n");

  const businessTypeLabels: Record<BusinessType, string> = {
    "e-commerce": "e-shop",
    saas: "SaaS platforma",
    portfolio: "portfolio web",
    blog: "blog / mediální web",
    corporate: "firemní web",
    catalog: "katalogový web",
  };

  const prompt = `Jsi expert na webovou analytiku. Analyzuješ web typu "${businessTypeLabels[businessType]}".

Pro každý z následujících nálezů vygeneruj vysvětlení v ČEŠTINĚ:

${findingsDesc}

Pro KAŽDÝ nález vrať JSON objekt s těmito poli:
- "index": číslo nálezu (1, 2, 3...)
- "explanation": PROČ je to důležité (1-2 věty, business dopad)
- "howToFix": JAK to opravit (konkrétní kroky, max 2-3 věty)
- "expectedImprovement": CO se zlepší po opravě (kvantifikuj pokud možno)
- "priorityScore": priorita 1-10 (10 = nejvyšší)
- "businessImpact": dopad na podnikání (1 věta, specifická pro ${businessTypeLabels[businessType]})

PRAVIDLA:
- Vše v češtině
- Buď konkrétní a akční, ne obecný
- Místo "opravte X" piš "Přidejte X protože..."
- U kvantifikace použij realistické odhady (např. "Může zvýšit CTR o 5-15%")

Vrať POUZE JSON pole, žádný jiný text. Příklad formátu:
[{"index":1,"explanation":"...","howToFix":"...","expectedImprovement":"...","priorityScore":8,"businessImpact":"..."}]`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return fallbackExplanations(batch);

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      index: number;
      explanation: string;
      howToFix: string;
      expectedImprovement: string;
      priorityScore: number;
      businessImpact: string;
    }>;

    return batch.map((pf, i) => {
      const llmResult = parsed.find((r) => r.index === i + 1) || parsed[i];
      if (!llmResult) {
        return buildFallbackExplanation(pf);
      }
      return {
        findingId: pf.findingId,
        finding: pf.finding,
        explanation: llmResult.explanation || "",
        howToFix: llmResult.howToFix || "",
        expectedImprovement: llmResult.expectedImprovement || "",
        priorityScore: Math.min(10, Math.max(1, llmResult.priorityScore || 5)),
        businessImpact: llmResult.businessImpact || "",
      };
    });
  } catch (err) {
    console.error("LLM explainer batch failed:", err);
    return fallbackExplanations(batch);
  }
}

// ---------------------------------------------------------------------------
// Fallback explanations (when LLM is unavailable)
// ---------------------------------------------------------------------------

const FALLBACK_EXPLANATIONS: Record<
  string,
  { explanation: string; howToFix: string; expectedImprovement: string; businessImpact: string }
> = {
  "Missing page title": {
    explanation: "Titulek stránky je nejdůležitější SEO prvek. Bez něj vyhledávače nevědí, o čem stránka je.",
    howToFix: "Přidejte tag <title> do sekce <head> s výstižným popisem stránky (50-60 znaků).",
    expectedImprovement: "Může zlepšit pozice ve vyhledávačích o 10-20 míst.",
    businessImpact: "Bez titulku je web prakticky neviditelný ve vyhledávání.",
  },
  "Missing meta description": {
    explanation: "Meta popis se zobrazuje ve výsledcích vyhledávání. Bez něj Google zobrazí náhodný text ze stránky.",
    howToFix: "Přidejte meta description tag s přesvědčivým popisem (140-160 znaků), který obsahuje hlavní klíčová slova.",
    expectedImprovement: "Může zvýšit CTR (míru prokliků) z výsledků vyhledávání o 5-15%.",
    businessImpact: "Lepší meta popis = více návštěvníků z vyhledávání.",
  },
  "No HTTPS": {
    explanation: "Bez HTTPS je veškerá komunikace nešifrovaná. Prohlížeče zobrazují varování a Google penalizuje takové weby.",
    howToFix: "Nainstalujte SSL certifikát (Let's Encrypt je zdarma) a nastavte přesměrování z HTTP na HTTPS.",
    expectedImprovement: "Zvýší důvěru návštěvníků a zlepší pozice ve vyhledávačích.",
    businessImpact: "Bez HTTPS ztrácíte 10-20% návštěvníků kvůli bezpečnostním varováním.",
  },
  "No clear CTA buttons": {
    explanation: "Bez jasného call-to-action tlačítka návštěvníci nevědí, co mají udělat dál.",
    howToFix: "Přidejte výrazné CTA tlačítko nad fold (viditelné bez scrollování) s jasným textem akce.",
    expectedImprovement: "Může zvýšit konverzní poměr o 20-40%.",
    businessImpact: "Každý návštěvník bez CTA je promarněná příležitost.",
  },
  "Slow LCP": {
    explanation: "Pomalé načítání hlavního obsahu stránky způsobuje, že návštěvníci odcházejí dřív, než vidí obsah.",
    howToFix: "Optimalizujte obrázky (WebP formát), zapněte lazy loading a minimalizujte JavaScript blokující rendering.",
    expectedImprovement: "Zrychlení LCP pod 2,5s může snížit bounce rate o 15-25%.",
    businessImpact: "Každá sekunda zpoždění snižuje konverze o 7%.",
  },
  "No trust signals": {
    explanation: "Bez recenzí, referencí nebo certifikátů důvěry návštěvníci váhají s kontaktem nebo nákupem.",
    howToFix: "Přidejte sekci s referencemi zákazníků, logy partnerů nebo hodnocení (Google Reviews, Heureka).",
    expectedImprovement: "Signály důvěry mohou zvýšit konverze o 15-30%.",
    businessImpact: "Důvěra je klíčový faktor rozhodování zákazníků.",
  },
};

function buildFallbackExplanation(pf: PrioritizedFinding): EnrichedFinding {
  const fallback = FALLBACK_EXPLANATIONS[pf.finding.title];
  const priorityScore = Math.min(10, Math.round(pf.businessValueScore / 10));

  if (fallback) {
    return {
      findingId: pf.findingId,
      finding: pf.finding,
      explanation: fallback.explanation,
      howToFix: fallback.howToFix,
      expectedImprovement: fallback.expectedImprovement,
      priorityScore,
      businessImpact: fallback.businessImpact,
    };
  }

  // Generic fallback
  const severityText =
    pf.finding.severity === "critical"
      ? "Kritický problém, který výrazně ovlivňuje"
      : "Problém, který může ovlivnit";

  return {
    findingId: pf.findingId,
    finding: pf.finding,
    explanation: `${severityText} kvalitu a výkon vašeho webu.`,
    howToFix: `Opravte problém "${pf.finding.title}" podle popisu v nálezu.`,
    expectedImprovement: "Zlepšení v kategorii " + pf.finding.category + ".",
    priorityScore,
    businessImpact: "Oprava tohoto problému zlepší celkové skóre webu.",
  };
}

function fallbackExplanations(
  batch: PrioritizedFinding[]
): EnrichedFinding[] {
  return batch.map(buildFallbackExplanation);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Generate LLM-powered explanations for top prioritized findings.
 * Uses Claude Haiku for cost efficiency, batches requests, and caches results.
 *
 * @param prioritized - Findings from the prioritizer, sorted by ROI
 * @param businessType - Detected business type for context
 * @param maxFindings - Maximum findings to explain (default 25)
 */
export async function generateExplanations(
  prioritized: PrioritizedFinding[],
  businessType: BusinessType,
  maxFindings: number = 25
): Promise<LLMExplanationResult> {
  // Check cache
  const actionable = prioritized.filter((p) => p.businessValueScore > 0);
  const toExplain = actionable.slice(0, maxFindings);
  const cacheKey = getCacheKey(toExplain.map((p) => p.finding));

  if (cache.has(cacheKey)) {
    return {
      enrichedFindings: cache.get(cacheKey)!,
      generatedAt: new Date().toISOString(),
    };
  }

  // Batch and process
  const batches = batchFindings(prioritized, maxFindings);
  const results: EnrichedFinding[] = [];

  // Process batches sequentially to avoid rate limits
  for (const batch of batches) {
    const batchResults = await explainBatch(batch, businessType);
    results.push(...batchResults);

    // Small delay between batches to be respectful of rate limits
    if (batches.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // Cache the results
  cache.set(cacheKey, results);

  // Also include non-actionable findings with minimal info
  const nonActionable = prioritized
    .filter((p) => p.businessValueScore === 0)
    .map((pf) => ({
      findingId: pf.findingId,
      finding: pf.finding,
      explanation: "Tento prvek je v pořádku.",
      howToFix: "",
      expectedImprovement: "",
      priorityScore: 0,
      businessImpact: "",
    }));

  return {
    enrichedFindings: [...results, ...nonActionable],
    generatedAt: new Date().toISOString(),
  };
}
