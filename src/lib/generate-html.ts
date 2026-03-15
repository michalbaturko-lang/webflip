import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import type { DesignVariant, AnalysisRow, ExtractedAssets } from "./supabase";

// ── Template Data Interface ──

interface TemplateData {
  companyName: string;
  headline: string;
  subheadline: string;
  metaDescription: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  language: string;
  navLinks: { text: string; href: string }[];
  services: { title: string; description: string; icon: string }[];
  aboutText: string;
  stats: { number: string; label: string }[];
  testimonials: { quote: string; author: string; role: string }[];
  faqItems: { question: string; answer: string }[];
  blogPosts: { title: string; excerpt: string; date: string }[];
  gallery: { url: string; alt: string }[];
  socialLinks: string[];
  phone: string;
  email: string;
  address: string;
}

// ── Variant → Template File Mapping ──

function getTemplateFile(variantName: string): string {
  const name = variantName.toLowerCase();
  if (name.includes("corporate") || name.includes("clean") || name.includes("brand") || name.includes("faithful")) {
    return "corporate-clean.html";
  }
  if (name.includes("modern") || name.includes("bold") || name.includes("edge") || name.includes("dark")) {
    return "modern-bold.html";
  }
  if (name.includes("elegant") || name.includes("minimal") || name.includes("luxury")) {
    return "elegant-minimal.html";
  }
  // Default fallback
  return "corporate-clean.html";
}

// ── Main Export ──

export async function generateHtmlVariants(
  analysis: Pick<AnalysisRow, "url" | "score_performance" | "score_seo" | "score_security" | "score_ux" | "score_content" | "score_overall">,
  variants: DesignVariant[],
  crawledContent: string,
  assets?: ExtractedAssets | null
): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const anthropic = new Anthropic({ apiKey });
  const content = crawledContent.slice(0, 20000);

  // Extract structured content once using Haiku (shared across all variants)
  let templateData: TemplateData;
  try {
    templateData = await extractStructuredContent(anthropic, analysis.url, content, assets);
  } catch (err) {
    console.error("[generate-html] Content extraction failed:", err);
    templateData = buildFallbackTemplateData(analysis.url, content, assets);
  }

  // Fill each variant's template
  const results = variants.map((variant) => {
    try {
      const templateFile = getTemplateFile(variant.name);
      const templatePath = path.join(process.cwd(), "src/templates", templateFile);
      const template = fs.readFileSync(templatePath, "utf-8");

      // Override primaryColor with variant's palette
      const variantData: TemplateData = {
        ...templateData,
        primaryColor: variant.palette.primary,
      };

      let html = fillTemplate(template, variantData);
      html = postProcessHtml(html, variant);
      return validateHtml(html, variantData.companyName);
    } catch (err) {
      console.error(`[generate-html] Template fill failed for ${variant.name}:`, err);
      return buildFallbackHtml(variant, analysis.url, content, assets);
    }
  });

  return results;
}

// ── Content Extraction via Haiku ──

