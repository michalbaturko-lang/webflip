import { Resend } from "resend";
import {
  getOutreachColdIntroHtml,
  getOutreachFollowUpHtml,
  getOutreachFinalPushHtml,
} from "./outreach-email-templates";

const FROM_ADDRESS = "Webflipper <noreply@webflipper.app>";

type OutreachEmailType = "cold_intro" | "follow_up" | "final_push";

interface SendOutreachEmailParams {
  to: string;
  type: OutreachEmailType;
  companyName: string;
  domain: string;
  landingPageUrl: string;
  suitabilityScore?: number;
  topIssues?: string[];
  variantCount?: number;
  expirationDays?: number;
}

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[outreach-email] RESEND_API_KEY not set — skipping email send");
    return null;
  }
  return new Resend(apiKey);
}

export async function sendOutreachEmail(
  params: SendOutreachEmailParams
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return {
      success: false,
      error: "RESEND_API_KEY not configured",
    };
  }

  const { to, type, companyName, domain, landingPageUrl } = params;

  let subject: string;
  let html: string;

  try {
    switch (type) {
      case "cold_intro":
        if (!params.suitabilityScore || !params.topIssues) {
          return {
            success: false,
            error: "cold_intro requires suitabilityScore and topIssues",
          };
        }
        subject = `Připravili jsme redesign pro ${companyName}`;
        html = getOutreachColdIntroHtml({
          companyName,
          domain,
          landingPageUrl,
          suitabilityScore: params.suitabilityScore,
          topIssues: params.topIssues,
        });
        break;

      case "follow_up":
        subject = `${companyName} — váš redesign stále čeká`;
        html = getOutreachFollowUpHtml({
          companyName,
          domain,
          landingPageUrl,
          variantCount: params.variantCount ?? 3,
        });
        break;

      case "final_push":
        if (!params.expirationDays) {
          return {
            success: false,
            error: "final_push requires expirationDays",
          };
        }
        subject = `Poslední šance: redesign ${companyName} bude brzy odstraněn`;
        html = getOutreachFinalPushHtml({
          companyName,
          domain,
          landingPageUrl,
          expirationDays: params.expirationDays,
        });
        break;
    }

    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });

    if (result.error) {
      console.error(`[outreach-email] Failed to send ${type} email:`, result.error);
      return {
        success: false,
        error: result.error.message,
      };
    }

    console.log(`[outreach-email] Sent ${type} email to ${to} for ${domain}`);
    return {
      success: true,
      emailId: result.data?.id,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[outreach-email] Unexpected error sending ${type} email:`, err);
    return {
      success: false,
      error,
    };
  }
}
