import Anthropic from "@anthropic-ai/sdk";
import type { Finding } from "./supabase";

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
 * Analyze website content quality using Claude Sonnet.
 * Returns findings about readability, messaging, trust, freshness.
 */
export async function analyzeWithClaude(
  markdown: string,
  url: string
): Promise<Finding[]> {
  const anthropic = getClient();

  // Truncate content to avoid huge token usage
  const content = markdown.slice(0, 8000);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are a website content quality analyzer. Analyze this website content and return ONLY a JSON array of findings.

URL: ${url}

Content (Markdown):
${content}

Evaluate these aspects:
1. READABILITY - Is the text clear, concise, and easy to understand? (Check for jargon, sentence length, clarity)
2. BRAND MESSAGING - Is the value proposition clear? Does the visitor understand what this business does within 5 seconds?
3. BLOG/CONTENT MARKETING - Is there evidence of a blog or content strategy?
4. ABOUT PAGE QUALITY - Is there information about who is behind this business?
5. FRESHNESS - Does the content feel current and maintained?

Return a JSON array where each item has:
- category: "content"
- severity: "critical" | "warning" | "ok" | "info"
- title: short title (max 50 chars)
- description: one sentence explanation

Return 3-6 findings. Focus on actionable issues. Be honest but constructive.
Return ONLY the JSON array, no other text.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]) as Finding[];
    return parsed.filter(
      (f) => f.category && f.severity && f.title && f.description
    );
  } catch {
    return [];
  }
}
