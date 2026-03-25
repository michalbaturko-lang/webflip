/**
 * Quality Gate — Post-generation validation for HTML previews.
 *
 * Two-level system:
 *   Level 1: Deterministic validators (zero cost, ~50ms)
 *   Level 2: AI Critic review via Haiku (~500 tokens, ~1s)
 *
 * Returns issues found + auto-fix suggestions.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { BusinessProfile, ExtractedAssets } from "./supabase";

// ── Types ──

export interface QualityIssue {
  severity: "critical" | "warning" | "info";
  category: "language" | "image" | "content" | "template" | "contrast" | "structure";
  message: string;
  autoFixable: boolean;
  fixSuggestion?: string;
}

export interface QualityReport {
  passed: boolean;
  score: number; // 0-100
  issues: QualityIssue[];
  checkedAt: string;
  level: "deterministic" | "ai-critic" | "both";
}

// ── Level 1: Deterministic Validators ──

/**
 * Run all deterministic (zero-cost) quality checks on generated HTML.
 */
export function validateDeterministic(
  html: string,
  url: string,
  businessProfile?: BusinessProfile | null,
  assets?: ExtractedAssets | null
): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // 1. Language consistency check
  issues.push(...checkLanguageConsistency(html, url, businessProfile));

  // 2. Unfilled template variables
  issues.push(...checkTemplateVariables(html));

  // 3. Markdown artifacts in HTML
  issues.push(...checkMarkdownArtifacts(html));

  // 4. Hero image relevance (basic URL check)
  issues.push(...checkHeroImage(html, businessProfile));

  // 5. Logo contrast / visibility
  issues.push(...checkLogoVisibility(html, assets));

  // 6. Placeholder text detection
  issues.push(...checkPlaceholderText(html));

  // 7. Broken image references
  issues.push(...checkBrokenImages(html));

  // 8. Empty sections
  issues.push(...checkEmptySections(html));

  // 9. Mixed language content
  issues.push(...checkMixedLanguage(html, url, businessProfile));

  return issues;
}

// ── Individual Checks ──

function checkLanguageConsistency(
  html: string,
  url: string,
  businessProfile?: BusinessProfile | null
): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const expectedLang = businessProfile?.language || detectExpectedLanguage(url);
  if (!expectedLang || expectedLang === "en") return issues;

  // Check <html lang="...">
  const langMatch = html.match(/<html[^>]*lang="([^"]+)"/i);
  const htmlLang = langMatch?.[1] || "";

  if (htmlLang && htmlLang !== expectedLang) {
    issues.push({
      severity: "critical",
      category: "language",
      message: `HTML lang="${htmlLang}" but expected "${expectedLang}" based on URL/business profile`,
      autoFixable: true,
      fixSuggestion: `Replace lang="${htmlLang}" with lang="${expectedLang}"`,
    });
  }

  // Check for English UI strings that shouldn't be there for non-English sites
  const englishUIPatterns = [
    { pattern: />Our Services</i, text: "Our Services" },
    { pattern: />About Us</i, text: "About Us" },
    { pattern: />Contact Us</i, text: "Contact Us" },
    { pattern: />Learn More</i, text: "Learn More" },
    { pattern: />Read More</i, text: "Read More" },
    { pattern: />Get in Touch</i, text: "Get in Touch" },
    { pattern: />Send Message</i, text: "Send Message" },
    { pattern: />Our Products</i, text: "Our Products" },
    { pattern: />Client Testimonials</i, text: "Client Testimonials" },
    { pattern: />Latest Insights</i, text: "Latest Insights" },
    { pattern: />All rights reserved\.</i, text: "All rights reserved." },
    { pattern: />Skip to main content</i, text: "Skip to main content" },
    { pattern: />Your full name</i, text: "Your full name" },
    { pattern: /placeholder="Your/i, text: "Your..." },
    { pattern: /placeholder="How can we help/i, text: "How can we help" },
  ];

  let englishUICount = 0;
  for (const { pattern, text } of englishUIPatterns) {
    if (pattern.test(html)) {
      englishUICount++;
    }
  }

  if (englishUICount >= 3) {
    issues.push({
      severity: "critical",
      category: "language",
      message: `Found ${englishUICount} English UI strings on a "${expectedLang}" site. Translation system may have failed.`,
      autoFixable: false,
      fixSuggestion: "Re-run template filling with correct language parameter",
    });
  }

  return issues;
}

function checkTemplateVariables(html: string): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const unfilledVars = html.match(/TEMPLATE_VAR_\w+/g);

  if (unfilledVars) {
    const unique = Array.from(new Set(unfilledVars));
    issues.push({
      severity: "critical",
      category: "template",
      message: `${unique.length} unfilled template variables: ${unique.slice(0, 5).join(", ")}${unique.length > 5 ? "..." : ""}`,
      autoFixable: true,
      fixSuggestion: "Remove or replace with empty strings",
    });
  }

  return issues;
}

