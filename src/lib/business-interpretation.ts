import Anthropic from "@anthropic-ai/sdk";
import type { BusinessProfile, ExtractedAssets } from "./supabase";

/**
 * Business Interpretation Layer — the intelligence core of Webflipper.
 *
 * Analyzes crawled website content to build a deep business profile that
 * drives all downstream content generation (FAQ, blog posts, variant design).
 * This replaces generic AI-fabricated content with business-informed intelligence.
 */
export async function interpretBusiness(
  crawledContent: string,
  url: string,
  assets?: ExtractedAssets | null
): Promise<BusinessProfile> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const anthropic = new Anthropic({ apiKey });

  // Use a generous content window — business interpretation needs breadth
  const content = crawledContent.slice(0, 25000);

  let siteHost: string;
  try {
    siteHost = new URL(url).hostname;
  } catch {
    siteHost = url;
  }
  const companyName = assets?.companyName || siteHost;

  const assetSignals = buildAssetSignals(assets);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are a senior business analyst. Analyze this website's crawled content and extracted assets to build a comprehensive business profile. Your analysis will drive the generation of FAQs, blog posts, and design decisions — so be specific and grounded in what you actually observe.

COMPANY: "${companyName}" (${url})

EXTRACTED SIGNALS:
${assetSignals}

CRAWLED CONTENT:
${content}

INSTRUCTIONS:
1. DETECT the language of the content (cs/en/de/sk) — ALL output text fields MUST be in that language
2. ONLY state what you can infer from the actual content — NEVER fabricate facts
3. Be specific: "SME accounting firm targeting freelancers in Prague" not "a professional services company"
4. For faqSeedTopics: identify 8-10 real questions a potential CUSTOMER of this business would ask — based on the services offered, pricing concerns, process questions, and trust-building topics you observe
5. For blogSeedTopics: identify 6-8 article topics that would demonstrate this business's expertise and attract their target audience — tied to their actual industry and services
6. For contentThemes: identify recurring themes and messaging patterns in the existing content

Return ONLY valid JSON (no markdown fences, no explanation):
{
  "industry": "string — specific industry (e.g., 'dental clinic', 'custom furniture manufacturing', 'SaaS project management')",
  "industrySegment": "string — niche within industry (e.g., 'cosmetic dentistry', 'oak kitchen furniture', 'agile teams')",
  "targetAudience": ["string — specific customer segments, e.g., 'small business owners needing monthly bookkeeping'"],
  "valuePropositions": ["string — what the business promises, grounded in observed claims"],
  "coreServices": [{"name": "string", "description": "string — 1-2 sentences based on actual content"}],
  "painPointsSolved": ["string — problems this business solves for customers, inferred from content"],
  "differentiators": ["string — what sets them apart, based on claims/evidence in content"],
  "brandVoice": "formal|friendly|technical|luxury|casual",
  "businessMaturity": "startup|growing|established|enterprise",
  "geographicFocus": "string — city/region/country or 'global'",
  "keyBusinessClaims": ["string — specific factual claims like '15 years experience', '500+ clients'"],
  "customerJourneyStage": "string — what stage of the buyer journey the site primarily targets (awareness/consideration/decision)",
  "contentThemes": ["string — recurring messaging themes observed in the content"],
  "faqSeedTopics": ["string — specific question topics a real customer would search for"],
  "blogSeedTopics": ["string — specific article topics tied to their expertise"],
  "language": "cs|en|de|sk",
  "summary": "string — 2-3 sentence business synopsis grounded in observed facts"
}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  return parseBusinessProfile(text, companyName, url);
}

/**
 * Build a signal summary from extracted assets to help the LLM infer business context.
 */
