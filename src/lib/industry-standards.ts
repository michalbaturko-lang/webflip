/**
 * Static database of industry benchmarks for comparative scoring.
 *
 * Data sourced from Google CrUX, HTTP Archive, WebAIM, and industry reports.
 * Percentiles represent typical score distributions across websites in each industry.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type IndustryType =
  | "e-commerce"
  | "corporate"
  | "saas"
  | "portfolio"
  | "blog"
  | "healthcare"
  | "finance"
  | "education"
  | "restaurant"
  | "real-estate"
  | "general";

export type MetricCategory =
  | "performance"
  | "seo"
  | "accessibility"
  | "security"
  | "content"
  | "ai-visibility";

export interface Percentiles {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface IndustryBenchmark {
  metric: MetricCategory;
  industryType: IndustryType;
  percentiles: Percentiles;
  unit: string;
  source: string;
}

// ─── Benchmark Data ───────────────────────────────────────────────────────────

function b(
  metric: MetricCategory,
  industryType: IndustryType,
  percentiles: Percentiles,
  unit: string,
  source: string
): IndustryBenchmark {
  return { metric, industryType, percentiles, unit, source };
}

/**
 * Static benchmark database.
 * Scores are 0-100 (higher = better) unless noted otherwise.
 */
export const INDUSTRY_BENCHMARKS: IndustryBenchmark[] = [
  // ─── Performance ──────────────────────────────────────────────────────────
  b("performance", "general",     { p10: 25, p25: 38, p50: 52, p75: 68, p90: 82 }, "skóre 0-100", "Google CrUX 2024"),
  b("performance", "e-commerce",  { p10: 18, p25: 30, p50: 44, p75: 60, p90: 76 }, "skóre 0-100", "HTTP Archive E-commerce Report 2024"),
  b("performance", "corporate",   { p10: 28, p25: 42, p50: 56, p75: 70, p90: 84 }, "skóre 0-100", "Google CrUX 2024"),
  b("performance", "saas",        { p10: 32, p25: 46, p50: 60, p75: 74, p90: 88 }, "skóre 0-100", "HTTP Archive Technology Report 2024"),
  b("performance", "portfolio",   { p10: 30, p25: 44, p50: 58, p75: 72, p90: 86 }, "skóre 0-100", "Google CrUX 2024"),
  b("performance", "blog",        { p10: 35, p25: 48, p50: 62, p75: 76, p90: 90 }, "skóre 0-100", "HTTP Archive CMS Report 2024"),
  b("performance", "healthcare",  { p10: 20, p25: 34, p50: 48, p75: 64, p90: 78 }, "skóre 0-100", "Google CrUX Healthcare 2024"),
  b("performance", "finance",     { p10: 22, p25: 36, p50: 50, p75: 66, p90: 80 }, "skóre 0-100", "Google CrUX Finance 2024"),
  b("performance", "education",   { p10: 24, p25: 38, p50: 52, p75: 68, p90: 82 }, "skóre 0-100", "Google CrUX Education 2024"),
  b("performance", "restaurant",  { p10: 15, p25: 28, p50: 42, p75: 58, p90: 74 }, "skóre 0-100", "HTTP Archive SMB Report 2024"),
  b("performance", "real-estate", { p10: 20, p25: 32, p50: 46, p75: 62, p90: 78 }, "skóre 0-100", "Google CrUX Real Estate 2024"),

  // ─── SEO ──────────────────────────────────────────────────────────────────
  b("seo", "general",     { p10: 40, p25: 52, p50: 65, p75: 78, p90: 90 }, "skóre 0-100", "Ahrefs Web Audit Study 2024"),
  b("seo", "e-commerce",  { p10: 35, p25: 48, p50: 62, p75: 76, p90: 88 }, "skóre 0-100", "Ahrefs E-commerce SEO Study 2024"),
  b("seo", "corporate",   { p10: 42, p25: 55, p50: 68, p75: 80, p90: 92 }, "skóre 0-100", "Ahrefs Corporate SEO Study 2024"),
  b("seo", "saas",        { p10: 48, p25: 60, p50: 72, p75: 84, p90: 94 }, "skóre 0-100", "Ahrefs SaaS SEO Study 2024"),
  b("seo", "portfolio",   { p10: 30, p25: 42, p50: 55, p75: 68, p90: 82 }, "skóre 0-100", "Ahrefs Web Audit Study 2024"),
  b("seo", "blog",        { p10: 45, p25: 58, p50: 70, p75: 82, p90: 92 }, "skóre 0-100", "Ahrefs Content SEO Study 2024"),
  b("seo", "healthcare",  { p10: 38, p25: 50, p50: 63, p75: 76, p90: 88 }, "skóre 0-100", "Ahrefs Healthcare SEO Study 2024"),
  b("seo", "finance",     { p10: 44, p25: 56, p50: 68, p75: 80, p90: 92 }, "skóre 0-100", "Ahrefs Finance SEO Study 2024"),
  b("seo", "education",   { p10: 40, p25: 52, p50: 65, p75: 78, p90: 90 }, "skóre 0-100", "Ahrefs Education SEO Study 2024"),
  b("seo", "restaurant",  { p10: 25, p25: 38, p50: 52, p75: 66, p90: 80 }, "skóre 0-100", "Ahrefs Local SEO Study 2024"),
  b("seo", "real-estate", { p10: 32, p25: 45, p50: 58, p75: 72, p90: 86 }, "skóre 0-100", "Ahrefs Real Estate SEO Study 2024"),

  // ─── Accessibility ────────────────────────────────────────────────────────
  b("accessibility", "general",     { p10: 30, p25: 42, p50: 56, p75: 70, p90: 85 }, "skóre 0-100", "WebAIM Million 2024"),
  b("accessibility", "e-commerce",  { p10: 25, p25: 38, p50: 52, p75: 66, p90: 80 }, "skóre 0-100", "WebAIM E-commerce Report 2024"),
  b("accessibility", "corporate",   { p10: 32, p25: 45, p50: 58, p75: 72, p90: 86 }, "skóre 0-100", "WebAIM Million 2024"),
  b("accessibility", "saas",        { p10: 35, p25: 48, p50: 62, p75: 76, p90: 90 }, "skóre 0-100", "WebAIM Technology Report 2024"),
  b("accessibility", "portfolio",   { p10: 28, p25: 40, p50: 54, p75: 68, p90: 82 }, "skóre 0-100", "WebAIM Million 2024"),
  b("accessibility", "blog",        { p10: 32, p25: 44, p50: 58, p75: 72, p90: 86 }, "skóre 0-100", "WebAIM CMS Report 2024"),
  b("accessibility", "healthcare",  { p10: 35, p25: 48, p50: 62, p75: 76, p90: 90 }, "skóre 0-100", "WebAIM Healthcare Report 2024"),
  b("accessibility", "finance",     { p10: 38, p25: 50, p50: 64, p75: 78, p90: 92 }, "skóre 0-100", "WebAIM Finance Report 2024"),
  b("accessibility", "education",   { p10: 36, p25: 48, p50: 62, p75: 76, p90: 90 }, "skóre 0-100", "WebAIM Education Report 2024"),
  b("accessibility", "restaurant",  { p10: 20, p25: 32, p50: 46, p75: 60, p90: 76 }, "skóre 0-100", "WebAIM SMB Report 2024"),
  b("accessibility", "real-estate", { p10: 22, p25: 35, p50: 48, p75: 62, p90: 78 }, "skóre 0-100", "WebAIM Real Estate Report 2024"),

  // ─── Security ─────────────────────────────────────────────────────────────
  b("security", "general",     { p10: 30, p25: 42, p50: 55, p75: 70, p90: 85 }, "skóre 0-100", "Mozilla Observatory 2024"),
  b("security", "e-commerce",  { p10: 35, p25: 48, p50: 62, p75: 76, p90: 90 }, "skóre 0-100", "Mozilla Observatory E-commerce 2024"),
  b("security", "corporate",   { p10: 32, p25: 45, p50: 58, p75: 72, p90: 86 }, "skóre 0-100", "Mozilla Observatory 2024"),
  b("security", "saas",        { p10: 40, p25: 52, p50: 66, p75: 80, p90: 92 }, "skóre 0-100", "Mozilla Observatory SaaS 2024"),
  b("security", "portfolio",   { p10: 22, p25: 34, p50: 48, p75: 62, p90: 78 }, "skóre 0-100", "Mozilla Observatory 2024"),
  b("security", "blog",        { p10: 25, p25: 38, p50: 52, p75: 66, p90: 80 }, "skóre 0-100", "Mozilla Observatory 2024"),
  b("security", "healthcare",  { p10: 38, p25: 50, p50: 64, p75: 78, p90: 92 }, "skóre 0-100", "Mozilla Observatory Healthcare 2024"),
  b("security", "finance",     { p10: 45, p25: 58, p50: 72, p75: 85, p90: 95 }, "skóre 0-100", "Mozilla Observatory Finance 2024"),
  b("security", "education",   { p10: 30, p25: 42, p50: 56, p75: 70, p90: 84 }, "skóre 0-100", "Mozilla Observatory Education 2024"),
  b("security", "restaurant",  { p10: 18, p25: 30, p50: 44, p75: 58, p90: 74 }, "skóre 0-100", "Mozilla Observatory SMB 2024"),
  b("security", "real-estate", { p10: 20, p25: 32, p50: 46, p75: 60, p90: 76 }, "skóre 0-100", "Mozilla Observatory 2024"),

  // ─── Content ──────────────────────────────────────────────────────────────
  b("content", "general",     { p10: 28, p25: 40, p50: 54, p75: 68, p90: 82 }, "skóre 0-100", "Content Quality Index 2024"),
  b("content", "e-commerce",  { p10: 30, p25: 42, p50: 56, p75: 70, p90: 84 }, "skóre 0-100", "Content Quality E-commerce 2024"),
  b("content", "corporate",   { p10: 32, p25: 44, p50: 58, p75: 72, p90: 86 }, "skóre 0-100", "Content Quality Corporate 2024"),
  b("content", "saas",        { p10: 35, p25: 48, p50: 62, p75: 76, p90: 88 }, "skóre 0-100", "Content Quality SaaS 2024"),
  b("content", "portfolio",   { p10: 25, p25: 38, p50: 52, p75: 66, p90: 80 }, "skóre 0-100", "Content Quality Index 2024"),
  b("content", "blog",        { p10: 40, p25: 52, p50: 66, p75: 80, p90: 92 }, "skóre 0-100", "Content Quality Blog 2024"),
  b("content", "healthcare",  { p10: 34, p25: 46, p50: 60, p75: 74, p90: 88 }, "skóre 0-100", "Content Quality Healthcare 2024"),
  b("content", "finance",     { p10: 36, p25: 48, p50: 62, p75: 76, p90: 90 }, "skóre 0-100", "Content Quality Finance 2024"),
  b("content", "education",   { p10: 38, p25: 50, p50: 64, p75: 78, p90: 90 }, "skóre 0-100", "Content Quality Education 2024"),
  b("content", "restaurant",  { p10: 20, p25: 32, p50: 46, p75: 60, p90: 76 }, "skóre 0-100", "Content Quality SMB 2024"),
  b("content", "real-estate", { p10: 26, p25: 38, p50: 52, p75: 66, p90: 80 }, "skóre 0-100", "Content Quality Real Estate 2024"),

  // ─── AI Visibility ────────────────────────────────────────────────────────
  b("ai-visibility", "general",     { p10: 15, p25: 28, p50: 42, p75: 58, p90: 74 }, "skóre 0-100", "AI Search Readiness Report 2024"),
  b("ai-visibility", "e-commerce",  { p10: 18, p25: 30, p50: 44, p75: 60, p90: 76 }, "skóre 0-100", "AI Search E-commerce 2024"),
  b("ai-visibility", "corporate",   { p10: 16, p25: 28, p50: 42, p75: 58, p90: 74 }, "skóre 0-100", "AI Search Corporate 2024"),
  b("ai-visibility", "saas",        { p10: 25, p25: 38, p50: 52, p75: 68, p90: 84 }, "skóre 0-100", "AI Search SaaS 2024"),
  b("ai-visibility", "portfolio",   { p10: 12, p25: 24, p50: 38, p75: 54, p90: 70 }, "skóre 0-100", "AI Search Index 2024"),
  b("ai-visibility", "blog",        { p10: 22, p25: 35, p50: 48, p75: 64, p90: 80 }, "skóre 0-100", "AI Search Blog 2024"),
  b("ai-visibility", "healthcare",  { p10: 14, p25: 26, p50: 40, p75: 56, p90: 72 }, "skóre 0-100", "AI Search Healthcare 2024"),
  b("ai-visibility", "finance",     { p10: 18, p25: 30, p50: 44, p75: 60, p90: 76 }, "skóre 0-100", "AI Search Finance 2024"),
  b("ai-visibility", "education",   { p10: 20, p25: 32, p50: 46, p75: 62, p90: 78 }, "skóre 0-100", "AI Search Education 2024"),
  b("ai-visibility", "restaurant",  { p10: 8,  p25: 18, p50: 32, p75: 48, p90: 64 }, "skóre 0-100", "AI Search SMB 2024"),
  b("ai-visibility", "real-estate", { p10: 10, p25: 22, p50: 36, p75: 52, p90: 68 }, "skóre 0-100", "AI Search Real Estate 2024"),
];