async function extractStructuredContent(
  anthropic: Anthropic,
  url: string,
  crawledContent: string,
  assets?: ExtractedAssets | null
): Promise<TemplateData> {
  let siteHost: string;
  try { siteHost = new URL(url).hostname; } catch { siteHost = url; }
  const companyName = assets?.companyName || siteHost;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `You are a content extraction specialist. Analyze this crawled website content and extract structured data for a website redesign.

COMPANY: "${companyName}" (${url})

CRAWLED CONTENT:
${crawledContent}

AVAILABLE ASSETS:
- Logo: ${assets?.logo || "none"}
- Favicon: ${assets?.favicon || "none"}
- Images: ${(assets?.images || []).slice(0, 15).map(img => img.url).join(", ") || "none"}
- Phone: ${assets?.phoneNumbers?.join(", ") || "none"}
- Email: ${assets?.emails?.join(", ") || "none"}
- Address: ${assets?.address || "none"}
- Social Links: ${assets?.socialLinks?.join(", ") || "none"}
- Nav Links: ${(assets?.navLinks || []).map(l => `${l.text}: ${l.href}`).join(", ") || "none"}

INSTRUCTIONS:
1. Extract ALL real content from the crawled data — NEVER invent placeholder text
2. Detect the website language (cs/en/de/sk) — ALL output text MUST be in that same language
3. Generate 3 Blog/Aktuality posts relevant to the detected industry, written in the detected language
4. Generate 5-8 FAQ items relevant to the company's services, in the detected language
5. Extract real stats/numbers if present (years, clients, projects, satisfaction)
6. Extract real testimonials if present
7. Use real service/product names and descriptions from the crawled content
8. For service icons, use one of: briefcase, chart, shield, globe, users, code, heart, star, lightbulb, target

Return ONLY valid JSON (no markdown fences, no explanation) with this exact structure:
{
  "companyName": "string",
  "headline": "string - main heading from site or company tagline",
  "subheadline": "string - subtitle or company description",
  "metaDescription": "string - SEO meta description",
  "language": "cs|en|de|sk",
  "navLinks": [{"text": "string", "href": "#section-id"}],
  "services": [{"title": "string", "description": "string", "icon": "string"}],
  "aboutText": "string - about company paragraph",
  "stats": [{"number": "string like 15+ or 98%", "label": "string"}],
  "testimonials": [{"quote": "string", "author": "string", "role": "string"}],
  "faqItems": [{"question": "string", "answer": "string"}],
  "blogPosts": [{"title": "string", "excerpt": "string", "date": "string like 2024-01-15"}],
  "gallery": [{"url": "string absolute URL", "alt": "string"}],
  "socialLinks": ["url strings"],
  "phone": "string",
  "email": "string",
  "address": "string"
}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  // Parse JSON response — handle potential code fences
  let jsonStr = text.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error("[generate-html] Failed to parse Haiku response as JSON, using fallback");
    return buildFallbackTemplateData(url, "", assets);
  }

  // Build TemplateData from parsed response, with fallbacks
  return {
    companyName: (parsed.companyName as string) || companyName,
    headline: (parsed.headline as string) || companyName,
    subheadline: (parsed.subheadline as string) || "",
    metaDescription: (parsed.metaDescription as string) || assets?.metaDescription || "",
    logoUrl: assets?.logo || "",
    faviconUrl: assets?.favicon || "",
    primaryColor: "#1B2A4A",
    language: (parsed.language as string) || "cs",
    navLinks: Array.isArray(parsed.navLinks) ? parsed.navLinks as TemplateData["navLinks"] : assets?.navLinks || [],
    services: Array.isArray(parsed.services) ? parsed.services as TemplateData["services"] : [],
    aboutText: (parsed.aboutText as string) || "",
    stats: Array.isArray(parsed.stats) ? parsed.stats as TemplateData["stats"] : [],
    testimonials: Array.isArray(parsed.testimonials) ? parsed.testimonials as TemplateData["testimonials"] : [],
    faqItems: Array.isArray(parsed.faqItems) ? parsed.faqItems as TemplateData["faqItems"] : [],
    blogPosts: Array.isArray(parsed.blogPosts) ? parsed.blogPosts as TemplateData["blogPosts"] : [],
    gallery: Array.isArray(parsed.gallery)
      ? parsed.gallery as TemplateData["gallery"]
      : (assets?.images || []).slice(0, 8).map(img => ({ url: img.url, alt: img.alt || companyName })),
    socialLinks: Array.isArray(parsed.socialLinks) ? parsed.socialLinks as string[] : assets?.socialLinks || [],
    phone: (parsed.phone as string) || assets?.phoneNumbers?.[0] || "",
    email: (parsed.email as string) || assets?.emails?.[0] || "",
    address: (parsed.address as string) || assets?.address || "",
  };
}

// ── Template Filling ──

function fillTemplate(template: string, data: TemplateData): string {
  let html = template;

  // 1. Set html lang attribute
  html = html.replace(/lang="TEMPLATE_VAR_language"/g, `lang="${escapeAttr(data.language)}"`);

  // 2. Handle conditional sections — <!-- IF:name -->...<!-- /IF:name -->
  const conditionalFields: Record<string, string> = {
    address: data.address,
  };
  for (const [field, value] of Object.entries(conditionalFields)) {
    const ifRegex = new RegExp(`<!-- IF:${field} -->([\\s\\S]*?)<!-- /IF:${field} -->`, "g");
    if (value && value.trim()) {
      // Keep the content, remove markers
      html = html.replace(ifRegex, "$1");
    } else {
      // Remove the entire conditional block
      html = html.replace(ifRegex, "");
    }
  }

  // 3. Handle repeating sections — <!-- REPEAT:name -->...<!-- /REPEAT:name -->
  const repeatSections: Record<string, Record<string, string>[]> = {
    stats: data.stats.map(s => ({
      TEMPLATE_VAR_statNumber: escapeHtml(s.number),
      TEMPLATE_VAR_statLabel: escapeHtml(s.label),
    })),
    services: data.services.map(s => ({
      TEMPLATE_VAR_serviceTitle: escapeHtml(s.title),
      TEMPLATE_VAR_serviceDescription: escapeHtml(s.description),
      TEMPLATE_VAR_serviceIcon: getServiceIconSvg(s.icon),
    })),
    testimonials: data.testimonials.map(t => ({
      TEMPLATE_VAR_testimonialQuote: escapeHtml(t.quote),
      TEMPLATE_VAR_testimonialAuthor: escapeHtml(t.author),
      TEMPLATE_VAR_testimonialRole: escapeHtml(t.role),
    })),
    faqItems: data.faqItems.map(f => ({
      TEMPLATE_VAR_faqQuestion: escapeHtml(f.question),
      TEMPLATE_VAR_faqAnswer: escapeHtml(f.answer),
    })),
    blogPosts: data.blogPosts.map(b => ({
      TEMPLATE_VAR_blogTitle: escapeHtml(b.title),
      TEMPLATE_VAR_blogExcerpt: escapeHtml(b.excerpt),
      TEMPLATE_VAR_blogDate: escapeHtml(b.date),
    })),
    gallery: data.gallery.map(g => ({
      TEMPLATE_VAR_galleryUrl: g.url,
      TEMPLATE_VAR_galleryAlt: escapeHtml(g.alt),
    })),
    socialLinks: data.socialLinks.map(url => ({
      TEMPLATE_VAR_socialUrl: url,
    })),
    navLinks: data.navLinks.map(l => ({
      TEMPLATE_VAR_navText: escapeHtml(l.text),
      TEMPLATE_VAR_navHref: escapeAttr(l.href),
    })),
  };

  for (const [sectionName, items] of Object.entries(repeatSections)) {
    const repeatRegex = new RegExp(
      `<!-- REPEAT:${sectionName} -->([\\s\\S]*?)<!-- /REPEAT:${sectionName} -->`,
      "g"
    );

    html = html.replace(repeatRegex, (_match, itemTemplate: string) => {
      if (items.length === 0) return "";
      return items.map((item) => {
        let itemHtml = itemTemplate;
        for (const [key, value] of Object.entries(item)) {
          itemHtml = itemHtml.replace(new RegExp(key, "g"), value);
        }
        return itemHtml;
      }).join("\n");
    });
  }

  // 4. Replace scalar template variables
  const scalarReplacements: Record<string, string> = {
    TEMPLATE_VAR_companyName: escapeHtml(data.companyName),
    TEMPLATE_VAR_headline: escapeHtml(data.headline),
    TEMPLATE_VAR_subheadline: escapeHtml(data.subheadline),
    TEMPLATE_VAR_metaDescription: escapeAttr(data.metaDescription),
    TEMPLATE_VAR_logoUrl: data.logoUrl,
    TEMPLATE_VAR_faviconUrl: data.faviconUrl,
    TEMPLATE_VAR_primaryColor: data.primaryColor,
    TEMPLATE_VAR_language: data.language,
    TEMPLATE_VAR_phone: escapeHtml(data.phone),
    TEMPLATE_VAR_email: escapeHtml(data.email),
    TEMPLATE_VAR_address: escapeHtml(data.address),
    TEMPLATE_VAR_aboutText: escapeHtml(data.aboutText),
    TEMPLATE_VAR_year: String(new Date().getFullYear()),
  };

  for (const [key, value] of Object.entries(scalarReplacements)) {
    html = html.replace(new RegExp(key, "g"), value);
  }

  // 5. Handle logo display — show image or text fallback
  if (data.logoUrl) {
    // Remove text logo fallback markers if image logo exists
    html = html.replace(/<!-- LOGO_TEXT_ONLY -->([\s\S]*?)<!-- \/LOGO_TEXT_ONLY -->/g, "");
    html = html.replace(/<!-- LOGO_IMAGE -->/g, "");
    html = html.replace(/<!-- \/LOGO_IMAGE -->/g, "");
  } else {
    // Remove image logo markers if no image
    html = html.replace(/<!-- LOGO_IMAGE -->([\s\S]*?)<!-- \/LOGO_IMAGE -->/g, "");
    html = html.replace(/<!-- LOGO_TEXT_ONLY -->/g, "");
    html = html.replace(/<!-- \/LOGO_TEXT_ONLY -->/g, "");
  }

  return html;
}

// ── Post-Processing ──

function postProcessHtml(html: string, variant: DesignVariant): string {
  let result = html;

  // Ensure prefers-reduced-motion media query exists
  if (!result.includes("prefers-reduced-motion")) {
    const reducedMotionCSS = `
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }`;
    result = result.replace("</style>", `${reducedMotionCSS}\n  </style>`);
  }

  // Ensure viewport meta tag exists
  if (!result.includes("viewport")) {
    result = result.replace(
      "</head>",
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>'
    );
  }

  // Add theme-color meta if missing
  if (!result.includes("theme-color")) {
    result = result.replace(
      "</head>",
      `  <meta name="theme-color" content="${variant.palette.primary}">\n</head>`
    );
  }

  return result;
}

// ── Validation ──

function validateHtml(html: string, companyName: string): string {
  let result = html;

  // Check for unfilled template variables
  const unfilledVars = result.match(/TEMPLATE_VAR_\w+/g);
  if (unfilledVars) {
    console.warn("[validate] Unfilled template variables found:", [...new Set(unfilledVars)]);
    // Remove unfilled variables rather than leaving them visible
    for (const v of new Set(unfilledVars)) {
      result = result.replace(new RegExp(v, "g"), "");
    }
  }

  // Check for placeholder text
  const placeholders = ["Lorem ipsum", "Example Domain", "Acme Corp", "Your Company", "placeholder.com", "example.com"];
  for (const ph of placeholders) {
    if (result.toLowerCase().includes(ph.toLowerCase())) {
      console.warn(`[validate] Placeholder text found: "${ph}"`);
    }
  }

  // Ensure company name is present
  if (companyName && !result.includes(companyName)) {
    console.warn("[validate] Company name not found in output HTML");
  }

  // Ensure all img src URLs are absolute
  result = result.replace(/src="(\/[^"]+)"/g, (match, path) => {
    // Relative paths starting with / are acceptable in templates
    return match;
  });

  return result;
}

// ── Fallback Template Data (no API call) ──

function buildFallbackTemplateData(
  url: string,
  crawledContent: string,
  assets?: ExtractedAssets | null
): TemplateData {
  let siteHost: string;
  try { siteHost = new URL(url).hostname; } catch { siteHost = url; }
  const companyName = assets?.companyName || siteHost;

  const lines = (crawledContent || "").split("\n").filter(l => l.trim().length > 10);
  const headings = lines.filter(l => l.startsWith("#")).map(l => l.replace(/^#+\s*/, "").trim());
  const paragraphs = lines.filter(l => !l.startsWith("#") && !l.startsWith("-") && !l.startsWith("!") && l.trim().length > 40);

  return {
    companyName,
    headline: headings[0] || companyName,
    subheadline: paragraphs[0] || "",
    metaDescription: assets?.metaDescription || paragraphs[0]?.slice(0, 160) || "",
    logoUrl: assets?.logo || "",
    faviconUrl: assets?.favicon || "",
    primaryColor: "#1B2A4A",
    language: "cs",
    navLinks: assets?.navLinks || [],
    services: headings.slice(1, 7).map((title, i) => ({
      title,
      description: paragraphs[i + 1] || "",
      icon: ["briefcase", "chart", "shield", "globe", "users", "code"][i % 6],
    })),
    aboutText: paragraphs.slice(1, 4).join(" "),
    stats: extractStats(crawledContent || "").map(s => ({ number: String(s.number), label: s.label })),
    testimonials: extractTestimonials(crawledContent || "").map(t => ({
      quote: t.text,
      author: t.author,
      role: t.role || "",
    })),
    faqItems: extractFaqItems(crawledContent || ""),
    blogPosts: [],
    gallery: (assets?.images || []).slice(0, 8).map(img => ({ url: img.url, alt: img.alt || companyName })),
    socialLinks: assets?.socialLinks || [],
    phone: assets?.phoneNumbers?.[0] || "",
    email: assets?.emails?.[0] || "",
    address: assets?.address || "",
  };
}

// ── Fallback HTML Builder (template-based) ──

function buildFallbackHtml(
  variant: DesignVariant,
  url: string,
  crawledContent?: string,
  assets?: ExtractedAssets | null
): string {
  const templateData = buildFallbackTemplateData(url, crawledContent || "", assets);
  templateData.primaryColor = variant.palette.primary;

  try {
    const templateFile = getTemplateFile(variant.name);
    const templatePath = path.join(process.cwd(), "src/templates", templateFile);
    const template = fs.readFileSync(templatePath, "utf-8");
    let html = fillTemplate(template, templateData);
    html = postProcessHtml(html, variant);
    return validateHtml(html, templateData.companyName);
  } catch (err) {
    console.error("[generate-html] Fallback template read failed:", err);
    return buildMinimalFallbackHtml(templateData, variant);
  }
}

// ── Minimal Inline Fallback (if templates can't be read) ──

function buildMinimalFallbackHtml(data: TemplateData, variant: DesignVariant): string {
  const p = variant.palette;
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="${escapeAttr(data.language)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeAttr(data.metaDescription)}">
  <meta name="theme-color" content="${p.primary}">
  <title>${escapeHtml(data.companyName)}</title>
  ${data.faviconUrl ? `<link rel="icon" href="${data.faviconUrl}" />` : ""}
  <style>
    :root { --primary: ${p.primary}; --bg: ${p.bg}; --text: ${p.text}; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .hero { min-height: 70vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 80px 24px; }
    .hero h1 { font-size: clamp(2rem, 5vw, 4rem); margin-bottom: 16px; }
    .hero p { font-size: 1.1rem; opacity: 0.8; max-width: 600px; margin: 0 auto 32px; }
    .btn { display: inline-block; padding: 14px 32px; background: var(--primary); color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; }
    .section { padding: 80px 24px; }
    .footer { padding: 40px 24px; text-align: center; opacity: 0.6; font-size: 0.85rem; }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div>
        <h1>${escapeHtml(data.headline)}</h1>
        ${data.subheadline ? `<p>${escapeHtml(data.subheadline)}</p>` : ""}
        <a href="#contact" class="btn">Kontakt</a>
      </div>
    </section>
  </main>
  <footer class="footer">&copy; ${year} ${escapeHtml(data.companyName)}</footer>
</body>
</html>`;
}

