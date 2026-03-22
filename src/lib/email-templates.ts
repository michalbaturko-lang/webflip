/**
 * HTML email templates for Webflipper analysis notifications.
 *
 * All templates use:
 * - Table-based layout for Outlook compatibility
 * - Inline CSS (no <style> blocks except for dark mode media query)
 * - Max width 600px
 * - System font stack
 * - Czech language
 * - Dark mode support via @media (prefers-color-scheme: dark)
 */

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const DARK_MODE_STYLES = `
<style>
  @media (prefers-color-scheme: dark) {
    .email-body { background-color: #1a1a2e !important; }
    .email-container { background-color: #16213e !important; }
    .email-text { color: #e0e0e0 !important; }
    .email-text-muted { color: #a0a0b0 !important; }
    .email-card { background-color: #1a1a3e !important; border-color: #2a2a4e !important; }
    .email-header { background: linear-gradient(135deg, #1a1a3e 0%, #16213e 100%) !important; }
    .email-footer { background-color: #0f0f23 !important; }
    .email-divider { border-color: #2a2a4e !important; }
  }
</style>
`;

function wrapLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="cs" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Webflipper</title>
  ${DARK_MODE_STYLES}
</head>
<body class="email-body" style="margin: 0; padding: 0; background-color: #f4f4f8; font-family: ${FONT_STACK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-body" style="background-color: #f4f4f8;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          ${content}
        </table>
        <!-- Footer -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; margin-top: 16px;">
          <tr>
            <td class="email-text-muted" align="center" style="padding: 16px; font-family: ${FONT_STACK}; font-size: 12px; color: #888; line-height: 1.5;">
              Webflipper &mdash; AI-powered website redesign<br>
              Tento email byl odeslán automaticky. Neodpovídejte na něj.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function scoreBgColor(score: number): string {
  if (score >= 80) return "#f0fdf4";
  if (score >= 50) return "#fffbeb";
  return "#fef2f2";
}

// ---------------------------------------------------------------------------
// analysis-started
// ---------------------------------------------------------------------------

interface AnalysisStartedData {
  url: string;
  resultsUrl: string;
}

export function getAnalysisStartedHtml(data: AnalysisStartedData): string {
  const { url, resultsUrl } = data;
  const domain = new URL(url).hostname;

  return wrapLayout(`
    <!-- Header -->
    <tr>
      <td class="email-header" align="center" style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 40px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <!-- Progress animation circle -->
              <div style="width: 64px; height: 64px; border-radius: 50%; border: 4px solid rgba(255,255,255,0.3); border-top-color: #ffffff; margin: 0 auto 16px; display: inline-block;"></div>
              <h1 style="margin: 0; font-family: ${FONT_STACK}; font-size: 24px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                Analýza právě probíhá
              </h1>
              <p style="margin: 8px 0 0; font-family: ${FONT_STACK}; font-size: 14px; color: rgba(255,255,255,0.85);">
                ${domain}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding: 32px;">
        <p class="email-text" style="margin: 0 0 16px; font-family: ${FONT_STACK}; font-size: 15px; color: #333; line-height: 1.6;">
          Právě analyzujeme váš web <strong>${domain}</strong>. Kontrolujeme výkon, SEO, bezpečnost, UX, obsah a AI viditelnost.
        </p>
        <p class="email-text" style="margin: 0 0 24px; font-family: ${FONT_STACK}; font-size: 15px; color: #333; line-height: 1.6;">
          Analýza obvykle trvá 2–5 minut. Jakmile bude hotová, pošleme vám další email s výsledky.
        </p>
        <!-- CTA -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="center">
              <a href="${resultsUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #6366f1); color: #ffffff; font-family: ${FONT_STACK}; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                Sledovat průběh živě &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `);
}

// ---------------------------------------------------------------------------
// analysis-complete
// ---------------------------------------------------------------------------

interface AnalysisCompleteData {
  url: string;
  resultsUrl: string;
  scores: {
    performance: number;
    seo: number;
    security: number;
    ux: number;
    content: number;
    aiVisibility: number;
  };
  variantCount: number;
}

