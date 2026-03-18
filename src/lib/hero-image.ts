/**
 * Hero Image Generation System
 *
 * Tiered approach:
 * 1. Unsplash API — free, <500ms, professional stock photos
 * 2. fal.ai FLUX — AI-generated, ~15s, $0.008/image, contextual
 * 3. CSS gradient fallback — instant, $0, abstract mesh from brand colors
 */

import type { BusinessProfile, ExtractedAssets } from "./supabase";

export interface HeroImageResult {
  url: string;
  source: "unsplash" | "flux" | "gradient" | "original";
  attribution?: string; // Unsplash requires attribution
  photographer?: string;
  photographerUrl?: string;
}

// ── Industry → Search Query Mapping ──

const INDUSTRY_QUERIES: Record<string, string[]> = {
  // Manufacturing & Industrial
  manufacturing: ["factory industrial production", "modern warehouse", "manufacturing machinery"],
  "industrial equipment": ["warehouse shelving industrial", "steel factory production", "heavy machinery equipment"],
  construction: ["modern architecture building", "construction site aerial", "urban development skyline"],

  // Technology
  technology: ["modern office technology", "digital transformation abstract", "tech workspace minimal"],
  saas: ["modern office laptop workspace", "cloud computing abstract", "digital technology workspace"],
  software: ["code programming workspace", "modern tech office", "digital innovation"],

  // E-commerce & Retail
  ecommerce: ["modern shopping experience", "retail store design", "e-commerce packaging delivery"],
  retail: ["modern retail store interior", "shopping boutique elegant", "retail display design"],

  // Food & Restaurant
  restaurant: ["fine dining restaurant interior", "modern restaurant design", "food preparation kitchen"],
  food: ["gourmet food photography", "modern kitchen cooking", "artisan food preparation"],
  bakery: ["artisan bakery bread", "pastry shop interior", "fresh baked goods"],

  // Health & Medical
  healthcare: ["modern medical facility", "healthcare clinic interior", "medical technology"],
  dental: ["modern dental clinic", "dental office interior", "healthcare professional"],
  fitness: ["modern gym fitness", "wellness yoga studio", "fitness training equipment"],

  // Professional Services
  consulting: ["modern business meeting", "corporate office interior", "professional teamwork"],
  legal: ["law firm office modern", "justice courthouse", "legal professional office"],
  finance: ["financial district skyline", "modern banking office", "business finance growth"],
  accounting: ["modern office workspace", "business analytics dashboard", "financial planning"],

  // Real Estate
  "real estate": ["modern house architecture", "luxury home interior", "real estate aerial city"],

  // Education
  education: ["modern university campus", "classroom learning technology", "education library books"],

  // Creative & Design
  design: ["creative studio workspace", "design agency office", "minimalist architecture"],
  marketing: ["modern marketing agency", "creative team brainstorming", "digital marketing workspace"],
  photography: ["photography studio setup", "camera lens artistic", "photo studio lighting"],

  // Travel & Hospitality
  travel: ["luxury travel destination", "modern hotel lobby", "scenic travel landscape"],
  hotel: ["luxury hotel interior", "modern hotel room design", "hotel lobby elegant"],

  // Automotive
  automotive: ["modern car showroom", "automotive workshop", "luxury automobile"],

  // Agriculture
  agriculture: ["modern agriculture farm", "sustainable farming field", "agricultural technology"],

  // Default / Generic
  corporate: ["modern corporate office", "professional business environment", "corporate building architecture"],
};

