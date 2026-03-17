import { createClient } from "@supabase/supabase-js";

export type AnalysisStatus =
  | "pending"
  | "crawling"
  | "analyzing"
  | "generating"
  | "complete"
  | "error";

export interface Finding {
  category: string;
  severity: "critical" | "warning" | "ok" | "info";
  title: string;
  description: string;
}

export interface CategoryScore {
  score: number;
  findings: Finding[];
}

export type PageType =
  | "homepage"
  | "product-listing"
  | "product-detail"
  | "blog-listing"
  | "blog-post"
  | "about"
  | "contact"
  | "gallery"
  | "services"
  | "pricing"
  | "other";

export type SiteType =
  | "corporate"
  | "e-commerce"
  | "catalog"
  | "portfolio"
  | "blog"
  | "saas";

export interface CrawledImage {
  url: string;
  alt: string;
  context: "hero" | "product" | "gallery" | "background" | "logo" | "icon" | "content" | "other";
  section?: string;
  surroundingText?: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
}

export interface CrawledProduct {
  name: string;
  description: string;
  price?: string;
  imageUrl?: string;
  specs?: Record<string, string>;
  url?: string;
}

export interface CrawledBlogPost {
  title: string;
  date?: string;
  author?: string;
  featuredImage?: string;
  excerpt: string;
  categories?: string[];
  url?: string;
}

export interface NavigationStructure {
  header: { text: string; href: string }[];
  footer: { text: string; href: string }[];
  breadcrumbs?: { text: string; href: string }[][];
}

export interface ExtractedAssets {
  logo?: string;
  favicon?: string;
  images: CrawledImage[];
  colors: string[];
  companyName?: string;
  metaDescription?: string;
  socialLinks: string[];
  navLinks: { text: string; href: string }[];
  phoneNumbers: string[];
  emails: string[];
  address?: string;
  heroImageUrl?: string;
  siteType?: SiteType;
  products?: CrawledProduct[];
  blogPosts?: CrawledBlogPost[];
  navigation?: NavigationStructure;
  pageTypes?: Record<string, PageType>;
}

export interface VariantProgress {
  current: number;
  total: number;
  message: string;
}

export interface EditHistoryEntry {
  variant_index: number;
  instruction: string;
  timestamp: string;
  previous_html: string;
}

export interface TemplateClusterData {
  id: string;
  name: string;
  templateHash: string;
  pageUrls: string[];
  pageCount: number;
  representativeUrl: string;
  commonIssues: Finding[];
  templateElements: string[];
  contentElements: string[];
}

export interface SEOSuggestionsData {
  suggestions: {
    page_url: string;
    element: "title" | "meta_description" | "h1" | "content_gap";
    current_value: string;
    suggested_value: string;
    reasoning: string;
    impact: "high" | "medium" | "low";
    effort: "easy" | "medium" | "hard";
  }[];
  content_strategy: {
    primary_keywords: string[];
    secondary_keywords: string[];
    content_gaps: string[];
    competitor_angles: string[];
  };
  summary: string;
}

export interface AnalysisRow {
  id: string;
  token: string;
  url: string;
  email: string | null;
  status: AnalysisStatus;
  cloudflare_job_id: string | null;
  crawled_pages: { url: string; title: string; markdown: string; html: string }[];
  page_count: number;
  score_performance: number | null;
  score_seo: number | null;
  score_security: number | null;
  score_ux: number | null;
  score_content: number | null;
  score_ai_visibility: number | null;
  score_overall: number | null;
  analysis_results: Record<string, CategoryScore> | null;
  findings: Finding[];
  variants: DesignVariant[];
  html_variants: string[];
  extracted_assets: ExtractedAssets | null;
  business_profile: BusinessProfile | null;
  variant_progress: VariantProgress | null;
  edit_history: EditHistoryEntry[] | null;
  enrichment_results: EnrichmentResults | null;
  benchmark_results: BenchmarkResultsData | null;
  seo_suggestions: SEOSuggestionsData | null;
  link_graph_data: Record<string, unknown> | null;
      template_clusters: TemplateClusterData[] | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  error_message: string | null;
  selected_variant?: number | null;
}