export function getAnalysisCompleteHtml(data: AnalysisCompleteData): string {
  const { url, resultsUrl, scores, variantCount } = data;
  const domain = new URL(url).hostname;

  const scoreLabels: [string, number][] = [
    ["Výkon", scores.performance],
    ["SEO", scores.seo],
    ["Bezpečnost", scores.security],
    ["UX & Design", scores.ux],
    ["Obsah", scores.content],
    ["AI Viditelnost", scores.aiVisibility],
  ];

  // Build 2×3 grid of score badges
  const scoreRows: string[] = [];
  for (let row = 0; row < 2; row++) {
    const cells = scoreLabels.slice(row * 3, row * 3 + 3).map(
      ([label, score]) => `
        <td class="email-card" align="center" width="33%" style="padding: 4px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${scoreBgColor(score)}; border: 1px solid ${scoreColor(score)}20; border-radius: 8px;">
            <tr>
              <td align="center" style="padding: 16px 8px;">
                <div style="font-family: ${FONT_STACK}; font-size: 28px; font-weight: 700; color: ${scoreColor(score)}; line-height: 1;">
                  ${score}
                </div>
                <div style="font-family: ${FONT_STACK}; font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px;">
                  ${label}
                </div>
              </td>
            </tr>
          </table>
        </td>`
    );
    scoreRows.push(`<tr>${cells.join("")}</tr>`);
  }

  return wrapLayout(`
    <!-- Header -->
    <tr>
      <td class="email-header" align="center" style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <div style="font-size: 48px; line-height: 1; margin-bottom: 12px;">&#10003;</div>
              <h1 style="margin: 0; font-family: ${FONT_STACK}; font-size: 24px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                Analýza je hotová!
              </h1>
              <p style="margin: 8px 0 0; font-family: ${FONT_STACK}; font-size: 14px; color: rgba(255,255,255,0.85);">
                ${domain}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Scores -->
    <tr>
      <td style="padding: 32px 24px 0;">
        <h2 class="email-text" style="margin: 0 0 16px; font-family: ${FONT_STACK}; font-size: 18px; font-weight: 600; color: #333; text-align: center;">
          Vaše skóre
        </h2>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${scoreRows.join("")}
        </table>
      </td>
    </tr>
    <!-- Variant info -->
    <tr>
      <td style="padding: 24px 32px 0;">
        <table role="presentation" class="email-card" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
          <tr>
            <td style="padding: 16px 20px;">
              <p class="email-text" style="margin: 0; font-family: ${FONT_STACK}; font-size: 15px; color: #333; line-height: 1.5;">
                &#127912; Připravili jsme pro vás <strong>${variantCount} redesign ${variantCount === 1 ? "variantu" : variantCount < 5 ? "varianty" : "variant"}</strong> vašeho webu.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- CTA -->
    <tr>
      <td style="padding: 24px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="center">
              <a href="${resultsUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #6366f1); color: #ffffff; font-family: ${FONT_STACK}; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 40px; border-radius: 8px;">
                Zobrazit výsledky &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- What next -->
    <tr>
      <td style="padding: 0 32px 32px;">
        <table role="presentation" class="email-divider" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top: 1px solid #e2e8f0; margin-bottom: 20px;">
          <tr><td style="padding-top: 20px;"></td></tr>
        </table>
        <h3 class="email-text" style="margin: 0 0 12px; font-family: ${FONT_STACK}; font-size: 16px; font-weight: 600; color: #333;">
          Co dál?
        </h3>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td class="email-text" style="padding: 4px 0; font-family: ${FONT_STACK}; font-size: 14px; color: #555; line-height: 1.6;">
              1. Prohlédněte si vaše skóre a detailní zjištění
            </td>
          </tr>
          <tr>
            <td class="email-text" style="padding: 4px 0; font-family: ${FONT_STACK}; font-size: 14px; color: #555; line-height: 1.6;">
              2. Porovnejte redesign varianty a vyberte tu nejlepší
            </td>
          </tr>
          <tr>
            <td class="email-text" style="padding: 4px 0; font-family: ${FONT_STACK}; font-size: 14px; color: #555; line-height: 1.6;">
              3. Upravte design pomocí AI editoru
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `);
}

// ---------------------------------------------------------------------------
// analysis-error
// ---------------------------------------------------------------------------

interface AnalysisErrorData {
  url: string;
  resultsUrl: string;
  errorMessage: string;
}

export function getAnalysisErrorHtml(data: AnalysisErrorData): string {
  const { url, resultsUrl, errorMessage } = data;
  const domain = new URL(url).hostname;

  return wrapLayout(`
    <!-- Header -->
    <tr>
      <td class="email-header" align="center" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <div style="font-size: 48px; line-height: 1; margin-bottom: 12px;">&#9888;</div>
              <h1 style="margin: 0; font-family: ${FONT_STACK}; font-size: 24px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                Analýza se nezdařila
              </h1>
              <p style="margin: 8px 0 0; font-family: ${FONT_STACK}; font-size: 14px; color: rgba(255,255,255,0.85);">
                ${domain}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding: 32px;">
        <p class="email-text" style="margin: 0 0 16px; font-family: ${FONT_STACK}; font-size: 15px; color: #333; line-height: 1.6;">
          Při analýze vašeho webu <strong>${domain}</strong> došlo k chybě:
        </p>
        <table role="presentation" class="email-card" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">
          <tr>
            <td style="padding: 16px 20px;">
              <p style="margin: 0; font-family: ${FONT_STACK}; font-size: 14px; color: #991b1b; line-height: 1.5;">
                ${errorMessage}
              </p>
            </td>
          </tr>
        </table>
        <p class="email-text" style="margin: 20px 0 24px; font-family: ${FONT_STACK}; font-size: 15px; color: #333; line-height: 1.6;">
          Zkuste to prosím znovu. Pokud problém přetrvává, web může být nedostupný nebo blokuje automatický přístup.
        </p>
        <!-- CTA -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="center">
              <a href="${resultsUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #6366f1); color: #ffffff; font-family: ${FONT_STACK}; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                Zkusit znovu &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `);
}
