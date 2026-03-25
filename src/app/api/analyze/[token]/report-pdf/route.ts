import { NextResponse } from "next/server";
import { getAnalysis } from "@/lib/supabase";

/**
 * GET /api/analyze/[token]/report-pdf
 *
 * Generates an HTML analysis report that can be saved/printed as PDF.
 * Only available for analyses with report_unlocked = true.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const analysis = await getAnalysis(token);
    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    if (!(analysis as any).report_unlocked) {
      return NextResponse.json(
        { error: "Report not unlocked. Purchase required." },
        { status: 403 }
      );
    }

    const enrichment = (analysis as any).enrichment_results;
    const domain = new URL(analysis.url).hostname.replace(/^www\./, "");
    const scores = {
      performance: analysis.score_performance ?? 0,
      seo: analysis.score_seo ?? 0,
      security: analysis.score_security ?? 0,
      ux: analysis.score_ux ?? 0,
      content: analysis.score_content ?? 0,
      aiVisibility: analysis.score_ai_visibility ?? 0,
      accessibility: analysis.score_accessibility ?? 0,
      overall: analysis.score_overall ?? 0,
    };

    const findings = analysis.findings || [];

    // Build enriched findings map
    const enrichedMap = new Map<string, any>();
    if (enrichment?.enrichedFindings) {
      for (const ef of enrichment.enrichedFindings) {
        enrichedMap.set(ef.findingId || ef.finding?.title, ef);
      }
    }

    const getScoreColor = (s: number) =>
      s >= 80 ? "#22c55e" : s >= 60 ? "#eab308" : s >= 40 ? "#f97316" : "#ef4444";

    const getGrade = (s: number) =>
      s >= 90 ? "A+" : s >= 80 ? "A" : s >= 70 ? "B" : s >= 60 ? "C" : s >= 40 ? "D" : "F";

    const severityColors: Record<string, string> = {
      critical: "#ef4444",
      warning: "#f97316",
      info: "#3b82f6",
      good: "#22c55e",
    };

    const impactLabels: Record<string, string> = {
      high: "High impact",
      medium: "Medium impact",
      low: "Low impact",
    };

    const effortLabels: Record<number, string> = {
      1: "Easy",
      2: "Simple",
      3: "Medium",
      4: "Hard",
      5: "Complex",
    };

    const categoryLabels: Record<string, string> = {
      "quick-win": "Quick Win",
      strategic: "Strategic",
      "low-priority": "Low Priority",
      complex: "Complex",
    };

    // Group enriched findings
    const quickWins = enrichment?.enrichedFindings?.filter(
      (ef: any) => ef.category === "quick-win" && ef.businessValueScore > 0
    ) || [];
    const strategic = enrichment?.enrichedFindings?.filter(
      (ef: any) => ef.category === "strategic" && ef.businessValueScore > 0
    ) || [];
    const other = enrichment?.enrichedFindings?.filter(
      (ef: any) => (ef.category === "low-priority" || ef.category === "complex") && ef.businessValueScore > 0
    ) || [];

    const renderFinding = (ef: any, i: number) => `
      <div class="finding-card">
        <div class="finding-header">
          <span class="finding-severity" style="color: ${severityColors[ef.finding?.severity] || "#3b82f6"}">●</span>
          <span class="finding-title">${ef.finding?.title || "Finding"}</span>
          <span class="finding-tag">${categoryLabels[ef.category] || ef.category}</span>
          <span class="finding-effort">${effortLabels[ef.effortScore] || "Medium"}</span>
        </div>
        ${ef.explanation ? `<p class="finding-explanation">${ef.explanation}</p>` : ""}
        ${ef.howToFix ? `
          <div class="finding-detail">
            <span class="detail-label" style="color: #3b82f6">HOW TO FIX</span>
            <p>${ef.howToFix}</p>
          </div>
        ` : ""}
        ${ef.expectedImprovement ? `
          <div class="finding-detail">
            <span class="detail-label" style="color: #22c55e">EXPECTED IMPROVEMENT</span>
            <p>${ef.expectedImprovement}</p>
          </div>
        ` : ""}
        ${ef.businessImpact ? `
          <div class="finding-detail">
            <span class="detail-label" style="color: #a855f7">BUSINESS IMPACT</span>
            <p>${ef.businessImpact}</p>
          </div>
        ` : ""}
        <div class="finding-meta">
          Priority: ${ef.priorityScore}/10 · Value: ${ef.businessValueScore}/100 · ROI: ${ef.roi}
        </div>
      </div>
    `;

    const renderRecommendation = (rec: any, i: number) => `
      <div class="rec-card">
        <div class="rec-number">${i + 1}</div>
        <div class="rec-content">
          <div class="rec-header">
            <span class="rec-title">${rec.title}</span>
            <span class="rec-impact" style="color: ${
              rec.impact === "high" ? "#ef4444" : rec.impact === "medium" ? "#eab308" : "#9ca3af"
            }">${impactLabels[rec.impact] || rec.impact}</span>
          </div>
          <p class="rec-desc">${rec.description || ""}</p>
        </div>
      </div>
    `;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Analysis Report — ${domain}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; background: #fff; line-height: 1.6; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 30px; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e5e7eb; padding-bottom: 30px; }
    .header h1 { font-size: 28px; margin-bottom: 8px; }
    .header .domain { color: #3b82f6; font-size: 20px; font-weight: 600; }
    .header .date { color: #9ca3af; font-size: 13px; margin-top: 8px; }
    .header .badge { display: inline-block; background: #3b82f6; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-top: 8px; }

    .score-section { display: flex; align-items: center; justify-content: center; gap: 30px; margin: 30px 0; }
    .overall-score { text-align: center; }
    .overall-score .number { font-size: 64px; font-weight: 900; }
    .overall-score .label { font-size: 13px; color: #9ca3af; }
    .grade { font-size: 48px; font-weight: 900; }

    .scores-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0 40px; }
    .score-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
    .score-card .score-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .score-card .score-value { font-size: 28px; font-weight: 800; margin-top: 4px; }
    .score-bar { height: 4px; background: #f3f4f6; border-radius: 2px; margin-top: 6px; overflow: hidden; }
    .score-bar-fill { height: 100%; border-radius: 2px; }

    .summary-box { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 30px 0; }
    .summary-box h2 { font-size: 18px; margin-bottom: 12px; }
    .summary-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .stat { text-align: center; }
    .stat .stat-value { font-size: 24px; font-weight: 800; }
    .stat .stat-label { font-size: 11px; color: #6b7280; }
    .top-priorities { margin-top: 12px; }
    .top-priorities .priority-item { display: flex; gap: 8px; margin: 4px 0; font-size: 13px; }
    .top-priorities .priority-num { font-weight: 700; color: #3b82f6; min-width: 20px; }

    .section { margin: 40px 0; }
    .section h2 { font-size: 20px; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
    .section .section-count { font-size: 12px; padding: 2px 10px; border-radius: 20px; background: #f3f4f6; color: #6b7280; }
    .section .section-desc { font-size: 13px; color: #9ca3af; margin-bottom: 16px; }

    .finding-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin-bottom: 10px; page-break-inside: avoid; }
    .finding-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .finding-severity { font-size: 10px; }
    .finding-title { font-size: 14px; font-weight: 600; }
    .finding-tag { font-size: 10px; padding: 2px 8px; border-radius: 10px; background: #f3f4f6; color: #6b7280; }
    .finding-effort { font-size: 10px; padding: 2px 8px; border-radius: 10px; background: #f3f4f6; color: #6b7280; }
    .finding-explanation { font-size: 12px; color: #6b7280; margin-top: 6px; }
    .finding-detail { margin-top: 10px; padding-top: 8px; border-top: 1px solid #f3f4f6; }
    .detail-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
    .finding-detail p { font-size: 12px; color: #374151; margin-top: 2px; }
    .finding-meta { font-size: 10px; color: #9ca3af; margin-top: 8px; padding-top: 6px; border-top: 1px solid #f3f4f6; }

    .rec-card { display: flex; gap: 12px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin-bottom: 10px; page-break-inside: avoid; }
    .rec-number { flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%; background: #eff6ff; color: #3b82f6; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; }
    .rec-content { flex: 1; }
    .rec-header { display: flex; align-items: center; gap: 8px; }
    .rec-title { font-size: 14px; font-weight: 600; }
    .rec-impact { font-size: 11px; font-weight: 500; }
    .rec-desc { font-size: 12px; color: #6b7280; margin-top: 4px; }

    .footer { text-align: center; margin-top: 60px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #9ca3af; font-size: 12px; }

    @media print {
      body { font-size: 11px; }
      .container { padding: 20px; }
      .finding-card, .rec-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">WEBFLIPPER ANALYSIS REPORT</div>
      <h1>Website Analysis Report</h1>
      <div class="domain">${domain}</div>
      <div class="date">Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
    </div>

    <div class="score-section">
      <div class="overall-score">
        <div class="number" style="color: ${getScoreColor(scores.overall)}">${scores.overall}</div>
        <div class="label">/ 100</div>
      </div>
      ${enrichment ? `<div class="grade" style="color: ${getScoreColor(scores.overall)}">${enrichment.letterGrade || getGrade(scores.overall)}</div>` : ""}
    </div>

    <div class="scores-grid">
      ${[
        { label: "Performance", score: scores.performance, color: "#ef4444" },
        { label: "SEO", score: scores.seo, color: "#eab308" },
        { label: "Security", score: scores.security, color: "#22c55e" },
        { label: "UX & Design", score: scores.ux, color: "#f97316" },
        { label: "Content", score: scores.content, color: "#3b82f6" },
        { label: "AI Visibility", score: scores.aiVisibility, color: "#a855f7" },
        { label: "Accessibility", score: scores.accessibility, color: "#8b5cf6" },
      ].map(c => `
        <div class="score-card">
          <div class="score-label">${c.label}</div>
          <div class="score-value" style="color: ${getScoreColor(c.score)}">${c.score}</div>
          <div class="score-bar"><div class="score-bar-fill" style="width: ${c.score}%; background: ${c.color}"></div></div>
        </div>
      `).join("")}
    </div>

    ${enrichment ? `
    <div class="summary-box">
      <h2>Executive Summary</h2>
      <div class="summary-stats">
        <div class="stat"><div class="stat-value" style="color: #22c55e">${enrichment.executiveSummary?.quickWinCount || 0}</div><div class="stat-label">Quick wins</div></div>
        <div class="stat"><div class="stat-value" style="color: #eab308">+${enrichment.impactEstimates?.trafficImprovement || 0}%</div><div class="stat-label">Traffic potential</div></div>
        <div class="stat"><div class="stat-value" style="color: #3b82f6">+${enrichment.impactEstimates?.conversionImprovement || 0}%</div><div class="stat-label">Conversion potential</div></div>
        <div class="stat"><div class="stat-value" style="color: #a855f7">+${enrichment.impactEstimates?.healthScoreImprovement || 0}</div><div class="stat-label">Points to improve</div></div>
      </div>
      ${enrichment.executiveSummary?.topRecommendations?.length > 0 ? `
        <div class="top-priorities">
          <strong style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Top 5 Priorities</strong>
          ${enrichment.executiveSummary.topRecommendations.map((r: string, i: number) => `
            <div class="priority-item"><span class="priority-num">${i + 1}.</span><span>${r}</span></div>
          `).join("")}
        </div>
      ` : ""}
    </div>
    ` : ""}

    ${quickWins.length > 0 ? `
    <div class="section">
      <h2>⚡ Quick Wins <span class="section-count">${quickWins.length} findings</span></h2>
      <div class="section-desc">High impact, low effort — start with these</div>
      ${quickWins.map(renderFinding).join("")}
    </div>
    ` : ""}

    ${strategic.length > 0 ? `
    <div class="section">
      <h2>📋 Strategic Improvements <span class="section-count">${strategic.length} findings</span></h2>
      <div class="section-desc">High impact, higher effort — plan these</div>
      ${strategic.map(renderFinding).join("")}
    </div>
    ` : ""}

    ${other.length > 0 ? `
    <div class="section">
      <h2>📌 Other Findings <span class="section-count">${other.length} findings</span></h2>
      ${other.map(renderFinding).join("")}
    </div>
    ` : ""}

    ${enrichment?.recommendations?.length > 0 ? `
    <div class="section">
      <h2>🎯 Action Plan & Recommendations</h2>
      ${enrichment.recommendations.map(renderRecommendation).join("")}
    </div>
    ` : ""}

    <div class="footer">
      <p>Generated by <strong>Webflipper</strong> — AI-Powered Website Analysis</p>
      <p>webflip-five.vercel.app</p>
    </div>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="webflipper-report-${domain}.html"`,
      },
    });
  } catch (err) {
    console.error("GET /api/analyze/[token]/report-pdf error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
