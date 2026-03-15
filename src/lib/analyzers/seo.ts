import * as cheerio from "cheerio";
import type { CategoryScore, Finding } from "../supabase";

export function analyzeSEO(html: string, url: string): CategoryScore {
  const $ = cheerio.load(html);
  const findings: Finding[] = [];
  let score = 100;

  // 1. Meta title
  const title = $("title").text().trim();
  if (!title) {
    findings.push({ category: "seo", severity: "critical", title: "Missing page title", description: "The page has no <title> tag. This is critical for search engine rankings." });
    score -= 15;
  } else if (title.length < 30) {
    findings.push({ category: "seo", severity: "warning", title: "Title too short", description: `Title is ${title.length} chars. Recommended: 50-60 characters.` });
    score -= 5;
  } else if (title.length > 65) {
    findings.push({ category: "seo", severity: "warning", title: "Title too long", description: `Title is ${title.length} chars. Google truncates after ~60 characters.` });
    score -= 3;
  } else {
    findings.push({ category: "seo", severity: "ok", title: "Good page title", description: `Title "${title.slice(0, 40)}..." is well-optimized (${title.length} chars).` });
  }

  // 2. Meta description
  const metaDesc = $('meta[name="description"]').attr("content")?.trim();
  if (!metaDesc) {
    findings.push({ category: "seo", severity: "critical", title: "Missing meta description", description: "No meta description found. Search engines use this in results snippets." });
    score -= 12;
  } else if (metaDesc.length < 100) {
    findings.push({ category: "seo", severity: "warning", title: "Meta description too short", description: `Description is ${metaDesc.length} chars. Recommended: 140-160.` });
    score -= 4;
  } else if (metaDesc.length > 170) {
    findings.push({ category: "seo", severity: "warning", title: "Meta description too long", description: `Description is ${metaDesc.length} chars. Google truncates after ~160.` });
    score -= 2;
  } else {
    findings.push({ category: "seo", severity: "ok", title: "Good meta description", description: `Description is well-optimized (${metaDesc.length} chars).` });
  }

  // 3. H1 presence + hierarchy
  const h1s = $("h1");
  if (h1s.length === 0) {
    findings.push({ category: "seo", severity: "critical", title: "Missing H1 heading", description: "No H1 tag found. Every page should have exactly one H1." });
    score -= 10;
  } else if (h1s.length > 1) {
    findings.push({ category: "seo", severity: "warning", title: "Multiple H1 headings", description: `Found ${h1s.length} H1 tags. Best practice is to have exactly one.` });
    score -= 5;
  } else {
    findings.push({ category: "seo", severity: "ok", title: "H1 heading present", description: "Page has exactly one H1 heading." });
  }

  // Check heading hierarchy (H1 > H2 > H3)
  const headings = $("h1, h2, h3, h4, h5, h6").toArray();
  let prevLevel = 0;
  let hierarchyOk = true;
  for (const h of headings) {
    const level = parseInt(h.tagName.replace("h", ""));
    if (level > prevLevel + 1 && prevLevel > 0) {
      hierarchyOk = false;
      break;
    }
    prevLevel = level;
  }
  if (!hierarchyOk) {
    findings.push({ category: "seo", severity: "warning", title: "Broken heading hierarchy", description: "Headings skip levels (e.g., H1 → H3). Use sequential heading levels." });
    score -= 3;
  }

  // 4. Alt text coverage
  const images = $("img");
  const imagesWithoutAlt = images.filter((_, el) => {
    const alt = $(el).attr("alt");
    return alt === undefined || alt === "";
  });
  if (images.length > 0) {
    const coverage = Math.round(((images.length - imagesWithoutAlt.length) / images.length) * 100);
    if (coverage < 50) {
      findings.push({ category: "seo", severity: "critical", title: "Poor image alt text coverage", description: `Only ${coverage}% of images have alt text (${imagesWithoutAlt.length}/${images.length} missing).` });
      score -= 10;
    } else if (coverage < 90) {
      findings.push({ category: "seo", severity: "warning", title: "Incomplete alt text", description: `${coverage}% of images have alt text. ${imagesWithoutAlt.length} images missing alt.` });
      score -= 5;
    } else {
      findings.push({ category: "seo", severity: "ok", title: "Good alt text coverage", description: `${coverage}% of images have alt text.` });
    }
  }

  // 5. Canonical tag
  const canonical = $('link[rel="canonical"]').attr("href");
  if (!canonical) {
    findings.push({ category: "seo", severity: "warning", title: "Missing canonical tag", description: "No canonical URL specified. This helps prevent duplicate content issues." });
    score -= 5;
  } else {
    findings.push({ category: "seo", severity: "ok", title: "Canonical tag present", description: "Page specifies a canonical URL." });
  }

  // 6. Open Graph tags
  const ogTitle = $('meta[property="og:title"]').attr("content");
  const ogDesc = $('meta[property="og:description"]').attr("content");
  const ogImage = $('meta[property="og:image"]').attr("content");
  const ogCount = [ogTitle, ogDesc, ogImage].filter(Boolean).length;
  if (ogCount === 0) {
    findings.push({ category: "seo", severity: "warning", title: "Missing Open Graph tags", description: "No OG tags found. Social sharing will use fallbacks." });
    score -= 5;
  } else if (ogCount < 3) {
    findings.push({ category: "seo", severity: "info", title: "Incomplete Open Graph", description: `Only ${ogCount}/3 essential OG tags present (title, description, image).` });
    score -= 2;
  } else {
    findings.push({ category: "seo", severity: "ok", title: "Open Graph tags complete", description: "All essential OG tags are present." });
  }

  // 7. Structured data (Schema.org)
  const jsonLd = $('script[type="application/ld+json"]');
  const microdata = $("[itemscope]");
  if (jsonLd.length === 0 && microdata.length === 0) {
    findings.push({ category: "seo", severity: "warning", title: "No structured data", description: "No Schema.org markup found (JSON-LD or Microdata). Rich results won't appear." });
    score -= 8;
  } else {
    findings.push({ category: "seo", severity: "ok", title: "Structured data present", description: `Found ${jsonLd.length} JSON-LD block(s) and ${microdata.length} microdata element(s).` });
  }

  // 8. Internal links
  const internalLinks = $("a[href]").filter((_, el) => {
    const href = $(el).attr("href") || "";
    return href.startsWith("/") || href.startsWith(url);
  });
  if (internalLinks.length < 3) {
    findings.push({ category: "seo", severity: "warning", title: "Few internal links", description: `Only ${internalLinks.length} internal links found. Internal linking helps SEO.` });
    score -= 4;
  }

  // 9. Mobile viewport
  const viewport = $('meta[name="viewport"]').attr("content");
  if (!viewport) {
    findings.push({ category: "seo", severity: "critical", title: "Missing viewport meta", description: "No viewport meta tag. Page won't render correctly on mobile devices." });
    score -= 10;
  } else if (!viewport.includes("width=device-width")) {
    findings.push({ category: "seo", severity: "warning", title: "Viewport not responsive", description: "Viewport meta doesn't include width=device-width." });
    score -= 5;
  }

  // 10. Language attribute
  const lang = $("html").attr("lang");
  if (!lang) {
    findings.push({ category: "seo", severity: "info", title: "Missing lang attribute", description: "HTML element has no lang attribute. Helps search engines and accessibility." });
    score -= 2;
  }

  // 11. Noindex check
  const robotsMeta = $('meta[name="robots"]').attr("content")?.toLowerCase() || "";
  if (robotsMeta.includes("noindex")) {
    findings.push({ category: "seo", severity: "critical", title: "Page set to noindex", description: "Robots meta tag has noindex — this page won't appear in search results." });
    score -= 20;
  }

  // 12. Twitter card
  const twitterCard = $('meta[name="twitter:card"]').attr("content");
  if (!twitterCard) {
    findings.push({ category: "seo", severity: "info", title: "Missing Twitter Card", description: "No Twitter Card meta tags. Tweets with links won't show rich previews." });
    score -= 2;
  }

  return { score: Math.max(0, Math.min(100, score)), findings };
}
