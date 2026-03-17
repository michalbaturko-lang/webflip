import { Resend } from "resend";
import {
  getAnalysisStartedHtml,
  getAnalysisCompleteHtml,
  getAnalysisErrorHtml,
} from "./email-templates";

const FROM_ADDRESS = "Webflip <noreply@webflip.io>";

type EmailType = "analysis-started" | "analysis-complete" | "analysis-error";

interface ScoreData {
  performance: number;
  seo: number;
  security: number;
  ux: number;
  content: number;
  aiVisibility: number;
}

interface SendAnalysisEmailParams {
  to: string;
  type: EmailType;
  token: string;
  url: string;
  scores?: ScoreData;
  variantCount?: number;
  errorMessage?: string;
}

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send");
    return null;
  }
  return new Resend(apiKey);
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://webflip.io";
}

export async function sendAnalysisEmail(params: SendAnalysisEmailParams): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const { to, type, token, url } = params;
  const appUrl = getAppUrl();
  const resultsUrl = `${appUrl}/analyze/${token}`;

  let subject: string;
  let html: string;

  switch (type) {
    case "analysis-started":
      subject = `Analýza webu ${new URL(url).hostname} právě začala`;
      html = getAnalysisStartedHtml({ url, resultsUrl });
      break;

    case "analysis-complete":
      subject = `Analýza webu ${new URL(url).hostname} je hotová!`;
      html = getAnalysisCompleteHtml({
        url,
        resultsUrl,
        scores: params.scores!,
        variantCount: params.variantCount ?? 3,
      });
      break;

    case "analysis-error":
      subject = `Analýza webu ${new URL(url).hostname} se nezdařila`;
      html = getAnalysisErrorHtml({
        url,
        resultsUrl,
        errorMessage: params.errorMessage ?? "Neznámá chyba",
      });
      break;
  }

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });
    console.log(`[email] Sent ${type} email to ${to} for ${url}`);
  } catch (err) {
    console.error(`[email] Failed to send ${type} email:`, err);
  }
}