// ── Service Icon SVG Generator ──

function getServiceIconSvg(iconName: string): string {
  const color = "currentColor";
  const icons: Record<string, string> = {
    briefcase: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>`,
    chart: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>`,
    shield: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    globe: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`,
    users: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
    code: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    heart: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
    star: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    lightbulb: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/></svg>`,
    target: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  };
  return icons[iconName] || icons.briefcase;
}

// ── Helper Functions ──

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Extract stats/numbers from crawled content for the stats bar.
 */
function extractStats(content: string): { number: number; label: string }[] {
  const stats: { number: number; label: string }[] = [];
  const seen = new Set<number>();

  const patterns = [
    /(\d{1,6})\+?\s*(let|years?|roků|roku)\s*(zkušeností|experience|praxe|na trhu)?/gi,
    /(\d{1,6})\+?\s*(klientů|clients?|zákazníků|customers?|spokojených)/gi,
    /(\d{1,6})\+?\s*(projektů|projects?|realizací|zakázek|completed)/gi,
    /(\d{1,3})\s*%\s*(spokojenost|satisfaction|úspěšnost|success)/gi,
    /(\d{1,6})\+?\s*(zaměstnanců|employees?|členů|members?|team)/gi,
  ];

  const labels = [
    ["Let zkušeností", "Roků praxe"],
    ["Spokojených klientů", "Klientů"],
    ["Dokončených projektů", "Projektů"],
    ["Spokojenost", "Úspěšnost"],
    ["Členů týmu", "Zaměstnanců"],
  ];

  for (let i = 0; i < patterns.length && stats.length < 4; i++) {
    const match = patterns[i].exec(content);
    if (match) {
      const num = parseInt(match[1]);
      if (num > 0 && num < 1000000 && !seen.has(num)) {
        seen.add(num);
        stats.push({ number: num, label: labels[i][0] });
      }
    }
  }

  return stats;
}

