import { notFound } from "next/navigation";
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
    try {
      const analysis = await getAnalysis(token);
      if (!analysis) {
        notFound();
      }
      url = analysis.url;
    } catch {
      notFound();
    }
  }

  if (!url) {
    notFound();
  }

  return <AnalysisOrchestrator url={url} token={token} />;
}
