import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// GET: Fetch outreach data for landing page (public, no auth)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createServerClient();

  try {
    // Fetch CRM record by slug
    const { data: record, error } = await supabase
      .from("crm_records")
      .select("*")
      .eq("outreach_slug", slug)
      .single();

    if (error || !record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Fetch analysis data if linked
    let analysis = null;
    if (record.analysis_id) {
      const { data } = await supabase
        .from("analyses")
        .select(
          "token, url, status, score_performance, score_seo, score_security, score_ux, score_content, score_ai_visibility, score_overall, variants, html_variants, findings, extracted_assets, business_profile, enrichment_results"
        )
        .eq("id", record.analysis_id)
        .single();
      analysis = data;
    } else {
      // Try to find analysis by domain
      const { data } = await supabase
        .from("analyses")
        .select(
          "token, url, status, score_performance, score_seo, score_security, score_ux, score_content, score_ai_visibility, score_overall, variants, html_variants, findings, extracted_assets, business_profile, enrichment_results"
        )
        .ilike("url", `%${record.domain}%`)
        .eq("status", "complete")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      analysis = data;
    }

    // Track visit (atomic increment to avoid race conditions)
    await supabase.rpc("increment_landing_page_visits", {
      record_id: record.id,
    });

    // Log activity
    await supabase.from("crm_activities").insert({
      crm_record_id: record.id,
      type: "website_visit",
      subject: "Landing page visit",
      metadata: {
        slug,
        user_agent: request.headers.get("user-agent"),
        referer: request.headers.get("referer"),
      },
    });

    // Auto-advance to "engaged" if currently "contacted"
    if (record.stage === "contacted") {
      await supabase
        .from("crm_records")
        .update({ stage: "engaged" })
        .eq("id", record.id);
    }

    return NextResponse.json({
      company: {
        name: record.company_name,
        domain: record.domain,
        website_url: record.website_url,
      },
      analysis: analysis
        ? {
            token: analysis.token,
            status: analysis.status,
            scores: {
              performance: analysis.score_performance,
              seo: analysis.score_seo,
              security: analysis.score_security,
              ux: analysis.score_ux,
              content: analysis.score_content,
              aiVisibility: analysis.score_ai_visibility,
              overall: analysis.score_overall,
            },
            variants: analysis.variants,
            variantCount: analysis.html_variants?.length || 0,
            findings: (analysis.findings || []).slice(0, 5),
            companyName: analysis.extracted_assets?.companyName,
            businessProfile: analysis.business_profile,
            enrichment: analysis.enrichment_results
              ? {
                  letterGrade: analysis.enrichment_results.letterGrade,
                  healthScore: analysis.enrichment_results.healthScore,
                  topRecommendations:
                    analysis.enrichment_results.executiveSummary
                      ?.topRecommendations?.slice(0, 3),
                }
              : null,
          }
        : null,
      has_analysis: !!analysis,
    });
  } catch (err) {
    console.error("GET /api/outreach/[slug] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