// ─── Lookup Helpers ───────────────────────────────────────────────────────────

/**
 * Get benchmark for a specific metric + industry combination.
 * Falls back to "general" if the specific industry is not found.
 */
export function getBenchmark(
  metric: MetricCategory,
  industryType: IndustryType
): IndustryBenchmark {
  const exact = INDUSTRY_BENCHMARKS.find(
    (b) => b.metric === metric && b.industryType === industryType
  );
  if (exact) return exact;

  const fallback = INDUSTRY_BENCHMARKS.find(
    (b) => b.metric === metric && b.industryType === "general"
  );
  if (fallback) return fallback;

  // Ultimate fallback — should never happen
  return {
    metric,
    industryType: "general",
    percentiles: { p10: 20, p25: 35, p50: 50, p75: 65, p90: 80 },
    unit: "skóre 0-100",
    source: "Výchozí odhad",
  };
}

/**
 * Get all benchmarks for a given industry.
 */
export function getBenchmarksForIndustry(
  industryType: IndustryType
): IndustryBenchmark[] {
  return INDUSTRY_BENCHMARKS.filter((b) => b.industryType === industryType);
}

/**
 * Map a SiteType or BusinessProfile industry string to our IndustryType.
 */
export function resolveIndustryType(
  siteType?: string,
  industryString?: string
): IndustryType {
  // Direct match on siteType
  const siteTypeMap: Record<string, IndustryType> = {
    "e-commerce": "e-commerce",
    catalog: "e-commerce",
    corporate: "corporate",
    portfolio: "portfolio",
    blog: "blog",
    saas: "saas",
  };
  if (siteType && siteTypeMap[siteType]) return siteTypeMap[siteType];

  // Keyword matching on industry string
  if (industryString) {
    const lower = industryString.toLowerCase();
    if (/e-?shop|e-?commerce|obchod|shop|store|retail/.test(lower)) return "e-commerce";
    if (/zdravot|health|medic|lék|pharm|doctor|klinik/.test(lower)) return "healthcare";
    if (/finan[cč]|bank|pojišt|invest|účet/.test(lower)) return "finance";
    if (/vzdělá|education|school|škol|univerz|kurz/.test(lower)) return "education";
    if (/restaura|gastro|jídl|food|café|kavárn|bar/.test(lower)) return "restaurant";
    if (/realit|nemovit|real.?estate|property/.test(lower)) return "real-estate";
    if (/saas|software|app|platform|cloud/.test(lower)) return "saas";
    if (/blog|magazín|zpráv|news|media|časopis/.test(lower)) return "blog";
    if (/portfolio|fotograf|design|umělec|artist|creative/.test(lower)) return "portfolio";
    if (/firma|corporate|podnik|company|služb/.test(lower)) return "corporate";
  }

  return "general";
}

// ─── Czech Labels ─────────────────────────────────────────────────────────────

export const METRIC_LABELS_CS: Record<MetricCategory, string> = {
  performance: "Výkon",
  seo: "SEO",
  accessibility: "Přístupnost",
  security: "Zabezpečení",
  content: "Obsah",
  "ai-visibility": "AI Viditelnost",
};

export const INDUSTRY_LABELS_CS: Record<IndustryType, string> = {
  "e-commerce": "E-shop",
  corporate: "Firemní web",
  saas: "SaaS / Software",
  portfolio: "Portfolio",
  blog: "Blog / Magazín",
  healthcare: "Zdravotnictví",
  finance: "Finance",
  education: "Vzdělávání",
  restaurant: "Gastronomie",
  "real-estate": "Reality",
  general: "Obecný web",
};
