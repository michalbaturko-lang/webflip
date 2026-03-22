/**
 * HTML email templates for Webflipper outreach campaigns.
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

// ---------------------------------------------------------------------------
// cold-intro
// ---------------------------------------------------------------------------

interface OutreachColdIntroData {
  companyName: string;
  domain: string;
  landingPageUrl: string;
  suitabilityScore: number;
  topIssues: string[];
}

export function getOutreachColdIntroHtml(data: OutreachColdIntroData): string {
  const { companyName, domain, landingPageUrl, suitabilityScore, topIssues } = data;

  const scoreColor = suitabilityScore >= 75 ? "#22c55e" : suitabilityScore >= 50 ? "#f59e0b" : "#ef4444";
  const scoreBgColor = suitabilityScore >= 75 ? "#f0fdf4" : suitabilityScore >= 50 ? "#fffbeb" : "#fef2f2";

  const issueItems = topIssues.slice(0, 3).map(
    (issue) => `
      <tr>
        <td class="email-text" style="padding: 6px 0; font-family: ${FONT_STACK}; font-size: 14px; color: #555; line-height: 1.5;">
          • ${issue}
        </td>
      </tr>`
  ).join("");

  return wrapLayout(`
    <!-- Header -->
    <tr>
      <td class="email-header" align="center" style="background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); padding: 40px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <h1 style="margin: 0; font-family: ${FONT_STACK}; font-size: 24px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                Redesign váš web
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
        <p class="email-text" style="margin: 0 0 24px; font-family: ${FONT_STACK}; font-size: 15px; color: #333; line-height: 1.6;">
          Analyzovali jsme <strong>${domain}</strong> a připravili 3 redesign varianty speciálně pro vás.
        </p>
        <!-- Suitability Score Card -->
        <table role="presentation" class="email-card" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${scoreBgColor}; border: 1px solid ${scoreColor}20; border-radius: 8px; margin-bottom: 24px;">
          <tr>
            <td align="center" style="padding: 20px;">
              <div style="font-family: ${FONT_STACK}; font-size: 36px; font-weight: 700; color: ${scoreColor}; line-height: 1;">
                ${suitabilityScore}%
              </div>
              <div style="font-family: ${FONT_STACK}; font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px;">
                Potenciál redesignu
              </div>
            </td>
          </tr>
        </table>
        <!-- Issues Found -->
        <p class="email-text" style="margin: 0 0 12px; font-family: ${FONT_STACK}; font-size: 14px; font-weight: 600; color: #333;">
          Zjistili jsme:
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${issueItems}
        </table>
        <p class="email-text" style="margin: 24px 0 0; font-family: ${FONT_STACK}; font-size: 15px; color: #333; line-height: 1.6;">
          Podívejte se na připravené varianty a inspirujte se novými nápady pro váš web.
        </p>
      </td>
    </tr>
    <!-- CTA -->
    <tr>
      <td style="padding: 0 32px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="center">
              <a href="${landingPageUrl}" style="display: inline-block; background: linear-gradient(135deg, #a855f7, #7c3aed); color: #ffffff; font-family: ${FONT_STACK}; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 40px; border-radius: 8px;">
                Podívejte se na váš redesign &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `);
}

// ---------------------------------------------------------------------------
// follow-up
// ---------------------------------------------------------------------------

interface OutreachFollowUpData {
  companyName: string;
  domain: string;
  landingPageUrl: string;
  variantCount: number;
}

export function getOutreachFollowUpHtml(data: OutreachFollowUpData): string {
  const { companyName, domain, landingPageUrl, variantCount } = data;

  return wrapLayout(`
    <!-- Header -->
    <tr>
      <td class="email-header" align="center" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <h1 style="margin: 0; font-family: ${FONT_STACK}; font-size: 24px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                Váš redesign čeká
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
        <p class="email-text" style="margin: 0 0 24px; font-family: ${FONT_STACK}; font-size: 15px; color: #333; line-height: 1.6;">
          Před pár dny jsme vám poslali <strong>${variantCount} redesign ${variantCount === 1 ? "variantu" : "varianty"}</strong> pro <strong>${domain}</strong>. Ještě jste se nepodívali — mrknete?
        </p>
        <!-- Variant Info Card -->
        <table role="presentation" class="email-card" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f0f4ff; border: 1px solid #dbeafe; border-radius: 8px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 20px;">
              <div style="font-family: ${FONT_STACK}; font-size: 32px; line-height: 1; margin-bottom: 8px;">✨</div>
              <p class="email-text" style="margin: 0; font-family: ${FONT_STACK}; font-size: 15px; color: #333; line-height: 1.5;">
                <strong>${variantCount} designové varianty</strong> připravené pro vás, každá s jiným stylem a přístupem.
              </p>
            </td>
          </tr>
        </table>
        <!-- Urgency -->
        <table role="presentation" class="email-card" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px;">
          <tr>
            <td style="padding: 14px 16px;">
              <p class="email-text" style="margin: 0; font-family: ${FONT_STACK}; font-size: 13px; color: #92400e; line-height: 1.5;">
                ⏰ Preview bude dostupný ještě <strong>14 dní</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- CTA -->
    <tr>
      <td style="padding: 0 32px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="center">
              <a href="${landingPageUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: #ffffff; font-family: ${FONT_STACK}; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 40px; border-radius: 8px;">
                Zobrazit redesign varianty &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `);
}

// ---------------------------------------------------------------------------
// final-push
// ---------------------------------------------------------------------------

interface OutreachFinalPushData {
  companyName: string;
  domain: string;
  landingPageUrl: string;
  expirationDays: number;
}

export function getOutreachFinalPushHtml(data: OutreachFinalPushData): string {
  const { companyName, domain, landingPageUrl, expirationDays } = data;

  return wrapLayout(`
    <!-- Header -->
    <tr>
      <td class="email-header" align="center" style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <h1 style="margin: 0; font-family: ${FONT_STACK}; font-size: 24px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                Poslední šance
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
        <p class="email-text" style="margin: 0 0 24px; font-family: ${FONT_STACK}; font-size: 15px; color: #333; line-height: 1.6;">
          Za <strong>${expirationDays} ${expirationDays === 1 ? "den" : expirationDays < 5 ? "dny" : "dní"}</strong> odstraníme váš personalizovaný redesign. Poté už ho nebudete moci zobrazit.
        </p>
        <!-- Countdown Card -->
        <table role="presentation" class="email-card" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; margin-bottom: 24px;">
          <tr>
            <td align="center" style="padding: 24px;">
              <div style="font-family: ${FONT_STACK}; font-size: 48px; font-weight: 700; color: #f97316; line-height: 1;">
                ${expirationDays}
              </div>
              <div style="font-family: ${FONT_STACK}; font-size: 13px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px;">
                ${expirationDays === 1 ? "Den" : "Dní"} zbývá
              </div>
            </td>
          </tr>
        </table>
        <!-- Soft closer -->
        <p class="email-text" style="margin: 0 0 20px; font-family: ${FONT_STACK}; font-size: 14px; color: #666; line-height: 1.6;">
          Pokud nemáte zájem, stačí tento email ignorovat. Bez problémů.
        </p>
      </td>
    </tr>
    <!-- CTA -->
    <tr>
      <td style="padding: 0 32px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="center">
              <a href="${landingPageUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: #ffffff; font-family: ${FONT_STACK}; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 40px; border-radius: 8px;">
                Zobrazit redesign naposledy &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `);
}
