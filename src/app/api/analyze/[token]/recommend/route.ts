import { NextResponse } from "next/server";
import { getAnalysis } from "@/lib/supabase";
import type { BusinessProfile } from "@/lib/supabase";

/**
 * GET /api/analyze/[token]/recommend
 *
 * Returns AI recommendation for which template variant best fits
 * the analyzed business. Uses business_profile to match:
 * - restaurant/food → modern-bold (warm, inviting)
 * - tech/IT → corporate-clean (professional, clean)
 * - beauty/wellness → elegant-minimal (elegant, refined)
 */

const TEMPLATE_NAMES = ["corporate-clean", "elegant-minimal", "modern-bold"];

interface IndustryRule {
  keywords: string[];
  templateIndex: number;
  reason: string;
}

const INDUSTRY_RULES: IndustryRule[] = [
  {
    keywords: [
      "restaurant",
      "restaurace",
      "food",
      "jídlo",
      "gastro",
      "bistro",
      "café",
      "kavárna",
      "bar",
      "pizz",
      "catering",
      "bakery",
      "pekárna",
      "cukrárna",
    ],
    templateIndex: 2, // modern-bold
    reason: "Teplý a výrazný design přitáhne pozornost hostů",
  },
  {
    keywords: [
      "tech",
      "software",
      "it ",
      "saas",
      "startup",
      "digital",
      "cloud",
      "hosting",
      "dev",
      "programování",
      "aplikace",
      "data",
      "cyber",
      "ai",
      "automat",
    ],
    templateIndex: 0, // corporate-clean
    reason: "Čistý profesionální design buduje důvěru v technologické firmě",
  },
  {
    keywords: [
      "beauty",
      "krása",
      "salon",
      "spa",
      "wellness",
      "cosmetic",
      "kosmetik",
      "masáž",
      "massage",
      "nail",
      "nehty",
      "hair",
      "vlasy",
      "kadeřnic",
      "estet",
      "derma",
    ],
    templateIndex: 1, // elegant-minimal
    reason: "Elegantní minimalistický design podtrhuje luxusní zážitek",
  },
  {
    keywords: [
      "law",
      "právo",
      "advokát",
      "attorney",
      "legal",
      "finance",
      "účet",
      "account",
      "bank",
      "invest",
      "pojišt",
      "insur",
      "audit",
      "consult",
      "porad",
    ],
    templateIndex: 0, // corporate-clean
    reason: "Profesionální design vzbuzuje důvěru u klientů",
  },
  {
    keywords: [
      "fashion",
      "móda",
      "design",
      "archite",
      "interior",
      "galeri",
      "photo",
      "foto",
      "umění",
      "art",
      "creative",
      "kreativ",
      "studio",
    ],
    templateIndex: 1, // elegant-minimal
    reason: "Minimalistický design nechá vyniknout kreativní práci",
  },
  {
    keywords: [
      "sport",
      "fitness",
      "gym",
      "trenér",
      "coach",
      "outdoor",
      "adventure",
      "travel",
      "cest",
      "auto",
      "motor",
    ],
    templateIndex: 2, // modern-bold
    reason: "Energický design odpovídá dynamickému oboru",
  },
];

function getRecommendation(profile: BusinessProfile): {
  recommendedIndex: number;
  templateName: string;
  reason: string;
  confidence: number;
} {
  const industry = profile.industry.toLowerCase();
  const segment = profile.industrySegment.toLowerCase();
  const voice = profile.brandVoice;
  const searchText = `${industry} ${segment}`;

  // Rule-based matching
  for (const rule of INDUSTRY_RULES) {
    if (rule.keywords.some((kw) => searchText.includes(kw))) {
      return {
        recommendedIndex: rule.templateIndex,
        templateName: TEMPLATE_NAMES[rule.templateIndex],
        reason: rule.reason,
        confidence: 85,
      };
    }
  }

  // Fallback: match by brand voice
  let fallbackIndex = 0;
  let fallbackReason = "Profesionální design pro širokou cílovou skupinu";

  if (voice === "luxury" || voice === "formal") {
    fallbackIndex = 1; // elegant-minimal
    fallbackReason = "Elegantní design odpovídá formálnímu tónu značky";
  } else if (voice === "casual" || voice === "friendly") {
    fallbackIndex = 2; // modern-bold
    fallbackReason = "Moderní živý design odpovídá přátelskému tónu značky";
  } else if (voice === "technical") {
    fallbackIndex = 0; // corporate-clean
    fallbackReason = "Čistý design pro technicky zaměřenou komunikaci";
  }

  return {
    recommendedIndex: fallbackIndex,
    templateName: TEMPLATE_NAMES[fallbackIndex],
    reason: fallbackReason,
    confidence: 65,
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
