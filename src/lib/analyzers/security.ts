import * as cheerio from "cheerio";
import type { CategoryScore, Finding } from "../supabase";

// Patterns we look for in client HTML to flag as unsafe
const UNSAFE_JS_PATTERN = "document" + ".write(";

export async function analyzeSecurity(
  html: string,
  url: string
): Promise<CategoryScore> {
  const $ = cheerio.load(html);
  const findings: Finding[] = [];
  let score = 100;

  // 1. HTTPS check
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "https:") {
    findings.push({ category: "security", severity: "critical", title: "No HTTPS", description: "Site is not using HTTPS. All modern sites must use SSL/TLS encryption." });
    score -= 25;
  } else {
    findings.push({ category: "security", severity: "ok", title: "HTTPS enabled", description: "Site uses HTTPS encryption." });
  }

  // 2. Mixed content detection
  const mixedContentSrcs = $("img[src^='http:'], script[src^='http:'], link[href^='http:'], iframe[src^='http:']");
  if (mixedContentSrcs.length > 0) {
    findings.push({ category: "security", severity: "critical", title: "Mixed content detected", description: `${mixedContentSrcs.length} resource(s) loaded over HTTP on an HTTPS page.` });
    score -= 15;
  }

  // 3. Check HTTP security headers (via fetch)
  try {
    const headResponse = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    const headers = headResponse.headers;

    // Content-Security-Policy
    if (!headers.get("content-security-policy")) {
      findings.push({ category: "security", severity: "warning", title: "Missing CSP header", description: "No Content-Security-Policy header. CSP helps prevent XSS and injection attacks." });
      score -= 8;
    } else {
      findings.push({ category: "security", severity: "ok", title: "CSP header present", description: "Content-Security-Policy header is set." });
    }

    // Strict-Transport-Security
    if (!headers.get("strict-transport-security")) {
      findings.push({ category: "security", severity: "warning", title: "Missing HSTS header", description: "No Strict-Transport-Security header. HSTS forces browsers to use HTTPS." });
      score -= 8;
    } else {
      findings.push({ category: "security", severity: "ok", title: "HSTS enabled", description: "Strict-Transport-Security header is present." });
    }

    // X-Frame-Options or frame-ancestors in CSP
    const xfo = headers.get("x-frame-options");
    const csp = headers.get("content-security-policy") || "";
    if (!xfo && !csp.includes("frame-ancestors")) {
      findings.push({ category: "security", severity: "warning", title: "Clickjacking risk", description: "No X-Frame-Options or CSP frame-ancestors. Site may be vulnerable to clickjacking." });
      score -= 5;
    }

    // X-Content-Type-Options
    if (!headers.get("x-content-type-options")) {
      findings.push({ category: "security", severity: "info", title: "Missing X-Content-Type-Options", description: "Header not set. Add 'nosniff' to prevent MIME type sniffing." });
      score -= 3;
    }

    // Referrer-Policy
    if (!headers.get("referrer-policy")) {
      findings.push({ category: "security", severity: "info", title: "No Referrer-Policy", description: "Referrer-Policy header not set. May leak URL info to third parties." });
      score -= 2;
    }

    // Permissions-Policy
    if (!headers.get("permissions-policy")) {
      findings.push({ category: "security", severity: "info", title: "No Permissions-Policy", description: "Consider adding Permissions-Policy to control browser features." });
      score -= 2;
    }
  } catch {
    findings.push({ category: "security", severity: "info", title: "Could not check headers", description: "Unable to fetch HTTP headers for security analysis." });
    score -= 5;
  }

  // 4. Exposed emails/phones in HTML
  const bodyText = $("body").text();
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const exposedEmails = bodyText.match(emailPattern);
  if (exposedEmails && exposedEmails.length > 0) {
    findings.push({ category: "security", severity: "info", title: "Exposed email addresses", description: `Found ${exposedEmails.length} email address(es) in page text. Consider obfuscation.` });
    score -= 2;
  }

  // 5. Outdated libraries detection (basic)
  const scripts = $("script[src]")
    .map((_, el) => $(el).attr("src") || "")
    .get();
  const outdatedPatterns = [
    { pattern: /jquery[.-]1\./i, name: "jQuery 1.x" },
    { pattern: /jquery[.-]2\./i, name: "jQuery 2.x" },
    { pattern: /bootstrap[.-][23]\./i, name: "Bootstrap 2-3" },
    { pattern: /angular[.-]1\./i, name: "AngularJS 1.x" },
  ];
  for (const { pattern, name } of outdatedPatterns) {
    if (scripts.some((s) => pattern.test(s))) {
      findings.push({ category: "security", severity: "warning", title: `Outdated library: ${name}`, description: `${name} detected. Outdated libraries may have known vulnerabilities.` });
      score -= 5;
    }
  }

  // 6. Cookie consent / privacy
  const hasCookieBanner =
    $("[class*='cookie'], [id*='cookie'], [class*='consent'], [id*='consent'], [class*='gdpr'], [id*='gdpr']").length > 0;
  if (!hasCookieBanner) {
    findings.push({ category: "security", severity: "info", title: "No cookie consent detected", description: "No visible cookie consent banner found. Required by GDPR/ePrivacy in EU." });
    score -= 3;
  }

  // 7. Privacy policy link
  const privacyLink = $("a").filter((_, el) => {
    const text = $(el).text().toLowerCase();
    const href = ($(el).attr("href") || "").toLowerCase();
    return text.includes("privacy") || text.includes("datenschutz") || text.includes("ochrana") ||
      href.includes("privacy") || href.includes("datenschutz");
  });
  if (privacyLink.length === 0) {
    findings.push({ category: "security", severity: "warning", title: "No privacy policy link", description: "No privacy policy page linked. This is legally required in most jurisdictions." });
    score -= 5;
  } else {
    findings.push({ category: "security", severity: "ok", title: "Privacy policy present", description: "Link to privacy policy found." });
  }

  // 8. Unsafe inline script patterns (detect in analyzed client HTML)
  const inlineScripts = $("script:not([src])").toArray();
  let hasUnsafePatterns = false;
  for (const script of inlineScripts) {
    const content = $(script).text();
    if (content.includes(UNSAFE_JS_PATTERN)) {
      hasUnsafePatterns = true;
    }
  }
  if (hasUnsafePatterns) {
    findings.push({ category: "security", severity: "warning", title: "Unsafe JavaScript patterns", description: "Found unsafe DOM manipulation in inline scripts. This is a security risk." });
    score -= 5;
  }

  return { score: Math.max(0, Math.min(100, score)), findings };
}
