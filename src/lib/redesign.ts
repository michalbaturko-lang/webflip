import Anthropic from "@anthropic-ai/sdk";
import type { DesignVariant, AnalysisRow, ExtractedAssets } from "./supabase";

/**
 * Generate 3 visually DISTINCT redesign variants using Claude.
 * Each variant has a fundamentally different layout, typography, and visual approach.
 */
export async function generateVariants(
  analysis: AnalysisRow,
  crawledContent: string,
  assets?: ExtractedAssets | null
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

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are a Creative Director designing 3 fundamentally different website redesigns for "${companyName}" (${analysis.url}).

Current site scores: Performance ${analysis.score_performance ?? "N/A"}/100, SEO ${analysis.score_seo ?? "N/A"}/100, Security ${analysis.score_security ?? "N/A"}/100, UX ${analysis.score_ux ?? "N/A"}/100, Content ${analysis.score_content ?? "N/A"}/100, Overall ${analysis.score_overall ?? "N/A"}/100
${assetsContext}
Content from site:
${content}

## GENERATE 3 VARIANTS — each must be DRASTICALLY different in look and feel:

### Variant 1: "Corporate Clean"
- LAYOUT: Traditional single-column with centered content sections, generous whitespace
- COLORS: Light background (#f8fafc or #ffffff), professional blue/slate palette derived from the client's brand
- TYPOGRAPHY: heading = "Inter" (clean sans-serif), body = "Inter"
- VIBE: Corporate, trustworthy, Fortune 500 feel. Think law firm, bank, enterprise SaaS.
- Palette bg MUST be light (#f8fafc or #ffffff), text MUST be dark

### Variant 2: "Modern Bold"
- LAYOUT: Asymmetric sections, bento grid elements, full-bleed hero, bold visual breaks
- COLORS: Dark hero (#0a0a0a to #1a1a2e), vibrant accent gradients, high contrast
- TYPOGRAPHY: heading = "Plus Jakarta Sans" (bold, modern), body = "Inter"
- VIBE: Tech startup, SaaS, modern agency. Dark + neon accents. Think Linear, Vercel, Stripe.
- Palette bg MUST be dark (#030712 or #0a0a0a), text MUST be light

### Variant 3: "Elegant Minimal"
- LAYOUT: Narrow container (max 960px), editorial spacing, generous margins, breathing room
- COLORS: Warm neutrals — cream/ivory bg (#faf8f5), soft muted accent, no harsh contrasts
- TYPOGRAPHY: heading = "Playfair Display" (elegant serif), body = "Source Sans 3" (clean sans-serif for readability)
- VIBE: Luxury boutique, editorial magazine, high-end brand. Think Apple, Aesop, Monocle.
- Palette bg MUST be warm light (#faf8f5 or #f5f0eb), text MUST be dark warm

## RULES
- descriptions MUST reference "${companyName}" by name and their actual business/industry
- keyFeatures must be specific to THIS site's problems (based on the scores and content above)
- Each palette must be GENUINELY different — not just hue-shifted versions of the same thing
- layout descriptions must explain the specific layout approach, not just "modern layout"

Return a JSON array with exactly 3 objects, each having:
- name: string
- description: string (2-3 sentences, referencing ${companyName})
- palette: { primary: hex, secondary: hex, accent: hex, bg: hex, text: hex }
- typography: { heading: font-name, body: font-name }
- layout: string (2-3 sentences describing specific layout choices)
- keyFeatures: string[] (4-6 items specific to this site)

Return ONLY the JSON array.`,
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