function getSearchQueries(
  businessProfile?: BusinessProfile | null,
  assets?: ExtractedAssets | null
): string[] {
  const queries: string[] = [];

  if (businessProfile) {
    // Try exact industry match
    const industry = businessProfile.industry.toLowerCase();
    const segment = businessProfile.industrySegment?.toLowerCase() || "";

    if (INDUSTRY_QUERIES[segment]) {
      queries.push(...INDUSTRY_QUERIES[segment]);
    }
    if (INDUSTRY_QUERIES[industry]) {
      queries.push(...INDUSTRY_QUERIES[industry]);
    }

    // Build query from business context
    if (businessProfile.coreServices?.length > 0) {
      const serviceTerms = businessProfile.coreServices
        .slice(0, 2)
        .map(s => s.name)
        .join(" ");
      queries.push(`${serviceTerms} professional`);
    }

    // Add industry-specific query
    if (queries.length === 0) {
      queries.push(`${industry} professional business`);
    }
  }

  // Site type fallback
  if (assets?.siteType) {
    const siteTypeQueries: Record<string, string> = {
      ecommerce: "modern online shopping experience",
      corporate: "professional business environment",
      portfolio: "creative workspace design studio",
      blog: "modern writing workspace editorial",
      restaurant: "fine dining restaurant ambiance",
      medical: "modern healthcare clinic",
      education: "university campus learning",
    };
    if (siteTypeQueries[assets.siteType]) {
      queries.push(siteTypeQueries[assets.siteType]);
    }
  }

  // Absolute fallback
  if (queries.length === 0) {
    queries.push("modern professional business", "corporate office architecture");
  }

  return [...new Set(queries)]; // Deduplicate
}

// ── Tier 1: Unsplash API ──