function buildAssetSignals(assets?: ExtractedAssets | null): string {
  if (!assets) return "No assets extracted.";

  const signals: string[] = [];

  if (assets.companyName) signals.push(`Company name: ${assets.companyName}`);
  if (assets.phoneNumbers?.length)
    signals.push(`Phone numbers: ${assets.phoneNumbers.join(", ")}`);
  if (assets.emails?.length)
    signals.push(`Emails: ${assets.emails.join(", ")}`);
  if (assets.address) signals.push(`Address: ${assets.address}`);
  if (assets.socialLinks?.length)
    signals.push(
      `Social presence: ${assets.socialLinks.map((l) => {
        try {
          return new URL(l).hostname;
        } catch {
          return l;
        }
      }).join(", ")}`
    );
  if (assets.navLinks?.length)
    signals.push(
      `Navigation: ${assets.navLinks.map((l) => l.text).join(", ")}`
    );
  if (assets.images?.length)
    signals.push(`${assets.images.length} images on site`);
  if (assets.colors?.length)
    signals.push(`Brand colors: ${assets.colors.slice(0, 5).join(", ")}`);

  return signals.join("\n") || "No assets extracted.";
}

/**
 * Parse the LLM response into a typed BusinessProfile with safe fallbacks.
 */
function parseBusinessProfile(
  text: string,
  companyName: string,
  url: string
): BusinessProfile {
  let jsonStr = text.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error(
      "[business-interpretation] Failed to parse response, using fallback profile"
    );
    return buildFallbackProfile(companyName, url);
  }

  return {
    industry: asString(parsed.industry, "general business"),
    industrySegment: asString(parsed.industrySegment, ""),
    targetAudience: asStringArray(parsed.targetAudience),
    valuePropositions: asStringArray(parsed.valuePropositions),
    coreServices: asServiceArray(parsed.coreServices),
    painPointsSolved: asStringArray(parsed.painPointsSolved),
    differentiators: asStringArray(parsed.differentiators),
    brandVoice: asBrandVoice(parsed.brandVoice),
    businessMaturity: asBusinessMaturity(parsed.businessMaturity),
    geographicFocus: asString(parsed.geographicFocus, ""),
    keyBusinessClaims: asStringArray(parsed.keyBusinessClaims),
    customerJourneyStage: asString(parsed.customerJourneyStage, "consideration"),
    contentThemes: asStringArray(parsed.contentThemes),
    faqSeedTopics: asStringArray(parsed.faqSeedTopics),
    blogSeedTopics: asStringArray(parsed.blogSeedTopics),
    language: asString(parsed.language, "cs"),
    summary: asString(parsed.summary, `Business profile for ${companyName}`),
  };
}

function buildFallbackProfile(
  companyName: string,
  url: string
): BusinessProfile {
  return {
    industry: "general business",
    industrySegment: "",
    targetAudience: [],
    valuePropositions: [],
    coreServices: [],
    painPointsSolved: [],
    differentiators: [],
    brandVoice: "formal",
    businessMaturity: "established",
    geographicFocus: "",
    keyBusinessClaims: [],
    customerJourneyStage: "consideration",
    contentThemes: [],
    faqSeedTopics: [],
    blogSeedTopics: [],
    language: "cs",
    summary: `Business profile for ${companyName} (${url})`,
  };
}

// ── Type-safe parsing helpers ──

function asString(val: unknown, fallback: string): string {
  return typeof val === "string" && val.trim() ? val.trim() : fallback;
}

function asStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function asServiceArray(
  val: unknown
): { name: string; description: string }[] {
  if (!Array.isArray(val)) return [];
  return val
    .filter(
      (item): item is { name: unknown; description: unknown } =>
        typeof item === "object" && item !== null && "name" in item
    )
    .map((item) => ({
      name: typeof item.name === "string" ? item.name : "",
      description: typeof item.description === "string" ? item.description : "",
    }))
    .filter((item) => item.name.length > 0);
}

function asBrandVoice(
  val: unknown
): "formal" | "friendly" | "technical" | "luxury" | "casual" {
  const valid = ["formal", "friendly", "technical", "luxury", "casual"];
  return typeof val === "string" && valid.includes(val)
    ? (val as BusinessProfile["brandVoice"])
    : "formal";
}

function asBusinessMaturity(
  val: unknown
): "startup" | "growing" | "established" | "enterprise" {
  const valid = ["startup", "growing", "established", "enterprise"];
  return typeof val === "string" && valid.includes(val)
    ? (val as BusinessProfile["businessMaturity"])
    : "established";
}