function checkMarkdownArtifacts(html: string): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // Extract text content (strip HTML tags)
  const textContent = html.replace(/<[^>]+>/g, " ");

  // Check for raw markdown syntax in visible text
  const markdownPatterns = [
    { pattern: /\*\*[^*]+\*\*/g, name: "bold markdown (**text**)" },
    { pattern: /^#{1,6}\s/gm, name: "heading markers (#)" },
    { pattern: /!\[[^\]]*\]\([^)]+\)/g, name: "image markdown (![alt](url))" },
    { pattern: /\[[^\]]+\]\([^)]+\)/g, name: "link markdown ([text](url))" },
    { pattern: /^[-*+]\s/gm, name: "list markers (-/*/+)" },
    { pattern: /^>\s/gm, name: "blockquote markers (>)" },
    { pattern: /```/g, name: "code blocks (```)" },
  ];

  for (const { pattern, name } of markdownPatterns) {
    const matches = textContent.match(pattern);
    if (matches && matches.length > 2) {
      issues.push({
        severity: "warning",
        category: "content",
        message: `Raw ${name} found in HTML text (${matches.length} instances). Content may not have been properly converted from markdown.`,
        autoFixable: true,
        fixSuggestion: "Run stripMarkdownSyntax() on text content before insertion",
      });
    }
  }

  return issues;
}

function checkHeroImage(
  html: string,
  businessProfile?: BusinessProfile | null
): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // Extract hero image URL from the HTML
  const heroImgMatch = html.match(/class="[^"]*hero[^"]*"[^>]*style="[^"]*url\(['"]?([^'")\s]+)['"]?\)/i)
    || html.match(/class="[^"]*hero[^"]*"[^>]*>\s*<img[^>]*src="([^"]+)"/i)
    || html.match(/hero[^"]*"[^>]*background(?:-image)?:\s*url\(['"]?([^'")\s]+)['"]?\)/i);

  const heroUrl = heroImgMatch?.[1] || "";

  if (!heroUrl) {
    // No hero image at all — might be using gradient, which is fine
    return issues;
  }

  // Check for obviously wrong generic stock photo keywords in the Unsplash URL
  const suspiciousTerms = [
    "football", "soccer", "basketball", "baseball", "nfl", "sport",
    "cat", "dog", "pet", "animal",
    "baby", "wedding", "party",
  ];

  const urlLower = heroUrl.toLowerCase();
  for (const term of suspiciousTerms) {
    if (urlLower.includes(term)) {
      issues.push({
        severity: "critical",
        category: "image",
        message: `Hero image URL contains suspicious term "${term}" — likely irrelevant for ${businessProfile?.industry || "this"} industry`,
        autoFixable: true,
        fixSuggestion: `Re-fetch hero image with better industry-specific query for "${businessProfile?.industry || "business"}"`,
      });
      break;
    }
  }

  // Check if hero image is a data URI (gradient fallback) — this is fine but note it
  if (heroUrl.startsWith("data:")) {
    issues.push({
      severity: "info",
      category: "image",
      message: "Hero image is using gradient fallback (no stock photo available)",
      autoFixable: false,
    });
  }

  return issues;
}

function checkLogoVisibility(
  html: string,
  assets?: ExtractedAssets | null
): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // Check if logo exists
  const logoMatch = html.match(/<img[^>]*class="[^"]*logo[^"]*"[^>]*src="([^"]+)"/i)
    || html.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*logo[^"]*"/i);

  if (!logoMatch && assets?.logo) {
    issues.push({
      severity: "warning",
      category: "contrast",
      message: "Logo URL available but not found in HTML",
      autoFixable: false,
    });
  }

  // Check if there's a drop-shadow CSS for logo visibility (we added this before)
  if (logoMatch && !html.includes("drop-shadow")) {
    issues.push({
      severity: "warning",
      category: "contrast",
      message: "Logo found but no drop-shadow CSS — may be invisible on light backgrounds",
      autoFixable: true,
      fixSuggestion: "Add filter: drop-shadow(0 0 6px rgba(0,0,0,0.5)) to logo img",
    });
  }

  return issues;
}

