import AnalysisOrchestrator from "@/components/analysis/AnalysisOrchestrator";

interface PageProps {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ url?: string }>;
}

export default async function AnalyzePage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const { url: rawUrl } = await searchParams;
  const url = rawUrl || "example.com";

  return <AnalysisOrchestrator url={url} token={token} />;
}
