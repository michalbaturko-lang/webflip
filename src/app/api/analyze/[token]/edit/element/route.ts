import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAnalysis, updateAnalysis } from "@/lib/supabase";
import type { EditHistoryEntry } from "@/lib/supabase";

export const maxDuration = 60;

// ── Rate limiting (shared with main edit route pattern) ─────────────
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 15; // slightly higher for element edits (they're cheaper)

function checkRateLimit(token: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(token) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  rateLimitMap.set(token, recent);
  return true;
}

// ── System prompt for element-level editing ─────────────────────────
const ELEMENT_SYSTEM_PROMPT = `You are a website HTML element editor. You modify ONLY the specific HTML element provided, based on user instructions.

STRICT RULES:
- Return ONLY the modified HTML element (not a full document)
- Do NOT add <!DOCTYPE>, <html>, <head>, or <body> tags
- Do NOT include explanations or markdown
- Preserve the element's tag type unless explicitly asked to change it
- Preserve existing classes and IDs unless explicitly asked to change them
- NEVER add external script sources or tracking pixels
- NEVER add inline event handlers that fetch external URLs
- If the request is unrelated to HTML editing, return the original element unchanged`;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    if (!checkRateLimit(token)) {
      return NextResponse.json(
        { error: "Too many edit requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { instruction, elementPath, elementHtml, variantIndex, context } = body;

    if (!instruction || typeof instruction !== "string" || !instruction.trim()) {
      return NextResponse.json({ error: "Instruction is required" }, { status: 400 });
    }

    if (!elementHtml || !elementPath) {
      return NextResponse.json({ error: "Element HTML and path are required" }, { status: 400 });
    }

    if (instruction.length > 500) {
      return NextResponse.json({ error: "Instruction too long (max 500 chars)" }, { status: 400 });
    }

    const analysis = await getAnalysis(token);
    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey });

    const contextInfo = context
      ? `\nElement tag: <${context.tag}>, parent: <${context.parentTag || "unknown"}>`
      : "";

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      system: ELEMENT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `## ELEMENT TO MODIFY${contextInfo}
\`\`\`html
${elementHtml.substring(0, 2000)}
\`\`\`

## INSTRUCTION
${instruction.trim()}

Return ONLY the modified HTML element. No explanations, no markdown code blocks.`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Extract HTML from potential markdown wrapping
    let resultHtml = text.trim();
    const codeMatch = resultHtml.match(/```(?:html)?\s*([\s\S]*?)```/);
    if (codeMatch) {
      resultHtml = codeMatch[1].trim();
    }

    if (!resultHtml || resultHtml.length < 3) {
      return NextResponse.json(
        { error: "AI returned empty result. Please try again." },
        { status: 500 }
      );
    }

    // Security validation — reject dangerous content in element HTML
    const dangerousPatterns = [
      /<script[\s>]/i,
      /javascript:/i,
      /on(?:load|error|click|mouseover|focus|blur|submit|change|input)\s*=/i,
      /data:\s*text\/html/i,
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(resultHtml)) {
        return NextResponse.json(
          { error: "AI returned potentially unsafe content. Please try again." },
          { status: 500 }
        );
      }
    }

    // Save edit history
    const idx = typeof variantIndex === "number" ? variantIndex : 0;
    const existingHistory = analysis.edit_history || [];
    const newEntry: EditHistoryEntry = {
      variant_index: idx,
      instruction: `[Element: ${elementPath}] ${instruction.trim()}`,
      timestamp: new Date().toISOString(),
      previous_html: analysis.html_variants?.[idx] || "",
    };
    const updatedHistory = [...existingHistory, newEntry].slice(-50);

    await updateAnalysis(token, { edit_history: updatedHistory });

    return NextResponse.json({ success: true, html: resultHtml });
  } catch (err) {
    console.error("POST /api/analyze/[token]/edit/element error:", err);
    return NextResponse.json(
      { error: "Failed to apply AI edit. Please try again." },
      { status: 500 }
    );
  }
}
