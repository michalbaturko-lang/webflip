/**
 * Link Analysis Findings Generator
 *
 * Generates Czech findings from link graph analysis results.
 * Integrates with the existing Finding type from supabase.ts.
 */

import type { CategoryScore, Finding } from "../supabase";
import type { LinkGraphResult, OrphanPage, PageMetrics, AnchorTextIssue } from "../link-graph";

export interface LinkAnalysisResult extends CategoryScore {
  linkGraphData: {
    metrics: PageMetrics[];
    orphanPages: OrphanPage[];
    depthHistogram: LinkGraphResult["depthHistogram"];
    anchorTextStats: LinkGraphResult["anchorTextStats"];
    summary: LinkGraphResult["summary"];
    topPagesByRank: { url: string; pageRank: number; inboundLinks: number }[];
    equityDistribution: { topPage: number; bottom50: number; giniCoefficient: number };
  };
}

export function analyzeLinkGraph(graphResult: LinkGraphResult): LinkAnalysisResult {
  const findings: Finding[] = [];
  let score = 100;

  // ─── 1. Orphan Pages ──────────────────────────────────────────────────────

  const fullOrphans = graphResult.orphanPages.filter(o => o.type === "full");
  const weakOrphans = graphResult.orphanPages.filter(o => o.type === "weak");
  const unreachable = graphResult.orphanPages.filter(o => o.type === "unreachable");

  if (fullOrphans.length > 0) {
    const urls = fullOrphans.slice(0, 5).map(o => o.url).join(", ");
    findings.push({
      category: "seo",
      severity: "critical",
      title: "Osiřelé stránky bez interních odkazů",
      description: `Nalezeno ${fullOrphans.length} stránek bez jakéhokoli interního odkazu. Vyhledávače je nemohou najít přes crawlování. Stránky: ${urls}${fullOrphans.length > 5 ? ` a dalších ${fullOrphans.length - 5}` : ""}.`,
    });
    score -= Math.min(20, fullOrphans.length * 5);
  }

  if (weakOrphans.length > 0) {
    const urls = weakOrphans.slice(0, 3).map(o => o.url).join(", ");
    findings.push({
      category: "seo",
      severity: "warning",
      title: "Stránky pouze s navigačními odkazy",
      description: `${weakOrphans.length} stránek má pouze odkazy z navigace nebo patičky — chybí kontextové odkazy z obsahu. Přidejte relevantní odkazy z příbuzných stránek. Stránky: ${urls}${weakOrphans.length > 3 ? "…" : ""}.`,
    });
    score -= Math.min(10, weakOrphans.length * 2);
  }

  if (unreachable.length > 0) {
    findings.push({
      category: "seo",
      severity: "critical",
      title: "Nedostupné stránky",
      description: `${unreachable.length} stránek je nedostupných z hlavní stránky přes interní navigaci. Tyto stránky vyhledávače neobjeví. Zajistěte propojení přes navigaci nebo obsah.`,
    });
    score -= Math.min(15, unreachable.length * 5);
  }

  if (graphResult.orphanPages.length === 0 && graphResult.summary.totalPages > 1) {
    findings.push({
      category: "seo",
      severity: "ok",
      title: "Žádné osiřelé stránky",
      description: "Všechny stránky webu jsou propojeny interními odkazy — výborně.",
    });
  }

  // ─── 2. Deep Pages (crawl depth > 3) ──────────────────────────────────────

  const deepPages = graphResult.metrics.filter(m => m.crawlDepth > 3 && m.crawlDepth !== -1);
  const veryDeepPages = graphResult.metrics.filter(m => m.crawlDepth > 5 && m.crawlDepth !== -1);

  if (veryDeepPages.length > 0) {
    const urls = veryDeepPages.slice(0, 3).map(m => `${m.url} (hloubka ${m.crawlDepth})`).join(", ");
    findings.push({
      category: "seo",
      severity: "critical",
      title: "Stránky příliš hluboko v hierarchii",
      description: `${veryDeepPages.length} stránek je vzdáleno více než 5 kliků od hlavní stránky. Google je crawluje s nižší prioritou a mohou být indexovány s velkým zpožděním. ${urls}.`,
    });
    score -= Math.min(15, veryDeepPages.length * 3);
  } else if (deepPages.length > 0) {
    const urls = deepPages.slice(0, 3).map(m => `${m.url} (hloubka ${m.crawlDepth})`).join(", ");
    findings.push({
      category: "seo",
      severity: "warning",
      title: "Stránky hluboko v hierarchii",
      description: `${deepPages.length} stránek je vzdáleno více než 3 kliky od hlavní stránky. Doporučujeme zkrátit cestu na maximálně 3 kliky pro lepší crawlování. ${urls}.`,
    });
    score -= Math.min(10, deepPages.length * 2);
  } else if (graphResult.summary.totalPages > 1) {
    findings.push({
      category: "seo",
      severity: "ok",
      title: "Dobrá hloubka hierarchie",
      description: `Všechny stránky jsou dostupné do 3 kliků od hlavní stránky (max. hloubka: ${graphResult.summary.maxCrawlDepth}).`,
    });
  }

  // ─── 3. Link Equity Concentration ─────────────────────────────────────────

  const sortedByRank = [...graphResult.metrics].sort((a, b) => b.internalPageRank - a.internalPageRank);
  const equityDist = computeEquityDistribution(sortedByRank);

  if (equityDist.giniCoefficient > 0.7 && graphResult.summary.totalPages > 3) {
    findings.push({
      category: "seo",
      severity: "warning",
      title: "Nerovnoměrná distribuce link equity",
      description: `Link equity je silně koncentrována — top stránka má ${equityDist.topPage.toFixed(1)}% celkového PageRanku, zatímco dolních 50 % stránek má jen ${equityDist.bottom50.toFixed(1)}%. Vylepšete interní prolinkování pro rovnoměrnější distribuci.`,
    });
    score -= 8;
  } else if (equityDist.giniCoefficient > 0.5 && graphResult.summary.totalPages > 3) {
    findings.push({
      category: "seo",
      severity: "info",
      title: "Mírná koncentrace link equity",
      description: `Link equity je mírně nerovnoměrná (Gini koeficient: ${equityDist.giniCoefficient.toFixed(2)}). Zvažte přidání interních odkazů na méně propojené stránky.`,
    });
    score -= 3;
  }

  // ─── 4. Nofollow Misuse ───────────────────────────────────────────────────

  const nofollowInternal = graphResult.edges.filter(e => !e.followable);
  if (nofollowInternal.length > 0) {
    const percent = Math.round((nofollowInternal.length / graphResult.edges.length) * 100);
    if (percent > 10) {
      findings.push({
        category: "seo",
        severity: "warning",
        title: "Nadměrné použití nofollow na interních odkazech",
        description: `${nofollowInternal.length} interních odkazů (${percent}%) má atribut nofollow. Interní nofollow plýtvá crawl budgetem a blokuje předávání link equity. Odstraňte nofollow z interních odkazů.`,
      });
      score -= 8;
    } else if (nofollowInternal.length > 0) {
      findings.push({
        category: "seo",
        severity: "info",
        title: "Interní odkazy s nofollow",
        description: `${nofollowInternal.length} interních odkazů má nofollow. Ověřte, zda je to záměr — interní nofollow je obvykle kontraproduktivní.`,
      });
      score -= 2;
    }
  }

  // ─── 5. Anchor Text Quality ───────────────────────────────────────────────

  const { anchorTextStats, anchorTextIssues } = graphResult;

  if (anchorTextStats.total > 0) {
    if (anchorTextStats.descriptivePercent < 50) {
      const genericExamples = anchorTextIssues
        .filter(i => i.issue === "generic")
        .slice(0, 3)
        .map(i => `"${i.anchorText}"`)
        .join(", ");
      findings.push({
        category: "seo",
        severity: "warning",
        title: "Příliš mnoho generických anchor textů",
        description: `Pouze ${anchorTextStats.descriptivePercent}% anchor textů je popisných (${anchorTextStats.descriptive}/${anchorTextStats.total}). ${anchorTextStats.generic} odkazů používá generický text jako ${genericExamples || "\"více\", \"zde\""}. Použijte popisné texty obsahující klíčová slova cílové stránky.`,
      });
      score -= 8;
    } else if (anchorTextStats.descriptivePercent < 75) {
      findings.push({
        category: "seo",
        severity: "info",
        title: "Anchor texty lze vylepšit",
        description: `${anchorTextStats.descriptivePercent}% anchor textů je popisných. ${anchorTextStats.generic} odkazů používá generický text. Nahraďte „více" a „zde" popisnými texty.`,
      });
      score -= 3;
    } else {
      findings.push({
        category: "seo",
        severity: "ok",
        title: "Kvalitní anchor texty",
        description: `${anchorTextStats.descriptivePercent}% anchor textů je popisných — výborně.`,
      });
    }

    // Empty anchors
    if (anchorTextStats.empty > 3) {
      findings.push({
        category: "seo",
        severity: "warning",
        title: "Prázdné anchor texty",
        description: `${anchorTextStats.empty} odkazů nemá žádný text. Může jít o obrázky bez alt textu nebo skryté odkazy. Přidejte popisný text nebo aria-label.`,
      });
      score -= 5;
    }

    // Keyword cannibalization
    const cannibalization = anchorTextIssues.filter(i => i.issue === "duplicate-keyword");
    if (cannibalization.length > 0) {
      const examples = [...new Set(cannibalization.map(i => `"${i.anchorText}"`))].slice(0, 3).join(", ");
      findings.push({
        category: "seo",
        severity: "info",
        title: "Kanibalizace klíčových slov v anchor textech",
        description: `Stejný anchor text odkazuje na různé stránky: ${examples}. To mate vyhledávače ohledně relevance. Použijte unikátní anchor texty pro každou cílovou stránku.`,
      });
      score -= 3;
    }
  }

  // ─── 6. Overall Internal Linking Stats ────────────────────────────────────

  const { summary } = graphResult;

  if (summary.totalPages > 1 && summary.avgOutboundLinks < 2) {
    findings.push({
      category: "seo",
      severity: "warning",
      title: "Nedostatečné interní propojení",
      description: `Průměrný počet odchozích interních odkazů je ${summary.avgOutboundLinks}. Doporučujeme alespoň 3–5 interních odkazů na stránku pro lepší distribuci link equity a crawlování.`,
    });
    score -= 5;
  }

  if (summary.totalPages > 1 && summary.totalInternalLinks > 0) {
    findings.push({
      category: "seo",
      severity: "info",
      title: "Přehled interních odkazů",
      description: `Web má ${summary.totalPages} stránek a ${summary.totalInternalLinks} interních odkazů. Průměrně ${summary.avgInboundLinks} příchozích a ${summary.avgOutboundLinks} odchozích odkazů na stránku. Max. hloubka: ${summary.maxCrawlDepth} kliků.`,
    });
  }

  // Build top pages by rank for visualization
  const topPagesByRank = sortedByRank.slice(0, 10).map(m => ({
    url: m.url,
    pageRank: m.internalPageRank,
    inboundLinks: m.inboundLinks,
  }));

  return {
    score: Math.max(0, Math.min(100, score)),
    findings,
    linkGraphData: {
      metrics: graphResult.metrics,
      orphanPages: graphResult.orphanPages,
      depthHistogram: graphResult.depthHistogram,
      anchorTextStats: graphResult.anchorTextStats,
      summary: graphResult.summary,
      topPagesByRank,
      equityDistribution: equityDist,
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeEquityDistribution(sortedMetrics: PageMetrics[]): {
  topPage: number;
  bottom50: number;
  giniCoefficient: number;
} {
  if (sortedMetrics.length === 0) {
    return { topPage: 0, bottom50: 0, giniCoefficient: 0 };
  }

  const totalRank = sortedMetrics.reduce((sum, m) => sum + m.internalPageRank, 0);
  if (totalRank === 0) {
    return { topPage: 0, bottom50: 0, giniCoefficient: 0 };
  }

  const topPage = (sortedMetrics[0].internalPageRank / totalRank) * 100;

  const n = sortedMetrics.length;
  const bottom50Start = Math.floor(n / 2);
  const bottom50Rank = sortedMetrics.slice(bottom50Start).reduce((sum, m) => sum + m.internalPageRank, 0);
  const bottom50 = (bottom50Rank / totalRank) * 100;

  // Gini coefficient
  const ranks = sortedMetrics.map(m => m.internalPageRank).sort((a, b) => a - b);
  let giniNumerator = 0;
  for (let i = 0; i < n; i++) {
    giniNumerator += (2 * (i + 1) - n - 1) * ranks[i];
  }
  const giniCoefficient = n > 1 ? giniNumerator / (n * totalRank) : 0;

  return {
    topPage: Math.round(topPage * 10) / 10,
    bottom50: Math.round(bottom50 * 10) / 10,
    giniCoefficient: Math.round(Math.abs(giniCoefficient) * 100) / 100,
  };
}
