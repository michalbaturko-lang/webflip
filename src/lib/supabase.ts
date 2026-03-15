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
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export interface DesignVariant {
  name: string;
  description: string;
  palette: { primary: string; secondary: string; accent: string; bg: string; text: string };
  typography: { heading: string; body: string };
  layout: string;
  keyFeatures: string[];
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
