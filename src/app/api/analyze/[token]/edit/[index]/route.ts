import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAnalysis, updateAnalysis } from "@/lib/supabase";

export const maxDuration = 120;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string; index: string }> }
) {
  try {
    const { token, index } = await params;
    const variantIndex = parseInt(index, 10);

    if (!token || isNaN(variantIndex) || variantIndex < 0) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const body = await request.json();
    const { instruction } = body;

    if (!instruction || typeof instruction !== "string" || instruction.trim().length === 0) {
      return NextResponse.json({ error: "Instruction is required" }, { status: 400 });
    }

    if (instruction.length > 2000) {
      return NextResponse.json({ error: "Instruction too long (max 2000 characters)" }, { status: 400 });
    }

    const analysis = await getAnalysis(token);
    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    const htmlVariants = analysis.html_variants || [];
    if (variantIndex >= htmlVariants.length || !htmlVariants[variantIndex]) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const currentHtml = htmlVariants[variantIndex];

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 32000,
      messages: [
        {
          role: "user",
          content: `You are an expert frontend developer editing a live website HTML page. The user wants to make a specific change to their website.

## CURRENT HTML
\`\`\`html
${currentHtml}
\`\`\`

## USER INSTRUCTION
${instruction.trim()}

## RULES
1. Apply the user's requested change precisely
2. Return the COMPLETE modified HTML document — not a diff or snippet
3. Preserve all existing styles, scripts, fonts, animations, images, and content that the user did NOT ask to change
4. Keep the HTML self-contained (inline CSS, no external dependencies except Google Fonts)
5. Maintain responsive design, accessibility, and semantic HTML
6. If the instruction is unclear, make the most reasonable interpretation
7. Do NOT add comments like "<!-- modified -->" or explanations — just the HTML
8. Return ONLY the complete HTML document starting with <!DOCTYPE html> and ending with </html>`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Extract the HTML from the response (handle markdown code blocks)
    let updatedHtml = text;
    const htmlMatch = text.match(/```html\s*([\s\S]*?)```/);
    if (htmlMatch) {
      updatedHtml = htmlMatch[1].trim();
    } else {
      // Try to extract just the HTML document
      const docMatch = text.match(/(<!DOCTYPE html[\s\S]*<\/html>)/i);
      if (docMatch) {
        updatedHtml = docMatch[1];
      }
    }

    if (!updatedHtml.includes("<!DOCTYPE") && !updatedHtml.includes("<html")) {
      return NextResponse.json(
        { error: "AI failed to generate valid HTML. Please try again." },
        { status: 500 }
      );
    }

    // Save the updated HTML back to the database
    const newHtmlVariants = [...htmlVariants];
    newHtmlVariants[variantIndex] = updatedHtml;
    await updateAnalysis(token, { html_variants: newHtmlVariants });

    return NextResponse.json({ success: true, html: updatedHtml });
  } catch (err) {
    console.error("POST /api/analyze/[token]/edit/[index] error:", err);
    return NextResponse.json(
      { error: "Failed to apply edit. Please try again." },
      { status: 500 }
    );
  }
}