/** Serializable benchmark results stored in Supabase JSONB column. */
export interface BenchmarkResultsData {
  industryType: string;
  industryLabel: string;
  percentileRanks: {
    metric: string;
    score: number;
    percentile: number;
    industryMedian: number;
    delta: number;
    label: string;
  }[];
  categoryGrades: {
    metric: string;
    grade: string;
    score: number;
    percentile: number;
    label: string;
  }[];
  improvements: {
    metric: string;
    currentScore: number;
    targetScore: number;
    potentialGain: number;
    priority: string;
    description: string;
  }[];
  executiveDashboard: {
    overallHealthScore: number;
    overallGrade: string;
    radarChart: { axis: string; value: number; benchmark: number }[];
    quickWins: {
      title: string;
      category: string;
      impact: number;
      effort: string;
      description: string;
    }[];
    competitorComparison: {
      industryType: string;
      industryLabel: string;
      overallPercentile: number;
      summary: string;
    };
    trendIndicators: {
      metric: string;
      direction: string;
      label: string;
    }[];
    categoryGrades: {
      metric: string;
      grade: string;
      score: number;
      percentile: number;
      label: string;
    }[];
  };
}

export interface BusinessProfile {
  industry: string;
  industrySegment: string;
  targetAudience: string[];
  valuePropositions: string[];
  coreServices: { name: string; description: string }[];
  painPointsSolved: string[];
  differentiators: string[];
  brandVoice: "formal" | "friendly" | "technical" | "luxury" | "casual";
  businessMaturity: "startup" | "growing" | "established" | "enterprise";
  geographicFocus: string;
  keyBusinessClaims: string[];
  customerJourneyStage: string;
  contentThemes: string[];
  faqSeedTopics: string[];
  blogSeedTopics: string[];
  language: string;
  summary: string;
}

export interface DesignVariant {
  name: string;
  description: string;
  palette: { primary: string; secondary: string; accent: string; bg: string; text: string };
  typography: { heading: string; body: string };
  layout: string;
  keyFeatures: string[];
}

export interface EnrichmentResults {
  businessType: string;
  letterGrade: string;
  healthScore: number;
  executiveSummary: {
    overallScore: number;
    letterGrade: string;
    criticalCount: number;
    warningCount: number;
    topRecommendations: string[];
    quickWinCount: number;
    estimatedImprovementPotential: number;
  };
  recommendations: {
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
    category: string;
  }[];
  impactEstimates: {
    trafficImprovement: number;
    conversionImprovement: number;
    accessibilityCompliance: number;
    healthScoreImprovement: number;
  };
  enrichedFindings: {
    findingId: string;
    finding: Finding;
    explanation: string;
    howToFix: string;
    expectedImprovement: string;
    priorityScore: number;
    businessImpact: string;
    businessValueScore: number;
    effortScore: number;
    roi: number;
    category: "quick-win" | "strategic" | "low-priority" | "complex";
  }[];
}

// Server-side client (service role — full access)
export function createServerClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env variables");
  }
  return createClient(url, key);
}

// Helper: create analysis record
export async function createAnalysis(url: string, token: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("analyses")
    .insert({ url, token, status: "pending" as AnalysisStatus })
    .select()
    .single();
  if (error) throw new Error(`Failed to create analysis: ${error.message}`);
  return data as AnalysisRow;
}

// Helper: get analysis by token
export async function getAnalysis(token: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("token", token)
    .single();
  if (error) return null;
  return data as AnalysisRow;
}

// Helper: update analysis
export async function updateAnalysis(token: string, updates: Partial<AnalysisRow>) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("analyses")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("token", token);
  if (error) throw new Error(`Failed to update analysis: ${error.message}`);
}
