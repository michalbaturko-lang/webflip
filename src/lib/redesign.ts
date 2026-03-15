import Anthropic from "@anthropic-ai/sdk";
import type { DesignVariant, AnalysisRow, ExtractedAssets } from "./supabase";

/**
 * Generate 3 redesign variants using Claude.
 * Each variant has a different design philosophy.
 */
export async function generateVariants(
  analysis: AnalysisRow,
  crawledContent: string,
  assets?: ExtractedAssets | null
): Promise<DesignVariant[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const anthropic = new Anthropic({ apiKey });

  // Truncate content
  const content = crawledContent.slice(0, 10000);

  // Build assets context for better variant generation
  const assetsContext = assets
    ? `
## Extracted Assets from Current Site
- Company Name: ${assets.companyName || "Unknown"}
- Logo URL: ${assets.logo || "Not found"}
- Favicon: ${assets.favicon || "Not found"}
- Current colors used on site: ${assets.colors.slice(0, 10).join(", ") || "None extracted"}
- Images found: ${assets.images.length} (${assets.images.slice(0, 5).map((img) => img.alt ? `"${img.alt}"` : img.url.split("/").pop()).join(", ")}${assets.images.length > 5 ? "..." : ""})

IMPORTANT: For the "Brand-Faithful" variant, use the colors extracted from the current site as the base palette.`
    : "";

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are an expert web designer. Based on the analysis of ${analysis.url}, generate 3 redesign variants.

Current site analysis:
- Performance: ${analysis.score_performance ?? "N/A"}/100
- SEO: ${analysis.score_seo ?? "N/A"}/100
- Security: ${analysis.score_security ?? "N/A"}/100
- UX: ${analysis.score_ux ?? "N/A"}/100
- Content: ${analysis.score_content ?? "N/A"}/100
- Overall: ${analysis.score_overall ?? "N/A"}/100
${assetsContext}

Current site content (first pages):
${content}

Generate exactly 3 variants as a JSON array:

1. **Brand-Faithful** - Keeps the existing brand colors and feel, but modernizes layout, typography, and fixes all UX issues found.
2. **Modern Edge** - Bold dark-mode design with vibrant gradients, glassmorphism effects, modern SaaS aesthetic. Premium feel.
3. **Conversion Max** - Optimized purely for lead generation. Clear hierarchy, prominent CTAs, trust signals, social proof, urgency elements.

Each variant must have:
- name: string (the variant name)
- description: string (2-3 sentences explaining the design approach and why)
- palette: { primary: hex, secondary: hex, accent: hex, bg: hex, text: hex }
- typography: { heading: font name, body: font name }
- layout: string (describe the layout approach in 2-3 sentences)
- keyFeatures: string[] (4-6 specific design features/improvements)

Return ONLY the JSON array, no other text.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return getDefaultVariants();
    return JSON.parse(jsonMatch[0]) as DesignVariant[];
  } catch {
    return getDefaultVariants();
  }
}

function getDefaultVariants(): DesignVariant[] {
  return [
    {
      name: "Brand-Faithful",
      description:
        "Modernized version of your current design. Keeps your brand identity while fixing usability issues and updating the layout.",
      palette: { primary: "#2563eb", secondary: "#1e40af", accent: "#3b82f6", bg: "#ffffff", text: "#1e293b" },
      typography: { heading: "Inter", body: "Inter" },
      layout: "Clean single-column layout with improved spacing, larger touch targets, and better visual hierarchy.",
      keyFeatures: [
        "Preserved brand colors",
        "Improved mobile responsiveness",
        "Better CTA placement",
        "Modernized typography",
      ],
    },
    {
      name: "Modern Edge",
      description:
        "Bold dark-mode design with premium SaaS aesthetic. Gradient accents, glassmorphism cards, and smooth animations create a cutting-edge feel.",
      palette: { primary: "#8b5cf6", secondary: "#6366f1", accent: "#a78bfa", bg: "#030712", text: "#f9fafb" },
      typography: { heading: "Plus Jakarta Sans", body: "Inter" },
      layout: "Bento grid layout with glassmorphism cards, animated gradients, and full-width hero sections.",
      keyFeatures: [
        "Dark mode with gradient accents",
        "Glassmorphism UI elements",
        "Micro-interactions & animations",
        "Premium SaaS aesthetic",
      ],
    },
    {
      name: "Conversion Max",
      description:
        "Designed purely for lead generation. Every element guides visitors toward conversion with clear CTAs, social proof, and trust signals.",
      palette: { primary: "#16a34a", secondary: "#15803d", accent: "#f59e0b", bg: "#ffffff", text: "#111827" },
      typography: { heading: "DM Sans", body: "Inter" },
      layout: "Conversion-focused single page with sticky CTA bar, testimonial carousel, and comparison tables.",
      keyFeatures: [
        "Sticky CTA in header",
        "Testimonial carousel",
        "Trust badges section",
        "Urgency/scarcity elements",
        "FAQ with schema markup",
        "Exit-intent popup ready",
      ],
    },
  ];
}