function checkPlaceholderText(html: string): QualityIssue[] {
  const issues: QualityIssue[] = [];

  const placeholders = [
    "Lorem ipsum", "dolor sit amet", "consectetur adipiscing",
    "Example Domain", "Acme Corp", "Acme Inc",
    "Your Company", "Company Name",
    "placeholder.com", "example.com", "test@test.com",
    "John Doe", "Jane Doe",
    "123 Main Street", "555-555-5555",
  ];

  const textContent = html.replace(/<[^>]+>/g, " ");
  const found: string[] = [];

  for (const ph of placeholders) {
    if (textContent.toLowerCase().includes(ph.toLowerCase())) {
      found.push(ph);
    }
  }

  if (found.length > 0) {
    issues.push({
      severity: "warning",
      category: "content",
      message: `Placeholder text detected: ${found.slice(0, 3).join(", ")}${found.length > 3 ? ` (+${found.length - 3} more)` : ""}`,
      autoFixable: false,
      fixSuggestion: "Replace with actual content from crawled site",
    });
  }

  return issues;
}

function checkBrokenImages(html: string): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // Find all img src values
  const imgSrcRegex = /<img[^>]*src="([^"]*)"[^>]*>/gi;
  let match;
  let emptyCount = 0;

  while ((match = imgSrcRegex.exec(html)) !== null) {
    const src = match[1];
    if (!src || src === "" || src === "#" || src === "undefined" || src === "null") {
      emptyCount++;
    }
  }

  if (emptyCount > 0) {
    issues.push({
      severity: "warning",
      category: "image",
      message: `${emptyCount} image(s) with empty/broken src attribute`,
      autoFixable: true,
      fixSuggestion: "Remove images with empty src or replace with placeholder",
    });
  }

  return issues;
}

function checkEmptySections(html: string): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // Check for sections that only contain whitespace/empty elements
  const sectionRegex = /<section[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/section>/gi;
  let match;

  while ((match = sectionRegex.exec(html)) !== null) {
    const sectionId = match[1];
    const content = match[2];
    // Strip all tags and check remaining text
    const textOnly = content.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

    if (textOnly.length < 10 && !["map", "hero"].includes(sectionId)) {
      issues.push({
        severity: "warning",
        category: "structure",
        message: `Section "#${sectionId}" appears nearly empty (${textOnly.length} chars of text)`,
        autoFixable: false,
        fixSuggestion: "Consider removing this section or populating with content",
      });
    }
  }

  return issues;
}

function checkMixedLanguage(
  html: string,
  url: string,
  businessProfile?: BusinessProfile | null
): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const expectedLang = businessProfile?.language || detectExpectedLanguage(url);
  if (!expectedLang || expectedLang === "en") return issues;

  // Extract visible text from key UI areas (nav, headings, buttons)
  const buttonTexts = Array.from(html.matchAll(/<(?:button|a)[^>]*>([^<]+)<\/(?:button|a)>/gi))
    .map(m => m[1].trim())
    .filter(t => t.length > 2 && t.length < 50);

  const headingTexts = Array.from(html.matchAll(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi))
    .map(m => m[1].trim())
    .filter(t => t.length > 2);

  const allUIText = [...buttonTexts, ...headingTexts];

  // Simple heuristic: count English-looking words vs expected language
  const englishCommonWords = new Set([
    "the", "and", "for", "our", "your", "with", "from", "about", "more",
    "contact", "services", "products", "home", "learn", "read", "get",
    "send", "message", "submit", "click", "here", "view", "all",
    "latest", "news", "blog", "portfolio", "testimonials", "clients",
  ]);

  let englishWordCount = 0;
  let totalWords = 0;

  for (const text of allUIText) {
    const words = text.toLowerCase().split(/\s+/);
    for (const word of words) {
      totalWords++;
      if (englishCommonWords.has(word)) {
        englishWordCount++;
      }
    }
  }

  // If more than 40% of UI words are common English words on a non-English site
  if (totalWords > 5 && englishWordCount / totalWords > 0.4) {
    issues.push({
      severity: "critical",
      category: "language",
      message: `${Math.round(englishWordCount / totalWords * 100)}% of UI text appears to be English on a "${expectedLang}" site (${englishWordCount}/${totalWords} words)`,
      autoFixable: false,
      fixSuggestion: "Translation layer did not apply correctly",
    });
  }

  return issues;
}

