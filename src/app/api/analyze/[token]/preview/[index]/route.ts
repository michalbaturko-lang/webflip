import { NextResponse } from "next/server";
import { getAnalysis } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; index: string }> }
) {
  try {
    const { token, index } = await params;
    const variantIndex = parseInt(index, 10);

    if (!token || isNaN(variantIndex) || variantIndex < 0) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const analysis = await getAnalysis(token);
    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    const htmlVariants = analysis.html_variants || [];
    if (variantIndex >= htmlVariants.length || !htmlVariants[variantIndex]) {
      const errorHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Preview Unavailable</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0}
.c{text-align:center;max-width:400px;padding:2rem}.icon{font-size:3rem;margin-bottom:1rem}h1{font-size:1.25rem;margin:0 0 .5rem}p{color:#94a3b8;font-size:.875rem;margin:0}</style>
</head><body><div class="c"><div class="icon">⚠️</div><h1>Preview Unavailable</h1><p>This variant could not be generated. Please try running the analysis again.</p></div></body></html>`;
      return new Response(errorHtml, {
        status: 404,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-store",
        },
      });
    }

    return new Response(htmlVariants[variantIndex], {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "Content-Security-Policy": "frame-ancestors 'self'",
      },
    });
  } catch (err) {
    console.error("GET /api/analyze/[token]/preview/[index] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
