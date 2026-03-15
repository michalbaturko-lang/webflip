import { NextResponse } from "next/server";
import { getAnalysis } from "@/lib/supabase";
import type { BusinessProfile } from "@/lib/supabase";
import type { RecommendationResponse } from "@/types/design";

/**
 * GET /api/analyze/[token]/recommend
 *
 * Returns AI recommendation for which template variant best fits
 * the analyzed business. Uses business_profile to match:
 * - restaurant/food → modern-bold (warm, inviting)
 * - tech/IT → corporate-clean (professional, clean)
 * - beauty/wellness → elegant-minimal (elegant, refined)
 *
 * Returns i18n reasonKey (not full text) — frontend translates.
 */

const TEMPLATE_NAMES = ["corporate-clean", "elegant-minimal", "modern-bold"];

interface IndustryRule {
  keywords: string[];
  templateIndex: number;
  reasonKey: string;
}

const INDUSTRY_RULES: IndustryRule[] = [
  {
    keywords: [
      "restaurant", "restaurace", "food", "jídlo", "gastro", "bistro",
      "café", "kavárna", "bar", "pizz", "catering", "bakery", "pekárna", "cukrárna",
    ],
    templateIndex: 2, // modern-bold
    reasonKey: "warmDesign",
  },
  {
    keywords: [
      "tech", "software", "it ", "saas", "startup", "digital", "cloud",
      "hosting", "dev", "programování", "aplikace", "data", "cyber", "ai", "automat",
    ],
    templateIndex: 0, // corporate-clean
    reasonKey: "cleanTech",
  },
  {
    keywords: [
      "beauty", "krása", "salon", "spa", "wellness", "cosmetic", "kosmetik",
      "masáž", "massage", "nail", "nehty", "hair", "vlasy", "kadeřnic", "estet", "derma",
    ],
    templateIndex: 1, // elegant-minimal
    reasonKey: "elegantBeauty",
  },
  {
    keywords: [
      "law", "právo", "advokát", "attorney", "legal", "finance", "účet",
      "account", "bank", "invest", "pojišt", "insur", "audit", "consult", "porad",
    ],
    templateIndex: 0, // corporate-clean
    reasonKey: "professionalTrust",
  },
  {
    keywords: [
      "fashion", "móda", "design", "archite", "interior", "galeri", "photo",
      "foto", "umění", "art", "creative", "kreativ", "studio",
    ],
    templateIndex: 1, // elegant-minimal
    reasonKey: "creativeMinimal",
  },
  {
    keywords: [
      "sport", "fitness", "gym", "trenér", "coach", "outdoor", "adventure",
      "travel", "cest", "auto", "motor",
    ],
    templateIndex: 2, // modern-bold
    reasonKey: "energeticDynamic",
  },
];

function getRecommendation(profile: BusinessProfile): RecommendationResponse {
  const industry = profile.industry.toLowerCase();
  const segment = profile.industrySegment.toLowerCase();
  const voice = profile.brandVoice;
  const searchText = `${industry} ${segment}`;

  // Rule-based matching with dynamic confidence
  for (const rule of INDUSTRY_RULES) {
    const matchedCount = rule.keywords.filter((kw) => searchText.includes(kw)).length;
    if (matchedCount > 0) {
      // confidence = 50% base + up to 40% based on keyword match ratio
      const confidence = Math.round(50 + (matchedCount / rule.keywords.length) * 40);
      return {
        recommendedIndex: rule.templateIndex,
        templateName: TEMPLATE_NAMES[rule.templateIndex],
        reasonKey: rule.reasonKey,
        confidence: Math.min(confidence, 90),
      };
    }
  }

  // Fallback: match by brand voice with lower confidence
  let fallbackIndex = 0;
  let fallbackReasonKey = "broadAudience";
  let voiceStrength = 0.5; // base strength

  if (voice === "luxury") {
    fallbackIndex = 1; // elegant-minimal
    fallbackReasonKey = "formalElegant";
    voiceStrength = 1.0;
  } else if (voice === "formal") {
    fallbackIndex = 1;
    fallbackReasonKey = "formalElegant";
    voiceStrength = 0.8;
  } else if (voice === "casual") {
    fallbackIndex = 2; // modern-bold
    fallbackReasonKey = "friendlyModern";
    voiceStrength = 0.9;
  } else if (voice === "friendly") {
    fallbackIndex = 2;
    fallbackReasonKey = "friendlyModern";
    voiceStrength = 0.7;
  } else if (voice === "technical") {
    fallbackIndex = 0; // corporate-clean
    fallbackReasonKey = "technicalClean";
    voiceStrength = 0.8;
  }

  // confidence = 40% base + up to 30% based on voice match strength
  const confidence = Math.round(40 + voiceStrength * 30);

  return {
    recommendedIndex: fallbackIndex,
    templateName: TEMPLATE_NAMES[fallbackIndex],
    reasonKey: fallbackReasonKey,
    confidence: Math.min(confidence, 70),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    const analysis = await getAnalysis(token);
    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    if (analysis.status !== "complete") {
      return NextResponse.json(
        { error: "Analysis not yet complete" },
        { status: 202 }
      );
    }

    if (!analysis.business_profile) {
      return NextResponse.json(
        { error: "No business profile available" },
        { status: 404 }
      );
    }

    const result = getRecommendation(analysis.business_profile);

    // Clamp to available variants
    if (result.recommendedIndex >= (analysis.variants?.length ?? 0)) {
      result.recommendedIndex = 0;
      result.templateName = TEMPLATE_NAMES[0];
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
    });
  } catch (err) {
    console.error("GET /api/analyze/[token]/recommend error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
