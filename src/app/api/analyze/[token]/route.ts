import { NextResponse } from "next/server";
import { getAnalysis } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const analysis = await getAnalysis(token);
    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    // Return different data depending on status
    const response: Record<string, unknown> = {
      token: analysis.token,
      url: analysis.url,
      status: analysis.status,
      createdAt: analysis.created_at,
    };

    if (analysis.status === "crawling") {
      response.pageCount = analysis.page_count;
      response.pages = (analysis.crawled_pages || []).map((p) => ({
        url: p.url,
        title: p.title,
      }));
    }

    if (
      analysis.status === "analyzing" ||
      analysis.status === "generating" ||
      analysis.status === "complete"
    ) {
      response.pageCount = analysis.page_count;
      response.pages = (analysis.crawled_pages || []).map((p) => ({
        url: p.url,
        title: p.title,
      }));
      response.scores = {
        performance: analysis.score_performance,
        seo: analysis.score_seo,
        security: analysis.score_security,
        ux: analysis.score_ux,
        content: analysis.score_content,
        aiVisibility: analysis.score_ai_visibility,
        overall: analysis.score_overall,
      };
      // Live findings — show top findings during analysis/generating
      response.liveFindings = (analysis.findings || []).slice(0, 10);
      response.liveFindingsTotal = (analysis.findings || []).length;
    }

    if (analysis.status === "generating") {
      response.variantProgress = analysis.variant_progress || null;
      // Also include variants if they're already generated (before HTML step)
      if (analysis.variants && analysis.variants.length > 0) {
        response.variantsCount = analysis.variants.length;
      }
    }

    if (analysis.status === "complete") {
      // Include selected variant if present
      if (typeof analysis.selected_variant === "number") {
        response.selectedVariant = analysis.selected_variant;
      }

      // Include enrichment results (available to all)
      const enrichment = (analysis as any).enrichment_results;
      if (enrichment) {
        response.enrichment = enrichment;
      }

      // Include template clusters (available to all)
      const templateClusters = (analysis as any).template_clusters;
      if (templateClusters && templateClusters.length > 0) {
        response.templateClusters = templateClusters;
      }

      // Only show full results if email is provided (email gate)
      if (analysis.email) {
        response.findings = analysis.findings;
        response.variants = analysis.variants;
        response.htmlVariantsCount = (analysis.html_variants || []).length;
        response.completedAt = analysis.completed_at;
      } else {
        // Show scores but blur/limit findings
        response.findingsPreview = (analysis.findings || []).slice(0, 3);
        response.findingsTotal = (analysis.findings || []).length;
        response.variantsCount = (analysis.variants || []).length;
        response.htmlVariantsCount = (analysis.html_variants || []).length;
        response.emailRequired = true;
      }
    }

    if (analysis.status === "error") {
      response.error = analysis.error_message;
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("GET /api/analyze/[token] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