/**
 * Extract testimonials from crawled content.
 */
function extractTestimonials(content: string): { text: string; author: string; role?: string }[] {
  const testimonials: { text: string; author: string; role?: string }[] = [];
  const quotePatterns = [
    /"([^"]{30,300})"\s*[-—–]\s*([A-ZÁ-Ž][a-zá-ž]+ [A-ZÁ-Ž][a-zá-ž]+)(?:\s*,\s*(.+?))?(?:\n|$)/g,
    /„([^"]{30,300})"\s*[-—–]\s*([A-ZÁ-Ž][a-zá-ž]+ [A-ZÁ-Ž][a-zá-ž]+)(?:\s*,\s*(.+?))?(?:\n|$)/g,
  ];

  for (const pattern of quotePatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null && testimonials.length < 3) {
      testimonials.push({
        text: match[1].trim(),
        author: match[2].trim(),
        role: match[3]?.trim(),
      });
    }
  }

  return testimonials;
}

/**
 * Extract FAQ items from crawled content.
 */
function extractFaqItems(content: string): { question: string; answer: string }[] {
  const items: { question: string; answer: string }[] = [];
  const lines = content.split("\n").map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length - 1 && items.length < 6; i++) {
    const line = lines[i];
    if (line.endsWith("?") && line.length > 15 && line.length < 200) {
      const answer = lines[i + 1];
      if (answer && !answer.endsWith("?") && answer.length > 20) {
        items.push({
          question: line.replace(/^#+\s*/, "").replace(/^\*\*/, "").replace(/\*\*$/, ""),
          answer: answer.slice(0, 300),
        });
        i++;
      }
    }
  }

  return items;
}
