import Anthropic from "@anthropic-ai/sdk";
import type { DesignVariant, AnalysisRow, ExtractedAssets } from "./supabase";

/**
 * Generate standalone HTML pages for each design variant.
 * Each HTML page is self-contained with inline CSS, Google Fonts, responsive design, and animations.
 * Uses REAL content from the crawled website — no placeholders.
 */
export async function generateHtmlVariants(
  analysis: Pick<AnalysisRow, "url" | "score_performance" | "score_seo" | "score_security" | "score_ux" | "score_content" | "score_overall">,
  variants: DesignVariant[],
  crawledContent: string,
  assets?: ExtractedAssets | null
): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const anthropic = new Anthropic({ apiKey });

  // Use more content for better results
  const content = crawledContent.slice(0, 12000);

  // Generate HTML for each variant
  const results = await Promise.allSettled(
    variants.map((variant) =>
      generateSingleHtml(anthropic, analysis, variant, content, assets)
    )
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    console.error(`HTML generation failed for variant ${i}:`, result.reason);
    return buildFallbackHtml(variants[i], analysis.url, content, assets);
  });
}

async function generateSingleHtml(
  anthropic: Anthropic,
  analysis: Pick<AnalysisRow, "url" | "score_performance" | "score_seo" | "score_security" | "score_ux" | "score_content" | "score_overall">,
  variant: DesignVariant,
  crawledContent: string,
  assets?: ExtractedAssets | null
): Promise<string> {
  // Build assets section for the prompt
  const assetsSection = assets
    ? `
## REAL Assets from Client's Website (USE THESE — NO PLACEHOLDERS!)
${assets.logo ? `- Logo URL: ${assets.logo} — Use this as the logo in the navbar` : ""}
${assets.favicon ? `- Favicon: ${assets.favicon}` : ""}
${assets.companyName ? `- Company Name: "${assets.companyName}" — Use this as the brand name` : ""}

### REAL Images from the website (use absolute URLs as-is):
${assets.images.slice(0, 15).map((img) => `- ${img.url}${img.alt ? ` (alt: "${img.alt}")` : ""}`).join("\n")}

### Current site colors: ${assets.colors.slice(0, 10).join(", ")}
`
    : "";

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    messages: [
      {
        role: "user",
        content: `You are a Design Director at Apple and a Principal Frontend Engineer.

Generate a COMPLETE standalone HTML page — a redesigned landing page for ${analysis.url}.

## CRITICAL RULES — VIOLATIONS WILL MAKE THE OUTPUT USELESS
1. Use ONLY the REAL text content provided below — NEVER invent placeholder text like "Lorem ipsum", "Your Company", "Acme Corp", or generic marketing copy
2. Use the REAL image URLs from the client's website (absolute URLs provided below) — NEVER use placeholder.com, picsum.photos, unsplash.com, via.placeholder.com, or any placeholder service
3. Use the REAL company name and logo — NEVER make up brand names or use generic names
4. The output must look like a REAL, production-ready website with the CLIENT'S actual content
5. If you don't have enough content for a section, SKIP that section entirely — do NOT fill it with made-up text
6. Every heading, paragraph, button text, and image MUST come from the real crawled content below
${assetsSection}

## Design Variant: "${variant.name}"
${variant.description}

## Design System
- Colors: Primary ${variant.palette.primary}, Secondary ${variant.palette.secondary}, Accent ${variant.palette.accent}, Background ${variant.palette.bg}, Text ${variant.palette.text}
- Typography: Headings "${variant.typography.heading}", Body "${variant.typography.body}"
- Layout approach: ${variant.layout}
- Key features: ${variant.keyFeatures.join(", ")}

## Current Site Scores (what we're fixing)
- Performance: ${analysis.score_performance ?? "N/A"}/100
- SEO: ${analysis.score_seo ?? "N/A"}/100
- UX: ${analysis.score_ux ?? "N/A"}/100
- Content: ${analysis.score_content ?? "N/A"}/100
- Overall: ${analysis.score_overall ?? "N/A"}/100

## REAL Content from Client's Website (extract and use ALL of this):
${crawledContent}

## Requirements — Generate a SINGLE standalone HTML file:

1. **DOCTYPE + HTML structure** with proper meta tags (viewport, charset, description)
2. **Google Fonts** via <link> tags for "${variant.typography.heading}" and "${variant.typography.body}"
3. **ALL CSS inline** in a <style> tag — NO external stylesheets except Google Fonts
4. **Responsive design** with breakpoints at 768px and 1280px
5. **CSS animations**:
   - Fade-in on scroll using IntersectionObserver (vanilla JS)
   - Smooth hover transitions on buttons and cards
   - Gradient animation on hero background
   - Staggered reveal on feature cards
6. **Sections** (in order, using REAL content from the crawled site):
   - Navigation bar (sticky, with glass/blur effect) — use real logo image and company name
   - Hero with REAL headline and subtitle from the site, CTA button
   - Features/Benefits (3-6 cards) — use REAL feature text from the site
   - About/How It Works — use REAL descriptions from the site
   - Pricing or value proposition (if available in content)
   - FAQ (accordion with JS toggle) — use REAL questions if available
   - Final CTA
   - Footer with REAL company info
7. **Dark/Light**: Match the variant's bg color as base
8. **Smooth scroll** for anchor links
9. All JS inline in <script> tags at the bottom
10. Include real images from the site using the absolute URLs provided
11. Professional quality — this must look like a real production website

## Output
Return ONLY the complete HTML file. No markdown, no explanation, no code fences.
Start with <!DOCTYPE html> and end with </html>.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract HTML — Claude might wrap it in code fences despite instructions
  const htmlMatch = text.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
  if (htmlMatch) return htmlMatch[0];

  // If the response starts with HTML-like content
  if (text.trim().startsWith("<!") || text.trim().startsWith("<html")) {
    return text.trim();
  }

  // Try to extract from code fences
  const fenceMatch = text.match(/```(?:html)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Fallback if generation didn't produce valid HTML
  return buildFallbackHtml(variant, analysis.url, "", assets);
}

/**
 * Build a fallback HTML page using real content when possible.
 */
function buildFallbackHtml(
  variant: DesignVariant,
  url: string,
  crawledContent?: string,
  assets?: ExtractedAssets | null
): string {
  const headingFont = variant.typography.heading.replace(/ /g, "+");
  const bodyFont = variant.typography.body.replace(/ /g, "+");
  const companyName = assets?.companyName || new URL(url).hostname;
  const logoHtml = assets?.logo
    ? `<img src="${assets.logo}" alt="${companyName}" style="height: 36px; width: auto;" />`
    : `<span style="font-family: '${variant.typography.heading}', sans-serif; font-weight: 800; font-size: 1.5rem; color: ${variant.palette.primary};">${companyName}</span>`;

  // Extract some real content from markdown
  const lines = (crawledContent || "").split("\n").filter((l) => l.trim().length > 20);
  const headings = lines.filter((l) => l.startsWith("#")).slice(0, 5);
  const paragraphs = lines.filter((l) => !l.startsWith("#") && !l.startsWith("-") && l.length > 40).slice(0, 5);
  const heroTitle = headings[0]?.replace(/^#+\s*/, "") || `${companyName}`;
  const heroSubtitle = paragraphs[0] || variant.description;

  // Use real images if available
  const imageGrid = (assets?.images || [])
    .slice(0, 6)
    .map(
      (img) =>
        `<img src="${img.url}" alt="${img.alt || ""}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 12px;" loading="lazy" />`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${companyName} — ${variant.name} Redesign</title>
  ${assets?.favicon ? `<link rel="icon" href="${assets.favicon}" />` : ""}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${headingFont}:wght@400;600;700;800&family=${bodyFont}:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "${variant.typography.body}", system-ui, sans-serif;
      background: ${variant.palette.bg};
      color: ${variant.palette.text};
      line-height: 1.6;
    }
    h1, h2, h3, h4 {
      font-family: "${variant.typography.heading}", system-ui, sans-serif;
    }
    .nav {
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 2rem;
      backdrop-filter: blur(20px);
      background: ${variant.palette.bg}cc;
      border-bottom: 1px solid ${variant.palette.text}15;
    }
    .hero {
      min-height: 80vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 4rem 2rem;
      background: linear-gradient(135deg, ${variant.palette.primary}22, ${variant.palette.accent}22);
    }
    .hero h1 {
      font-size: clamp(2rem, 6vw, 4.5rem);
      font-weight: 800;
      margin-bottom: 1.5rem;
      line-height: 1.1;
    }
    .hero p {
      font-size: 1.25rem;
      opacity: 0.8;
      max-width: 600px;
      margin-bottom: 2rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 2.5rem;
      background: ${variant.palette.primary};
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      text-decoration: none;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px ${variant.palette.primary}44;
    }
    .section {
      padding: 5rem 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    .section h2 {
      font-size: clamp(1.5rem, 4vw, 3rem);
      font-weight: 700;
      text-align: center;
      margin-bottom: 3rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
    }
    .card {
      padding: 2rem;
      border-radius: 16px;
      border: 1px solid ${variant.palette.text}15;
      background: ${variant.palette.text}08;
      transition: transform 0.3s, box-shadow 0.3s;
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px ${variant.palette.primary}15;
    }
    .card h3 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
      color: ${variant.palette.primary};
    }
    .footer {
      text-align: center;
      padding: 3rem 2rem;
      opacity: 0.6;
      font-size: 0.875rem;
    }
    .fade-in {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    .fade-in.visible {
      opacity: 1;
      transform: translateY(0);
    }
  </style>
</head>
<body>
  <nav class="nav">
    ${logoHtml}
    <a href="${url}" class="btn" style="padding: 0.5rem 1.5rem; font-size: 0.9rem;">Visit Site</a>
  </nav>

  <div class="hero">
    <h1>${heroTitle}</h1>
    <p>${heroSubtitle}</p>
    <a href="${url}" class="btn">Get Started &rarr;</a>
  </div>

  <div class="section fade-in">
    <h2>Key Improvements</h2>
    <div class="grid">
      ${variant.keyFeatures
        .map(
          (feature) => `
      <div class="card">
        <h3>${feature}</h3>
        <p>This redesign addresses this aspect with modern best practices and proven design patterns.</p>
      </div>`
        )
        .join("")}
    </div>
  </div>

  ${
    imageGrid
      ? `
  <div class="section fade-in">
    <h2>Gallery</h2>
    <div class="grid">${imageGrid}</div>
  </div>`
      : ""
  }

  <div class="section fade-in" style="text-align: center;">
    <h2>Ready to Transform Your Website?</h2>
    <p style="max-width: 600px; margin: 0 auto 2rem; opacity: 0.8;">
      This is a preview of the "${variant.name}" redesign direction for ${companyName}.
    </p>
    <a href="${url}" class="btn">Get Started &rarr;</a>
  </div>

  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} ${companyName}. Redesign preview by Webflip.</p>
  </div>

  <script>
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));
  </script>
</body>
</html>`;
}