async function searchUnsplash(query: string): Promise<HeroImageResult | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.log("[hero-image] No UNSPLASH_ACCESS_KEY, skipping Unsplash");
    return null;
  }

  try {
    const params = new URLSearchParams({
      query,
      per_page: "5",
      orientation: "landscape",
      content_filter: "high", // Only high-quality, safe images
    });

    const res = await fetch(
      `https://api.unsplash.com/search/photos?${params}`,
      {
        headers: { Authorization: `Client-ID ${accessKey}` },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!res.ok) {
      console.warn(`[hero-image] Unsplash API error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const results = data.results as Array<{
      urls: { regular: string; full: string };
      user: { name: string; links: { html: string } };
      links: { download_location: string };
      description: string | null;
      alt_description: string | null;
    }>;

    if (!results || results.length === 0) return null;

    // Pick the first result (Unsplash ranks by relevance)
    const photo = results[0];

    // Trigger download event (required by Unsplash API guidelines)
    fetch(`${photo.links.download_location}?client_id=${accessKey}`).catch(() => {});

    // Use regular size (1080px wide) — good balance of quality and load speed
    return {
      url: photo.urls.regular,
      source: "unsplash",
      attribution: `Photo by ${photo.user.name} on Unsplash`,
      photographer: photo.user.name,
      photographerUrl: photo.user.links.html,
    };
  } catch (err) {
    console.warn("[hero-image] Unsplash fetch failed:", err);
    return null;
  }
}

// ── Tier 2: fal.ai FLUX Image Generation ──

async function generateWithFlux(
  businessProfile: BusinessProfile | null,
  assets: ExtractedAssets | null,
  companyName: string
): Promise<HeroImageResult | null> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    console.log("[hero-image] No FAL_KEY, skipping FLUX generation");
    return null;
  }

  try {
    // Build a detailed prompt for the hero image
    const industry = businessProfile?.industry || "business";
    const segment = businessProfile?.industrySegment || "";
    const brandColors = assets?.colors?.slice(0, 3).join(", ") || "";

    const prompt = buildFluxPrompt(industry, segment, companyName, brandColors);

    console.log(`[hero-image] Generating FLUX image: "${prompt.slice(0, 100)}..."`);

    const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_size: "landscape_16_9",
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true,
      }),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!res.ok) {
      console.warn(`[hero-image] fal.ai API error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const imageUrl = data.images?.[0]?.url;
    if (!imageUrl) return null;

    return {
      url: imageUrl,
      source: "flux",
    };
  } catch (err) {
    console.warn("[hero-image] FLUX generation failed:", err);
    return null;
  }
}

function buildFluxPrompt(
  industry: string,
  segment: string,
  companyName: string,
  brandColors: string
): string {
  // Industry-specific scene descriptions for best results
  const sceneMap: Record<string, string> = {
    manufacturing: "modern industrial warehouse with organized metal shelving units and warm ambient lighting, professional photography",
    construction: "architectural modern building exterior at golden hour, clean lines, professional real estate photography",
    technology: "sleek modern office with screens displaying data analytics, ambient blue lighting, corporate photography",
    saas: "minimalist tech workspace with laptop and coffee, soft natural light, editorial photography style",
    ecommerce: "modern fulfillment center with organized packages, warm professional lighting",
    restaurant: "upscale restaurant interior with warm ambient lighting, professional food photography setting",
    healthcare: "bright modern medical clinic lobby, clean white interior, professional healthcare photography",
    "real estate": "stunning modern home exterior at twilight, architectural photography",
    education: "modern university library with students studying, warm natural light",
    fitness: "high-end gym with modern equipment, dramatic lighting, fitness photography",
    consulting: "modern glass office with city skyline view, professional business environment",
    legal: "elegant law office with wooden bookshelves, warm professional lighting",
    finance: "modern financial district with glass skyscrapers at sunset",
  };

  const scene = sceneMap[industry.toLowerCase()] || sceneMap[segment.toLowerCase()] ||
    "modern professional business environment with clean design and ambient lighting, corporate photography";

  let prompt = `Professional hero banner photograph: ${scene}. `;
  prompt += "Wide angle, landscape orientation, high resolution, no text overlays, no watermarks. ";
  prompt += "Clean composition suitable for website hero section. ";
  if (brandColors) {
    prompt += `Color harmony leaning towards ${brandColors}. `;
  }
  prompt += "Editorial quality, sharp focus, subtle depth of field.";

  return prompt;
}

// ── Tier 3: CSS Gradient Fallback ──

function generateGradientDataUrl(colors: string[]): HeroImageResult {
  // Use brand colors or default professional palette
  const c1 = colors[0] || "#1B2A4A";
  const c2 = colors[1] || "#2563eb";
  const c3 = colors[2] || "#3b82f6";

  // Generate an SVG mesh gradient that looks professional
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
    <defs>
      <radialGradient id="g1" cx="20%" cy="30%" r="60%">
        <stop offset="0%" stop-color="${c1}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${c1}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="g2" cx="80%" cy="70%" r="50%">
        <stop offset="0%" stop-color="${c2}" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="g3" cx="60%" cy="20%" r="40%">
        <stop offset="0%" stop-color="${c3}" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="${c3}" stop-opacity="0"/>
      </radialGradient>
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
        <feBlend in="SourceGraphic" mode="multiply" result="blend"/>
        <feComposite in="blend" in2="SourceGraphic" operator="in"/>
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="${c1}"/>
    <rect width="100%" height="100%" fill="url(#g1)"/>
    <rect width="100%" height="100%" fill="url(#g2)"/>
    <rect width="100%" height="100%" fill="url(#g3)"/>
    <rect width="100%" height="100%" fill="url(#noise)" opacity="0.03"/>
  </svg>`;

  const encoded = Buffer.from(svg).toString("base64");
  return {
    url: `data:image/svg+xml;base64,${encoded}`,
    source: "gradient",
  };
}

// ── Main Export ──

export async function getHeroImage(
  businessProfile?: BusinessProfile | null | undefined,
  assets?: ExtractedAssets | null | undefined
): Promise<HeroImageResult> {
  const companyName = assets?.companyName || "Business";
  const queries = getSearchQueries(businessProfile, assets);

  console.log(`[hero-image] Searching for hero image. Queries: ${queries.slice(0, 3).join(" | ")}`);

  // Tier 1: Try Unsplash with multiple queries
  for (const query of queries.slice(0, 3)) {
    const result = await searchUnsplash(query);
    if (result) {
      console.log(`[hero-image] Unsplash hit for "${query}": ${result.url.slice(0, 80)}...`);
      return result;
    }
  }

  console.log("[hero-image] Unsplash: no results, trying FLUX...");

  // Tier 2: AI generation
  const fluxResult = await generateWithFlux(businessProfile ?? null, assets ?? null, companyName);
  if (fluxResult) {
    console.log(`[hero-image] FLUX generated: ${fluxResult.url.slice(0, 80)}...`);
    return fluxResult;
  }

  console.log("[hero-image] FLUX failed, using gradient fallback");

  // Tier 3: CSS gradient
  return generateGradientDataUrl(assets?.colors || []);
}
