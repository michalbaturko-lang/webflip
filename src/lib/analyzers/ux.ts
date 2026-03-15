import * as cheerio from "cheerio";
import type { CategoryScore, Finding } from "../supabase";

export function analyzeUX(html: string): CategoryScore {
  const $ = cheerio.load(html);
  const findings: Finding[] = [];
  let score = 100;

  // 1. Mobile viewport meta
  const viewport = $('meta[name="viewport"]').attr("content") || "";
  if (!viewport) {
    findings.push({ category: "ux", severity: "critical", title: "No viewport meta tag", description: "Page won't scale correctly on mobile devices." });
    score -= 15;
  } else if (!viewport.includes("width=device-width")) {
    findings.push({ category: "ux", severity: "warning", title: "Viewport not fully responsive", description: "Viewport meta doesn't set width=device-width." });
    score -= 8;
  } else {
    findings.push({ category: "ux", severity: "ok", title: "Responsive viewport", description: "Mobile viewport is properly configured." });
  }

  // 2. Semantic HTML structure
  const hasNav = $("nav").length > 0;
  const hasMain = $("main").length > 0;
  const hasHeader = $("header").length > 0;
  const hasFooter = $("footer").length > 0;
  const semanticCount = [hasNav, hasMain, hasHeader, hasFooter].filter(Boolean).length;

  if (semanticCount < 2) {
    findings.push({ category: "ux", severity: "warning", title: "Poor semantic structure", description: `Only ${semanticCount}/4 semantic elements found (nav, main, header, footer). Use semantic HTML for better accessibility.` });
    score -= 8;
  } else if (semanticCount < 4) {
    findings.push({ category: "ux", severity: "info", title: "Partial semantic HTML", description: `${semanticCount}/4 semantic elements present. Consider adding missing ones.` });
    score -= 3;
  } else {
    findings.push({ category: "ux", severity: "ok", title: "Good semantic structure", description: "All major semantic elements present (nav, main, header, footer)." });
  }

  // 3. Navigation presence and quality
  const navLinks = $("nav a, [role='navigation'] a");
  if (navLinks.length === 0) {
    findings.push({ category: "ux", severity: "critical", title: "No navigation found", description: "No navigation links detected. Users can't explore the site." });
    score -= 15;
  } else if (navLinks.length < 3) {
    findings.push({ category: "ux", severity: "warning", title: "Minimal navigation", description: `Only ${navLinks.length} navigation link(s). Consider adding more for better UX.` });
    score -= 5;
  }

  // 4. CTA visibility
  const ctaElements = $(
    "a.btn, a.button, button[type='submit'], [class*='cta'], [class*='btn-primary'], a[class*='bg-']"
  );
  if (ctaElements.length === 0) {
    findings.push({ category: "ux", severity: "warning", title: "No clear CTA buttons", description: "No prominent call-to-action buttons detected. Users need clear next steps." });
    score -= 10;
  } else {
    findings.push({ category: "ux", severity: "ok", title: "CTA buttons present", description: `Found ${ctaElements.length} call-to-action element(s).` });
  }

  // 5. Form usability
  const forms = $("form");
  if (forms.length > 0) {
    const inputs = $("form input, form textarea, form select");
    const labels = $("form label");
    const placeholders = $("form input[placeholder], form textarea[placeholder]");

    if (labels.length < inputs.length && placeholders.length < inputs.length) {
      findings.push({ category: "ux", severity: "warning", title: "Form inputs missing labels", description: "Some form inputs lack both labels and placeholders." });
      score -= 5;
    }

    // Check for required attribute usage
    const requiredInputs = $("form input[required], form textarea[required]");
    if (requiredInputs.length === 0 && inputs.length > 2) {
      findings.push({ category: "ux", severity: "info", title: "No required field indicators", description: "Form has no 'required' attributes. Users won't know which fields are mandatory." });
      score -= 2;
    }
  }

  // 6. Touch target sizes (heuristic — check for very small click targets)
  const smallButtons = $("a, button").filter((_, el) => {
    const style = $(el).attr("style") || "";
    // Check for inline tiny sizes
    const widthMatch = style.match(/width:\s*(\d+)px/);
    const heightMatch = style.match(/height:\s*(\d+)px/);
    if (widthMatch && parseInt(widthMatch[1]) < 44) return true;
    if (heightMatch && parseInt(heightMatch[1]) < 44) return true;
    return false;
  });
  if (smallButtons.length > 0) {
    findings.push({ category: "ux", severity: "warning", title: "Small touch targets", description: `${smallButtons.length} interactive element(s) may be too small for touch (< 44px). WCAG recommends 44x44px minimum.` });
    score -= 5;
  }

  // 7. Skip navigation / accessibility
  const skipLink = $("a[href='#main'], a[href='#content'], a.skip-link, a.skip-nav");
  const ariaLabels = $("[aria-label], [aria-labelledby]");
  const ariaRoles = $("[role]");
  const a11yScore = (skipLink.length > 0 ? 1 : 0) + Math.min(ariaLabels.length, 5) + Math.min(ariaRoles.length, 3);

  if (a11yScore === 0) {
    findings.push({ category: "ux", severity: "warning", title: "No accessibility features", description: "No ARIA labels, roles, or skip links found. Accessibility is important for all users." });
    score -= 8;
  } else if (a11yScore < 3) {
    findings.push({ category: "ux", severity: "info", title: "Limited accessibility", description: "Basic accessibility features present but could be improved." });
    score -= 3;
  } else {
    findings.push({ category: "ux", severity: "ok", title: "Good accessibility", description: "ARIA attributes and accessibility features are well-implemented." });
  }

  // 8. Loading/placeholder indicators
  const hasLoadingStates = $("[class*='loading'], [class*='skeleton'], [class*='spinner'], [class*='placeholder']").length > 0;
  if (!hasLoadingStates) {
    findings.push({ category: "ux", severity: "info", title: "No loading indicators", description: "No skeleton screens or loading indicators detected. Consider adding them for better perceived performance." });
    score -= 2;
  }

  // 9. Visual hierarchy — check heading count and structure
  const headingCount = $("h1, h2, h3").length;
  if (headingCount < 3) {
    findings.push({ category: "ux", severity: "warning", title: "Weak visual hierarchy", description: `Only ${headingCount} headings (H1-H3). More headings help users scan content.` });
    score -= 5;
  }

  // 10. External links open in new tab
  const externalLinks = $("a[href^='http']").filter((_, el) => {
    const href = $(el).attr("href") || "";
    try {
      const linkUrl = new URL(href);
      const pageUrl = new URL("https://placeholder.com");
      return linkUrl.hostname !== pageUrl.hostname;
    } catch {
      return false;
    }
  });
  const externalWithTarget = externalLinks.filter((_, el) => $(el).attr("target") === "_blank");
  if (externalLinks.length > 0 && externalWithTarget.length < externalLinks.length) {
    findings.push({ category: "ux", severity: "info", title: "External links without target", description: "Some external links don't open in new tabs. Users may lose their place." });
    score -= 2;
  }

  return { score: Math.max(0, Math.min(100, score)), findings };
}
