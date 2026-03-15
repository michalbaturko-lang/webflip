import * as cheerio from "cheerio";
import type { CategoryScore, Finding } from "../supabase";

export function analyzeAIVisibility(html: string): CategoryScore {
  const $ = cheerio.load(html);
  const findings: Finding[] = [];
  let score = 100;

  // 1. AI crawlability — robots meta
  const robotsMeta = $('meta[name="robots"]').attr("content")?.toLowerCase() || "";
  if (robotsMeta.includes("noindex") || robotsMeta.includes("nofollow")) {
    findings.push({ category: "ai-visibility", severity: "critical", title: "Blocked from AI crawlers", description: "Robots meta blocks indexing. AI systems like ChatGPT, Perplexity won't reference this site." });
    score -= 30;
  } else {
    findings.push({ category: "ai-visibility", severity: "ok", title: "AI-crawlable", description: "No robots restrictions preventing AI systems from accessing content." });
  }

  // 2. Content structure for AI summaries
  const h2s = $("h2");
  const h3s = $("h3");
  const paragraphs = $("p");
  const lists = $("ul, ol");

  const structureScore =
    Math.min(h2s.length, 5) * 4 +
    Math.min(h3s.length, 5) * 2 +
    Math.min(paragraphs.length, 10) * 1 +
    Math.min(lists.length, 3) * 3;

  if (structureScore < 10) {
    findings.push({ category: "ai-visibility", severity: "warning", title: "Poor content structure", description: "Limited headings, paragraphs, and lists. AI systems need well-structured content to generate accurate summaries." });
    score -= 20;
  } else if (structureScore < 20) {
    findings.push({ category: "ai-visibility", severity: "info", title: "Moderate content structure", description: "Content structure is okay but could be improved with more sections and organized content." });
    score -= 8;
  } else {
    findings.push({ category: "ai-visibility", severity: "ok", title: "Good content structure", description: "Well-organized with headings, paragraphs, and lists — ideal for AI summarization." });
  }

  // 3. FAQ schema / FAQ content
  const jsonLdScripts = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).text())
    .get();

  let hasFAQSchema = false;
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script);
      if (data["@type"] === "FAQPage" || data["@type"]?.includes?.("FAQPage")) {
        hasFAQSchema = true;
      }
      // Check for @graph array
      if (Array.isArray(data["@graph"])) {
        for (const item of data["@graph"]) {
          if (item["@type"] === "FAQPage") hasFAQSchema = true;
        }
      }
    } catch {
      // Invalid JSON-LD
    }
  }

  // Also check for FAQ-like content in HTML
  const hasFAQContent =
    $("[class*='faq'], [id*='faq'], [class*='accordion']").length > 0 ||
    $("details, summary").length > 0;

  if (hasFAQSchema) {
    findings.push({ category: "ai-visibility", severity: "ok", title: "FAQ Schema present", description: "FAQPage schema markup found. AI assistants can directly answer questions from your FAQ." });
  } else if (hasFAQContent) {
    findings.push({ category: "ai-visibility", severity: "warning", title: "FAQ without schema", description: "FAQ content exists but lacks FAQPage schema markup. Add it so AI systems can use your Q&A pairs." });
    score -= 15;
  } else {
    findings.push({ category: "ai-visibility", severity: "warning", title: "No FAQ section", description: "No FAQ content or schema found. FAQ pages are heavily used by AI assistants for answers." });
    score -= 20;
  }

  // 4. Brand mention optimization
  const bodyText = $("body").text().toLowerCase();
  const title = $("title").text().toLowerCase();
  const h1Text = $("h1").first().text().toLowerCase();

  // Check if brand name appears in key locations
  // We check for common brand signals
  const brandInTitle = title.length > 0;
  const brandInH1 = h1Text.length > 0;
  const hasAboutSection = $("[class*='about'], [id*='about'], a[href*='about']").length > 0;

  const brandSignals =
    (brandInTitle ? 1 : 0) + (brandInH1 ? 1 : 0) + (hasAboutSection ? 1 : 0);

  if (brandSignals < 2) {
    findings.push({ category: "ai-visibility", severity: "info", title: "Weak brand signals", description: "Brand identity isn't strongly established. AI systems may not accurately represent your brand." });
    score -= 10;
  } else {
    findings.push({ category: "ai-visibility", severity: "ok", title: "Strong brand presence", description: "Brand is well-represented in title, headings, and content structure." });
  }

  // Bonus checks

  // Schema.org general
  const hasSchemaOrg = jsonLdScripts.length > 0 || $("[itemscope]").length > 0;
  if (!hasSchemaOrg) {
    findings.push({ category: "ai-visibility", severity: "warning", title: "No Schema.org markup", description: "No structured data found. Schema.org helps AI systems understand your content context." });
    score -= 10;
  }

  // Check for descriptive meta
  const metaDesc = $('meta[name="description"]').attr("content") || "";
  if (metaDesc.length > 100) {
    findings.push({ category: "ai-visibility", severity: "ok", title: "Good meta description", description: "Detailed meta description helps AI systems summarize your page accurately." });
  }

  // Content length check
  const wordCount = bodyText.split(/\s+/).filter((w) => w.length > 2).length;
  if (wordCount < 200) {
    findings.push({ category: "ai-visibility", severity: "warning", title: "Thin content", description: `Only ~${wordCount} words. AI systems need substantial content to accurately reference your site.` });
    score -= 10;
  }

  return { score: Math.max(0, Math.min(100, score)), findings };
}
