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
        accessibility: analysis.score_accessibility,
        overall: analysis.score_overall,
      };
      // Live findings — show top findings during analysis/generating
      response.liveFindings = (analysis.findings || []).slice(0, 10);
      response.liveFindingsTotal = (analysis.findings || []).length;

      // PageSpeed metrics for Core Web Vitals display
      if ((analysis as any).pagespeed_metrics) {
        response.pagespeedMetrics = (analysis as any).pagespeed_metrics;
      }
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

      // Include SEO suggestions (available to all)
      const seoSuggestions = (analysis as any).seo_suggestions;
      if (seoSuggestions) {
        response.seoSuggestions = seoSuggestions;
      }

      // Include template clusters (available to all)
      const templateClusters = (analysis as any).template_clusters;
      if (templateClusters && templateClusters.length > 0) {
        response.templateClusters = templateClusters;
      }

      // 3-tier access: no email → email (freemium) → paid (full)
      const reportUnlocked = !!(analysis as any).report_unlocked;

      if (analysis.email) {
        response.findings = analysis.findings;
        response.variants = analysis.variants;
        response.htmlVariantsCount = (analysis.html_variants || []).length;
        response.completedAt = analysis.completed_at;

        if (reportUnlocked) {
          // Full paid access — everything visible + PDF download
          response.reportUnlocked = true;
        } else {
          // Freemium: findings visible, but enriched details limited to first 5
          // Strip howToFix/expectedImprovement/businessImpact from enriched findings after first 5
          response.reportPaymentRequired = true;
          response.reportPrice = 3499;
          response.reportCurrency = "CZK";
          if (enrichment) {
            const FREE_ENRICHED_LIMIT = 5;
            const gated = { ...enrichment };
            gated.enrichedFindings = enrichment.enrichedFindings.map(
              (ef: any, idx: number) => {
                if (idx < FREE_ENRICHED_LIMIT) return ef;
                // Strip premium details from gated findings
                const { howToFix, expectedImprovement, businessImpact, ...rest } = ef;
                return { ...rest, locked: true };
              }
            );
            // Strip detailed recommendations after first 3
            gated.recommendations = enrichment.recommendations.map(
              (rec: any, idx: number) => {
                if (idx < 3) return rec;
                return { title: rec.title, impact: rec.impact, locked: true };
              }
            );
            response.enrichment = gated;
          }
        }
      } else {
        // No email — show scores but blur/limit findings
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
