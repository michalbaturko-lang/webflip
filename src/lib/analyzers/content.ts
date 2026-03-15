import type { CategoryScore, Finding } from "../supabase";
import { analyzeWithClaude } from "../claude";

export async function analyzeContent(
  markdown: string,
  html: string,
  url: string
): Promise<CategoryScore> {
  // First do basic checks without AI
  const findings: Finding[] = [];
  let score = 100;

  const wordCount = markdown.split(/\s+/).filter((w) => w.length > 2).length;

  // 1. Word count / thin content
  if (wordCount < 100) {
    findings.push({ category: "content", severity: "critical", title: "Very thin content", description: `Only ~${wordCount} words. Pages need substantial content for credibility and SEO.` });
    score -= 20;
  } else if (wordCount < 300) {
    findings.push({ category: "content", severity: "warning", title: "Limited content", description: `~${wordCount} words. Consider adding more detailed information.` });
    score -= 8;
  } else {
    findings.push({ category: "content", severity: "ok", title: "Good content volume", description: `~${wordCount} words of content.` });
  }

  // 2. Contact information check
  const hasPhone = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/.test(markdown);
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(markdown);
  const hasAddress = /\d+\s+[A-Za-z]+\s+(st|street|ave|avenue|rd|road|blvd|way|dr|drive)/i.test(markdown);

  const contactSignals = [hasPhone, hasEmail, hasAddress].filter(Boolean).length;
  if (contactSignals === 0) {
    findings.push({ category: "content", severity: "warning", title: "No contact information", description: "No phone, email, or address found. Contact info builds trust." });
    score -= 8;
  } else {
    findings.push({ category: "content", severity: "ok", title: "Contact info present", description: `Found ${contactSignals} contact signal(s) (phone/email/address).` });
  }

  // 3. Trust signals
  const trustKeywords = ["testimonial", "review", "client", "customer", "partner", "trusted", "certified", "award", "guarantee", "zákazn", "recenz", "partner", "certifik"];
  const hasTrustSignals = trustKeywords.some((kw) => markdown.toLowerCase().includes(kw));
  if (!hasTrustSignals) {
    findings.push({ category: "content", severity: "warning", title: "No trust signals", description: "No testimonials, reviews, or trust badges detected. Social proof increases conversions." });
    score -= 8;
  } else {
    findings.push({ category: "content", severity: "ok", title: "Trust signals found", description: "Testimonials or trust elements detected." });
  }

  // 4. Copyright year / freshness
  const currentYear = new Date().getFullYear();
  const yearPattern = new RegExp(`©\\s*(\\d{4})|copyright\\s*(\\d{4})|(\\d{4})\\s*©`, "gi");
  const years = [...markdown.matchAll(yearPattern)].map((m) => parseInt(m[1] || m[2] || m[3])).filter((y) => y > 2000);
  const latestYear = years.length > 0 ? Math.max(...years) : null;

  if (latestYear && latestYear < currentYear - 1) {
    findings.push({ category: "content", severity: "warning", title: "Outdated copyright", description: `Copyright year is ${latestYear}. Update to ${currentYear} to appear current.` });
    score -= 5;
  } else if (latestYear) {
    findings.push({ category: "content", severity: "ok", title: "Current copyright year", description: `Copyright year ${latestYear} is up to date.` });
  }

  // 5. AI-powered deep analysis
  try {
    const aiFindings = await analyzeWithClaude(markdown, url);
    findings.push(...aiFindings);

    // Adjust score based on AI findings
    for (const f of aiFindings) {
      if (f.severity === "critical") score -= 12;
      else if (f.severity === "warning") score -= 5;
      else if (f.severity === "info") score -= 1;
    }
  } catch {
    findings.push({ category: "content", severity: "info", title: "AI analysis unavailable", description: "Could not perform deep content analysis. Basic checks completed." });
  }

  return { score: Math.max(0, Math.min(100, score)), findings };
}
