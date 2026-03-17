import Anthropic from "@anthropic-ai/sdk";
import type { Finding, BusinessProfile } from "./supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SEOSuggestion {
  page_url: string;
  element: "title" | "meta_description" | "h1" | "content_gap";
  current_value: string;
  suggested_value: string;
  reasoning: string;
  impact: "high" | "medium" | "low";
  effort: "easy" | "medium" | "hard";
}

export interface ContentStrategy {
  primary_keywords: string[];
  secondary_keywords: string[];
  content_gaps: string[];
  competitor_angles: string[];
}

export interface SEOSuggestionsResult {
  suggestions: SEOSuggestion[];
  content_strategy: ContentStrategy;
  summary: string;
}

// ---------------------------------------------------------------------------
// Anthropic client (singleton)
// ---------------------------------------------------------------------------

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
    client = new Anthropic({ apiKey });
  }
  return client;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export async function generateSEOSuggestions(
  pages: { url: string; title: string; markdown: string; html: string }[],
  businessProfile: BusinessProfile | null,
  currentFindings: Finding[],
  url: string
): Promise<SEOSuggestionsResult> {
  const anthropic = getClient();

  // Prepare pages data: max 10, homepage first, 500 chars text each
  const preparedPages = pages.slice(0, 10).map((p, i) => ({
    url: p.url,
    title: p.title,
    text: p.markdown.slice(0, 500),
    is_homepage: i === 0,
  }));

  // Extract current SEO findings
  const seoFindings = currentFindings
    .filter((f) => f.category === "seo")
    .map((f) => `[${f.severity}] ${f.title}: ${f.description}`)
    .join("\n");

  const systemPrompt = `You are an expert SEO consultant specializing in Czech and Central European websites. Your task is to analyze a website and provide concrete, actionable SEO content suggestions.

Rules:
- All suggestions MUST be in the same language as the website content
- Title tags: 30-65 characters, primary keyword first, brand name last
- Meta descriptions: 120-160 characters, include a clear CTA
- H1: Must be unique from the title tag, descriptive, include primary keyword naturally
- No keyword stuffing — text must read naturally
- Focus on user intent and search behavior in the local market
- Consider the business type and target audience when suggesting keywords

You MUST respond with valid JSON only, no markdown formatting, no code blocks.`;

  const userPrompt = `Analyze this website and provide SEO content suggestions:

URL: ${url}
${businessProfile ? `
Business Profile:
- Industry: ${businessProfile.industry} / ${businessProfile.industrySegment}
- Target Audience: ${businessProfile.targetAudience.join(", ")}
- Value Propositions: ${businessProfile.valuePropositions.join(", ")}
- Core Services: ${businessProfile.coreServices.map((s) => s.name).join(", ")}
- Brand Voice: ${businessProfile.brandVoice}
- Geographic Focus: ${businessProfile.geographicFocus}
- Language: ${businessProfile.language}
` : ""}
Crawled Pages:
${preparedPages.map((p) => `---
URL: ${p.url}
Title: ${p.title}
Homepage: ${p.is_homepage}
Text preview: ${p.text}
`).join("\n")}

Current SEO Findings:
${seoFindings || "None"}

Respond with this exact JSON structure:
{
  "suggestions": [
    {
      "page_url": "url of the page",
      "element": "title" | "meta_description" | "h1" | "content_gap",
      "current_value": "current value or empty string",
      "suggested_value": "your suggestion",
      "reasoning": "why this change matters (in Czech/website language)",
      "impact": "high" | "medium" | "low",
      "effort": "easy" | "medium" | "hard"
    }
  ],
  "content_strategy": {
    "primary_keywords": ["keyword1", "keyword2"],
    "secondary_keywords": ["keyword1", "keyword2"],
    "content_gaps": ["missing content area 1", "missing content area 2"],
    "competitor_angles": ["angle 1", "angle 2"]
  },
  "summary": "Brief summary of the SEO state and top recommendations (in Czech/website language)"
}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{ role: "user", content: userPrompt }],
    system: systemPrompt,
  });

  // Extract text from response
  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Parse JSON — handle possible markdown code fences
  const jsonStr = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
  const parsed = JSON.parse(jsonStr) as SEOSuggestionsResult;

  // Validate structure
  if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
    throw new Error("Invalid SEO suggestions response: missing suggestions array");
  }
  if (!parsed.content_strategy) {
    parsed.content_strategy = {
      primary_keywords: [],
      secondary_keywords: [],
      content_gaps: [],
      competitor_angles: [],
    };
  }
  if (!parsed.summary) {
    parsed.summary = "";
  }

  return parsed;
}
