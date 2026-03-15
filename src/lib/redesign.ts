import Anthropic from "@anthropic-ai/sdk";
import type { DesignVariant, AnalysisRow, ExtractedAssets, BusinessProfile } from "./supabase";

/**
 * Generate 3 visually DISTINCT redesign variants using Claude.
 * Each variant has a fundamentally different layout, typography, and visual approach.
 */
export async function generateVariants(
  analysis: AnalysisRow,
  crawledContent: string,
  assets?: ExtractedAssets | null,
  businessProfile?: BusinessProfile | null
): Promise<DesignVariant[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const anthropic = new Anthropic({ apiKey });

  const content = crawledContent.slice(0, 10000);

  let companyName = assets?.companyName || "Unknown";
  if (companyName === "Unknown") {
    try { companyName = new URL(analysis.url).hostname; } catch { /* keep Unknown */ }
  }

  const assetsContext = assets
    ? `
## Client Brand Assets
- Company: "${companyName}"
- Logo: ${assets.logo || "text-based"}
- Current brand colors: ${assets.colors.slice(0, 10).join(", ") || "not extracted"}
- ${assets.images.length} images found on site
`
    : "";

  // Identify weak areas to guide variant keyFeatures
  const weakAreas: string[] = [];
  if ((analysis.score_performance ?? 50) < 60) weakAreas.push("performance (slow loading)");
  if ((analysis.score_seo ?? 50) < 60) weakAreas.push("SEO (poor discoverability)");
  if ((analysis.score_ux ?? 50) < 60) weakAreas.push("UX (poor mobile experience, accessibility)");
  if ((analysis.score_content ?? 50) < 60) weakAreas.push("content quality");
  if ((analysis.score_security ?? 50) < 60) weakAreas.push("security headers");
  const weakAreasStr = weakAreas.length > 0
    ? `\nWEAK AREAS to address in keyFeatures: ${weakAreas.join(", ")}`
    : "";

  // Build business intelligence context
  const businessContext = businessProfile
    ? `
## Business Intelligence Profile
- Industry: ${businessProfile.industry}${businessProfile.industrySegment ? ` → ${businessProfile.industrySegment}` : ""}
- Summary: ${businessProfile.summary}
- Target Audience: ${businessProfile.targetAudience.slice(0, 3).join("; ") || "general"}
- Brand Voice: ${businessProfile.brandVoice} | Maturity: ${businessProfile.businessMaturity}
- Value Props: ${businessProfile.valuePropositions.slice(0, 3).join("; ") || "not identified"}
- Differentiators: ${businessProfile.differentiators.slice(0, 3).join("; ") || "not identified"}
- Geographic Focus: ${businessProfile.geographicFocus || "not specified"}
- Customer Journey: targets ${businessProfile.customerJourneyStage} stage

USE THIS PROFILE to make descriptions and keyFeatures specific to the business's actual industry, audience, and positioning. The design should reflect the brand voice (${businessProfile.brandVoice}) and maturity level (${businessProfile.businessMaturity}).
`
    : "";

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 5000,
    messages: [
      {
        role: "user",
        content: `You are a Creative Director at a top design agency (Pentagram/IDEO caliber). Design 3 fundamentally different website redesigns for "${companyName}" (${analysis.url}).

Current site scores: Performance ${analysis.score_performance ?? "N/A"}/100, SEO ${analysis.score_seo ?? "N/A"}/100, Security ${analysis.score_security ?? "N/A"}/100, UX ${analysis.score_ux ?? "N/A"}/100, Content ${analysis.score_content ?? "N/A"}/100, Overall ${analysis.score_overall ?? "N/A"}/100
${weakAreasStr}
${assetsContext}${businessContext}
Content from site:
${content}

## GENERATE 3 VARIANTS — each must be DRASTICALLY different in look and feel:

### Variant 1: "Corporate Clean"
- LAYOUT: Traditional single-column with centered content sections, generous whitespace, clear content hierarchy
- COLORS: Light background (#f8fafc or #ffffff), professional blue/slate palette. If client has brand colors, derive professional variants from them.
- TYPOGRAPHY: heading = "Inter" (clean sans-serif, weight 700), body = "Inter" (weight 400)
- VIBE: Corporate, trustworthy, Fortune 500 feel. Think law firm, bank, enterprise SaaS.
- Palette bg MUST be light (#f8fafc or #ffffff), text MUST be dark (#0f172a or similar)
- Shadow system: subtle rgba(0,0,0,0.04) to rgba(0,0,0,0.08) — no flashy effects
- Cards: white bg, thin borders, professional hover states

### Variant 2: "Modern Bold"
- LAYOUT: Asymmetric sections, bento grid elements, full-bleed hero, bold visual breaks between sections
- COLORS: Dark hero (#0a0a0a to #1a1a2e), vibrant accent gradients (primary→accent), high contrast
- TYPOGRAPHY: heading = "Plus Jakarta Sans" (bold 800-900, modern), body = "Inter" (light 300-400)
- VIBE: Tech startup, SaaS, modern agency. Dark + neon/vibrant accents. Think Linear, Vercel, Stripe.
- Palette bg MUST be dark (#030712 or #0a0a0a), text MUST be light (#f1f5f9)
- Glassmorphism cards: semi-transparent bg, border rgba(255,255,255,0.08), backdrop-blur
- Glow effects on key elements, gradient text on hero heading

### Variant 3: "Elegant Minimal"
- LAYOUT: Narrow container (max 960px), editorial spacing, generous margins (120px+ between sections)
- COLORS: Warm neutrals — cream/ivory bg (#faf8f5 or #f5f0eb), soft muted accent (warm browns, soft gold), NO harsh contrasts
- TYPOGRAPHY: heading = "Playfair Display" (elegant serif, weight 600-700), body = "Source Sans 3" (clean sans for readability)
- VIBE: Luxury boutique, editorial magazine, high-end brand. Think Apple, Aesop, Monocle.
- Palette bg MUST be warm (#faf8f5 or #f5f0eb), text MUST be warm dark (#1c1917)
- No shadows on cards — use thin borders and whitespace for hierarchy
- Subtle decorative elements: thin horizontal rules, generous letter-spacing on labels

## RULES
- DETECT the language of the crawled content (Czech, English, German, Slovak, etc.) — ALL descriptions, layout text, and keyFeatures MUST be written in that SAME language
- descriptions MUST reference "${companyName}" by name and their actual business/industry
- keyFeatures MUST be specific to THIS site's problems (based on scores above) — mention concrete improvements
- Each palette must be GENUINELY different — Corporate is cool/blue, Bold is dark/vibrant, Elegant is warm/muted
- layout descriptions must be specific: mention grid columns, container widths, section arrangements
- primary colors should relate to the client's industry and brand when possible

Return a JSON array with exactly 3 objects, each having:
- name: string (include the style name: "Corporate Clean", "Modern Bold", "Elegant Minimal")
- description: string (2-3 sentences, referencing ${companyName} and their industry)
- palette: { primary: hex, secondary: hex, accent: hex, bg: hex, text: hex }
- typography: { heading: font-name, body: font-name }
- layout: string (2-3 sentences describing specific layout choices with concrete details)
- keyFeatures: string[] (5-6 items, at least 2 must address the site's weak areas)

Return ONLY the JSON array. No markdown, no explanation.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return getDefaultVariants(companyName);
    const parsed = JSON.parse(jsonMatch[0]) as DesignVariant[];
    if (!Array.isArray(parsed) || parsed.length < 3) return getDefaultVariants(companyName);
    return parsed;
  } catch {
    return getDefaultVariants(companyName);
  }
}

function getDefaultVariants(companyName: string): DesignVariant[] {
  return [
    {
      name: "Corporate Clean",
      description:
        `Profesionální, čistý redesign pro ${companyName}. Zachovává důvěryhodnost značky a přidává moderní layout s dostatkem bílého prostoru a přehlednou strukturou.`,
      palette: { primary: "#2563eb", secondary: "#475569", accent: "#3b82f6", bg: "#f8fafc", text: "#0f172a" },
      typography: { heading: "Inter", body: "Inter" },
      layout: "Tradiční single-column layout s centrovanými sekcemi. Širší whitespace, přehledná navigace, karty služeb v 3-sloupcovém gridu. Hero s jemným gradientem.",
      keyFeatures: [
        "Čistý, profesionální design s důrazem na čitelnost",
        "Vylepšená mobilní responzivita",
        "Přehledná navigace s smooth scroll",
        "Kontaktní sekce s formulářem a mapou",
        "Optimalizovaná struktura pro SEO",
      ],
    },
    {
      name: "Modern Bold",
      description:
        `Odvážný, moderní redesign pro ${companyName} s dark-mode hero sekcí, výraznými gradientovými akcenty a tech-startup estetikou. Vizuálně impaktní a zapamatovatelný.`,
      palette: { primary: "#8b5cf6", secondary: "#6366f1", accent: "#22d3ee", bg: "#030712", text: "#f1f5f9" },
      typography: { heading: "Plus Jakarta Sans", body: "Inter" },
      layout: "Asymetrické sekce s full-bleed hero. Bento grid pro služby, glassmorphism karty s backdrop-blur efektem. Gradient borders a animated hover states.",
      keyFeatures: [
        "Dark mode s vibrantními gradient akcenty",
        "Glassmorphism UI elementy",
        "Velká typografie s výrazným kontrastem vah",
        "Geometrické dekorativní prvky v CSS",
        "Animované hover efekty a micro-interactions",
        "Moderní tech aesthetic (Linear/Vercel style)",
      ],
    },
    {
      name: "Elegant Minimal",
      description:
        `Elegantní, minimalistický redesign pro ${companyName} inspirovaný luxusními značkami. Serifová typografie, teplé neutrální tóny a editoriální spacing vytvářejí sofistikovaný dojem.`,
      palette: { primary: "#92400e", secondary: "#78716c", accent: "#d97706", bg: "#faf8f5", text: "#1c1917" },
      typography: { heading: "Playfair Display", body: "Source Sans 3" },
      layout: "Úzký container (max 960px) s editoriálním spacingem. Velké margin mezi sekcemi, dvousloupcový about layout s plynulým textem. Galerie s tenkými bordery a subtilními hover efekty.",
      keyFeatures: [
        "Elegantní serifová typografie pro nadpisy",
        "Teplá krémová paleta s jemnými akcenty",
        "Editoriální spacing — luxusní pocit z prostoru",
        "Subtilní animace (fade-in, jemné hover)",
        "Narrow container pro lepší čitelnost",
        "Vysoká estetická kvalita inspirovaná Apple/Aesop",
      ],
    },
  ];
}
