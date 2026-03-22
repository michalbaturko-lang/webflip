import { NextRequest, NextResponse } from "next/server";
import { generateFlyerHtml, type FlyerData } from "@/lib/outreach/flyer-generator";

/**
 * GET /api/admin/flyer/preview
 * Returns a flyer with mock data for testing/preview purposes.
 *
 * Query params (all optional — defaults to a sample company):
 * - company: Company name
 * - domain: Domain name
 * - score: Overall score (0-100)
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const company = url.searchParams.get("company") || "Restaurace U Zlatého Lva";
    const domain = url.searchParams.get("domain") || "uzlateholva.cz";
    const scoreOverride = url.searchParams.has("score") ? Number(url.searchParams.get("score")) : undefined;

    const baseScore = scoreOverride ?? 38;

    const mockData: FlyerData = {
      companyName: company,
      domain,
      contactName: "Jan Novák",
      overallScore: baseScore,
      scores: {
        performance: Math.min(100, baseScore + 5),
        mobile: Math.max(0, baseScore - 12),
        seo: Math.max(0, baseScore - 5),
        security: Math.min(100, baseScore + 20),
        accessibility: Math.max(0, baseScore - 8),
        design: Math.max(0, baseScore - 3),
      },
      problems: [
        "Pomalé načítání webu — návštěvníci odcházejí do 3 sekund",
        "Web není optimalizovaný pro mobily — přicházíte o 60 % návštěvníků",
        "Špatná SEO viditelnost — Google vás nezobrazuje zákazníkům",
        "Zastaralý design — web nepůsobí důvěryhodně",
        "AI asistenti (ChatGPT, Gemini) váš web nevidí — přicházíte o nové zákazníky",
        "Chybějící kontaktní formulář — zákazníci se nemají jak ozvat",
      ],
      variants: [
        {
          name: "Modern",
          previewUrl: `https://webflipper.app/api/preview/${domain}/modern`,
          features: ["Responzivní design", "Rychlé načítání", "Moderní vzhled"],
        },
        {
          name: "Professional",
          previewUrl: `https://webflipper.app/api/preview/${domain}/professional`,
          features: ["Firemní branding", "SEO optimalizace", "Kontaktní formuláře"],
        },
        {
          name: "E-commerce",
          previewUrl: `https://webflipper.app/api/preview/${domain}/ecommerce`,
          features: ["Online objednávky", "Platební brány", "Správa produktů"],
        },
      ],
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://webflipper.app/preview/${domain}?ref=flyer`)}`,
      landingPageUrl: `https://webflipper.app/preview/${domain}?ref=flyer`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    };

    const html = generateFlyerHtml(mockData);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("GET /api/admin/flyer/preview error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
