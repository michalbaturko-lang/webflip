/**
 * Haiku-based classifier that evaluates pre-scan data and returns
 * a suitability score for website redesign.
 * Cost: ~$0.002 per classification.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { PreScanData } from "./pre-scan";

export interface SuitabilityScores {
  redesign_need: number; // 0-100
  business_viability: number; // 0-100
  complexity_fit: number; // 0-100
  contact_reachability: number; // 0-100
}

export type Classification = "ideal" | "suitable" | "marginal" | "unsuitable";

export interface ClassificationResult {
  domain: string;
  scores: SuitabilityScores;
  score_overall: number;
  classification: Classification;
  reason: string;
  recommended_action: "proceed" | "manual_review" | "skip";
  auto_disqualified: boolean;
  disqualification_reason?: string;
}

const WEIGHTS = {
  redesign_need: 0.3,
  business_viability: 0.25,
  complexity_fit: 0.25,
  contact_reachability: 0.2,
};

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
    client = new Anthropic({ apiKey });
  }
  return client;
}

/**
 * Check for auto-disqualifying conditions BEFORE calling AI.
 * Returns disqualification reason or null if not disqualified.
 */
function checkAutoDisqualifiers(data: PreScanData): string | null {
  if (data.error) {
    return `Site unreachable: ${data.error}`;
  }

  if (data.contentLength < 100) {
    return "Parked or empty domain (less than 100 characters of content)";
  }

  if (data.hasEcommerce && data.estimatedPageCount > 50) {
    return "Large e-commerce site (50+ estimated pages with e-commerce signals)";
  }

  if (data.pageType === "app" && data.hasLogin) {
    return "SaaS application (login/dashboard detected)";
  }

  // Modern platform with good design indicators
  const modernPlatforms = ["Webflow", "Squarespace"];
  if (
    modernPlatforms.includes(data.techStack) &&
    data.hasResponsiveDesign &&
    data.imageCount > 3
  ) {
    return `Already on modern platform (${data.techStack}) with responsive design`;
  }

  return null;
}

function classify(score: number): Classification {
  if (score >= 75) return "ideal";
  if (score >= 60) return "suitable";
  if (score >= 40) return "marginal";
  return "unsuitable";
}

function recommendAction(
  score: number
): ClassificationResult["recommended_action"] {
  if (score >= 60) return "proceed";
  if (score >= 40) return "manual_review";
  return "skip";
}

/**
 * Classify a pre-scanned website for redesign suitability.
 */
export async function classifyWebsite(
  data: PreScanData
): Promise<ClassificationResult> {
  // Check auto-disqualifiers first (free, no API call)
  const disqualifyReason = checkAutoDisqualifiers(data);
  if (disqualifyReason) {
    return {
      domain: data.domain,
      scores: {
        redesign_need: 0,
        business_viability: 0,
        complexity_fit: 0,
        contact_reachability: 0,
      },
      score_overall: 0,
      classification: "unsuitable",
      reason: disqualifyReason,
      recommended_action: "skip",
      auto_disqualified: true,
      disqualification_reason: disqualifyReason,
    };
  }

  const anthropic = getClient();

  const prompt = `You are a website redesign suitability evaluator. Analyze these pre-scan signals and score the website.

WEBSITE PRE-SCAN DATA:
- Domain: ${data.domain}
- Title: ${data.title || "(none)"}
- Meta Description: ${data.metaDescription || "(none)"}
- Tech Stack: ${data.techStack}
- Page Type: ${data.pageType}
- Estimated Pages: ${data.estimatedPageCount}
- Has E-commerce: ${data.hasEcommerce}
- Has Contact Form: ${data.hasContactForm}
- Has Social Links: ${data.hasSocialLinks}
- Has Login: ${data.hasLogin}
- Language: ${data.language}
- SSL Valid: ${data.sslValid}
- HTML Size: ${data.htmlSize} bytes
- Content Length: ${data.contentLength} chars
- Image Count: ${data.imageCount}
- Link Count: ${data.linkCount}
- Responsive Design: ${data.hasResponsiveDesign}

Score each dimension 0-100:

1. redesign_need: How much does this site need a redesign? High score = outdated tech stack (WordPress, Joomla, old custom), missing responsive design, poor SEO signals (no meta description), small HTML, few images. Low score = already modern platform, responsive, good meta tags.

2. business_viability: Is this a real business worth approaching? High score = has contact form, social links, reasonable content length, clear title/description. Low score = parked domain, placeholder content, hobby site, no business signals.

3. complexity_fit: Is this the right complexity for our 1-20 page redesign service? High score = 1-20 estimated pages, simple structure. Low score = huge site (50+ pages), complex e-commerce, SaaS app.

4. contact_reachability: Can we reach the business owner? High score = contact form present, social links, email/phone likely findable. Low score = no contact form, no social links, anonymous site.

Return ONLY a JSON object with this exact structure:
{
  "redesign_need": <number>,
  "business_viability": <number>,
  "complexity_fit": <number>,
  "contact_reachability": <number>,
  "reason": "<one sentence explaining the overall assessment>"
}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  let scores: SuitabilityScores;
  let reason: string;

  try {
    let jsonStr = text.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    const parsed = JSON.parse(jsonStr);
    scores = {
      redesign_need: clamp(parsed.redesign_need ?? 50),
      business_viability: clamp(parsed.business_viability ?? 50),
      complexity_fit: clamp(parsed.complexity_fit ?? 50),
      contact_reachability: clamp(parsed.contact_reachability ?? 50),
    };
    reason = parsed.reason || "Classification completed";
  } catch {
    // Fallback: use heuristic scores
    scores = heuristicScores(data);
    reason = "AI classification failed, using heuristic fallback";
  }

  const score_overall = Math.round(
    scores.redesign_need * WEIGHTS.redesign_need +
      scores.business_viability * WEIGHTS.business_viability +
      scores.complexity_fit * WEIGHTS.complexity_fit +
      scores.contact_reachability * WEIGHTS.contact_reachability
  );

  return {
    domain: data.domain,
    scores,
    score_overall,
    classification: classify(score_overall),
    reason,
    recommended_action: recommendAction(score_overall),
    auto_disqualified: false,
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Heuristic fallback if AI classification fails.
 */
function heuristicScores(data: PreScanData): SuitabilityScores {
  let redesign_need = 50;
  if (!data.hasResponsiveDesign) redesign_need += 20;
  if (["WordPress", "Joomla", "Drupal"].includes(data.techStack))
    redesign_need += 15;
  if (!data.metaDescription) redesign_need += 10;
  if (data.imageCount < 3) redesign_need += 5;

  let business_viability = 40;
  if (data.hasContactForm) business_viability += 20;
  if (data.hasSocialLinks) business_viability += 15;
  if (data.contentLength > 500) business_viability += 15;
  if (data.title) business_viability += 10;

  let complexity_fit = 70;
  if (data.estimatedPageCount > 20) complexity_fit -= 30;
  if (data.estimatedPageCount > 50) complexity_fit -= 30;
  if (data.hasEcommerce) complexity_fit -= 20;

  let contact_reachability = 30;
  if (data.hasContactForm) contact_reachability += 30;
  if (data.hasSocialLinks) contact_reachability += 20;
  if (data.contentLength > 200) contact_reachability += 20;

  return {
    redesign_need: clamp(redesign_need),
    business_viability: clamp(business_viability),
    complexity_fit: clamp(complexity_fit),
    contact_reachability: clamp(contact_reachability),
  };
}
