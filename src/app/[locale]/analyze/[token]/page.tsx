import AnalysisOrchestrator from "@/components/analysis/AnalysisOrchestrator";
import { getAnalysis } from "@/lib/supabase";

interface PageProps {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ url?: string }>;
}

export default async function AnalyzePage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const { url: rawUrl } = await searchParams;

  let url = rawUrl;
  if (!url) {
    const analysis = await getAnalysis(token);
    url = analysis?.url || "";
  }

  return <AnalysisOrchestrator url={url} token={token} />;
}