// ── Helper: detect expected language from URL ──

function detectExpectedLanguage(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    if (hostname.endsWith(".cz")) return "cs";
    if (hostname.endsWith(".sk")) return "sk";
    if (hostname.endsWith(".de") || hostname.endsWith(".at") || hostname.endsWith(".ch")) return "de";
    if (hostname.endsWith(".pl")) return "pl";
    if (hostname.endsWith(".hu")) return "hu";
    if (hostname.endsWith(".fr")) return "fr";
    if (hostname.endsWith(".es")) return "es";
    if (hostname.endsWith(".it")) return "it";
    if (hostname.endsWith(".nl")) return "nl";
    if (hostname.endsWith(".pt") || hostname.endsWith(".br")) return "pt";
    return "";
  } catch {
    return "";
  }
}

// ── Level 2: AI Critic Review ──

/**
 * Run AI-powered quality review using Haiku. Checks semantic quality
 * that deterministic validators can't catch.
 */
export async function runAICriticReview(
  html: string,
  url: string,
  businessProfile?: BusinessProfile | null,
  assets?: ExtractedAssets | null
): Promise<QualityIssue[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[quality-gate] No ANTHROPIC_API_KEY, skipping AI critic");
    return [];
  }

  try {
    const client = new Anthropic({ apiKey });

    // Extract key elements for review (don't send entire HTML to save tokens)
    const extractedInfo = extractKeyElements(html);
    const industry = businessProfile?.industry || "unknown";
    const segment = businessProfile?.industrySegment || "";
    const expectedLang = businessProfile?.language || detectExpectedLanguage(url);

    const prompt = `You are a QA reviewer for auto-generated website redesign previews. Review these extracted elements from a preview generated for ${url} (industry: ${industry}${segment ? `, segment: ${segment}` : ""}, expected language: ${expectedLang || "en"}).

EXTRACTED ELEMENTS:
${extractedInfo}

Check for these issues:
1. LANGUAGE: Are all UI elements in "${expectedLang || "en"}"? Any untranslated strings?
2. RELEVANCE: Does the headline/subheadline make sense for a ${industry} business?
3. HERO IMAGE: Is the image URL relevant to ${industry}? (Look for irrelevant stock photo keywords in the URL)
4. CONTENT: Do services/FAQs/testimonials look real or clearly fabricated?
5. CONSISTENCY: Does the company name match throughout?

Return ONLY a JSON array of issues found. Each issue: {"severity":"critical"|"warning"|"info","category":"language"|"image"|"content","message":"description"}
If no issues found, return [].
Return ONLY the JSON array, no explanation.`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";

    // Parse the JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      severity: string;
      category: string;
      message: string;
    }>;

    return parsed.map(issue => ({
      severity: (issue.severity === "critical" || issue.severity === "warning" || issue.severity === "info")
        ? issue.severity : "warning",
      category: (issue.category === "language" || issue.category === "image" || issue.category === "content")
        ? issue.category as QualityIssue["category"] : "content",
      message: `[AI Critic] ${issue.message}`,
      autoFixable: false,
    }));
  } catch (err) {
    console.error("[quality-gate] AI critic failed:", err);
    return [];
  }
}

