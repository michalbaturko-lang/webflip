import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { createActivity } from "@/lib/admin/queries";
import type { CrmRecord } from "@/types/admin";
import PreviewHero from "@/components/preview-domain/PreviewHero";
import AnalysisScores from "@/components/preview-domain/AnalysisScores";
import VariantCards from "@/components/preview-domain/VariantCards";
import CountdownTimer from "@/components/preview-domain/CountdownTimer";
import CTASection from "@/components/preview-domain/CTASection";
import PreviewFooter from "@/components/preview-domain/PreviewFooter";

interface PageProps {
  params: Promise<{ locale: string; domain: string }>;
  searchParams: Promise<{
    ref?: string;
    rid?: string;
    play?: string;
  }>;
}

export default async function PreviewDomainPage({
  params,
  searchParams,
}: PageProps) {
  const { domain } = await params;
  const { ref, rid, play } = await searchParams;

  // Fetch the CRM record by domain
  const supabase = createServerClient();
  const { data: record, error } = await supabase
    .from("crm_records")
    .select("*")
    .eq("domain", domain)
    .single();

  if (error || !record) {
    notFound();
  }

  const crmRecord = record as CrmRecord;

  // Log page view activity
  try {
    await createActivity({
      crm_record_id: crmRecord.id,
      type: "page_viewed",
      metadata: {
        page: "preview_domain",
        ref: ref || "direct",
        domain,
      },
    });
  } catch (err) {
    console.error("Failed to log page view:", err);
  }

  // Extract metadata
  const metadata = (crmRecord as any).metadata || {};
  const variants = metadata.variants || [];
  const videoUrl = metadata.videoUrl || null;
  const analysisToken = metadata.analysis_token || crmRecord.analysis_id;

  // Default placeholder company name
  const companyName = crmRecord.company_name || domain || "Your Company";

  return (
    <main className="min-h-screen bg-background">
      <PreviewHero
        companyName={companyName}
        videoUrl={videoUrl}
        autoPlay={Boolean(play)}
      />

      <AnalysisScores recordId={crmRecord.id} analysisToken={analysisToken} />

      <VariantCards
        variants={variants}
        analysisToken={analysisToken}
        domain={domain}
      />

      <CountdownTimer
        createdAt={crmRecord.created_at}
        recordId={crmRecord.id}
      />

      <CTASection domain={domain} recordId={crmRecord.id} />

      <PreviewFooter />
    </main>
  );
}
