import { NextResponse } from "next/server";
import { preScan } from "@/lib/suitability/pre-scan";
import { classifyWebsite } from "@/lib/suitability/classifier";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'url' parameter" },
        { status: 400 }
      );
    }

    // Validate URL format
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    try {
      new URL(normalizedUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Run lightweight pre-scan
    const scanData = await preScan(normalizedUrl);

    // Classify with Haiku
    const result = await classifyWebsite(scanData);

    // Save to database
    try {
      const supabase = createServerClient();
      await supabase.from("pre_scans").upsert(
        {
          url: scanData.url,
          domain: scanData.domain,
          title: scanData.title || null,
          meta_description: scanData.metaDescription || null,
          tech_stack: scanData.techStack,
          page_type: scanData.pageType,
          estimated_page_count: scanData.estimatedPageCount,
          has_ecommerce: scanData.hasEcommerce,
          has_contact_form: scanData.hasContactForm,
          language: scanData.language || null,
          html_size: scanData.htmlSize,
          score_redesign_need: result.scores.redesign_need,
          score_business_viability: result.scores.business_viability,
          score_complexity_fit: result.scores.complexity_fit,
          score_contact_reachability: result.scores.contact_reachability,
          score_overall: result.score_overall,
          classification: result.classification,
          reason: result.reason,
        },
        { onConflict: "domain" }
      );
    } catch (dbErr) {
      console.error("[pre-scan] DB save failed:", dbErr);
      // Don't fail the request if DB save fails
    }

    return NextResponse.json({
      domain: result.domain,
      classification: result.classification,
      score_overall: result.score_overall,
      scores: result.scores,
      reason: result.reason,
      recommended_action: result.recommended_action,
      auto_disqualified: result.auto_disqualified,
      disqualification_reason: result.disqualification_reason,
      scan_data: {
        title: scanData.title,
        tech_stack: scanData.techStack,
        page_type: scanData.pageType,
        estimated_page_count: scanData.estimatedPageCount,
        has_responsive_design: scanData.hasResponsiveDesign,
      },
    });
  } catch (err) {
    console.error("[pre-scan] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