function extractKeyElements(html: string): string {
  const lines: string[] = [];

  // HTML lang
  const langMatch = html.match(/<html[^>]*lang="([^"]+)"/i);
  lines.push(`HTML lang: ${langMatch?.[1] || "not set"}`);

  // Title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  lines.push(`Title: ${titleMatch?.[1] || "not set"}`);

  // Headings
  const h1s = Array.from(html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)).map(m => m[1].replace(/<[^>]+>/g, "").trim());
  const h2s = Array.from(html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)).map(m => m[1].replace(/<[^>]+>/g, "").trim());
  if (h1s.length) lines.push(`H1: ${h1s.slice(0, 3).join(" | ")}`);
  if (h2s.length) lines.push(`H2: ${h2s.slice(0, 6).join(" | ")}`);

  // Nav items
  const navItems = Array.from(html.matchAll(/<nav[\s\S]*?<\/nav>/gi))
    .flatMap(n => Array.from(n[0].matchAll(/<a[^>]*>([^<]+)<\/a>/gi)))
    .map(m => m[1].trim());
  if (navItems.length) lines.push(`Nav: ${navItems.join(", ")}`);

  // Button/CTA texts
  const buttons = Array.from(html.matchAll(/<(?:button|a[^>]*class="[^"]*(?:btn|cta|button)[^"]*")[^>]*>([^<]+)<\/(?:button|a)>/gi))
    .map(m => m[1].trim());
  if (buttons.length) lines.push(`CTAs: ${buttons.slice(0, 6).join(", ")}`);

  // Hero image URL
  const heroImg = html.match(/hero[^"]*"[^>]*(?:background(?:-image)?:\s*url\(['"]?([^'")\s]+)|>\s*<img[^>]*src="([^"]+))/i);
  if (heroImg) lines.push(`Hero image: ${(heroImg[1] || heroImg[2] || "").slice(0, 120)}`);

  // Company name from logo alt or first h1
  const logoAlt = html.match(/<img[^>]*class="[^"]*logo[^"]*"[^>]*alt="([^"]+)"/i);
  if (logoAlt) lines.push(`Logo alt: ${logoAlt[1]}`);

  // Footer text
  const footerMatch = html.match(/<footer[\s\S]*?<\/footer>/i);
  if (footerMatch) {
    const footerText = footerMatch[0].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
    lines.push(`Footer: ${footerText}`);
  }

  // Form labels
  const labels = Array.from(html.matchAll(/<label[^>]*>([^<]+)<\/label>/gi))
    .map(m => m[1].trim())
    .filter(t => t.length > 1);
  if (labels.length) lines.push(`Form labels: ${labels.join(", ")}`);

  // Placeholder attributes
  const placeholders = Array.from(html.matchAll(/placeholder="([^"]+)"/gi))
    .map(m => m[1]);
  if (placeholders.length) lines.push(`Placeholders: ${placeholders.join(", ")}`);

  return lines.join("\n");
}

// ── Main Quality Gate ──

/**
 * Run the full quality gate on a generated HTML variant.
 * Returns a report with pass/fail status and issues found.
 *
 * @param level "deterministic" for free checks only, "both" for deterministic + AI critic
 */
export async function runQualityGate(
  html: string,
  url: string,
  businessProfile?: BusinessProfile | null,
  assets?: ExtractedAssets | null,
  level: "deterministic" | "both" = "both"
): Promise<QualityReport> {
  const issues: QualityIssue[] = [];

  // Level 1: Always run deterministic checks
  const deterministicIssues = validateDeterministic(html, url, businessProfile, assets);
  issues.push(...deterministicIssues);

  // Level 2: AI Critic (if requested and no critical deterministic failures)
  if (level === "both") {
    const criticalCount = deterministicIssues.filter(i => i.severity === "critical").length;
    // Only run AI critic if there aren't already many critical issues (save tokens)
    if (criticalCount < 3) {
      try {
        const aiIssues = await runAICriticReview(html, url, businessProfile, assets);
        issues.push(...aiIssues);
      } catch (err) {
        console.error("[quality-gate] AI critic error:", err);
      }
    } else {
      console.log(`[quality-gate] Skipping AI critic — ${criticalCount} critical issues already found`);
    }
  }

  // Calculate score
  const criticalPenalty = issues.filter(i => i.severity === "critical").length * 25;
  const warningPenalty = issues.filter(i => i.severity === "warning").length * 10;
  const infoPenalty = issues.filter(i => i.severity === "info").length * 2;
  const score = Math.max(0, 100 - criticalPenalty - warningPenalty - infoPenalty);

  const passed = score >= 50 && issues.filter(i => i.severity === "critical").length === 0;

  return {
    passed,
    score,
    issues,
    checkedAt: new Date().toISOString(),
    level: level === "both" ? "both" : "deterministic",
  };
}
