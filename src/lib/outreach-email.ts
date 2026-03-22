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

// ─── Rate Limiter ───
// Sliding window: tracks send timestamps, enforces per-minute and per-hour limits
const RATE_LIMIT = {
  perMinute: Number(process.env.EMAIL_RATE_LIMIT_PER_MINUTE) || 10,
  perHour: Number(process.env.EMAIL_RATE_LIMIT_PER_HOUR) || 100,
};

const sendTimestamps: number[] = [];

function checkRateLimit(): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  // Clean up old timestamps (older than 1 hour)
  while (sendTimestamps.length > 0 && sendTimestamps[0] < now - 3600000) {
    sendTimestamps.shift();
  }

  const oneMinuteAgo = now - 60000;
  const sentLastMinute = sendTimestamps.filter((t) => t >= oneMinuteAgo).length;
  const sentLastHour = sendTimestamps.length;

  if (sentLastMinute >= RATE_LIMIT.perMinute) {
    const oldestInWindow = sendTimestamps.find((t) => t >= oneMinuteAgo)!;
    return { allowed: false, retryAfterMs: oldestInWindow + 60000 - now };
  }

  if (sentLastHour >= RATE_LIMIT.perHour) {
    const oldestInWindow = sendTimestamps[0];
    return { allowed: false, retryAfterMs: oldestInWindow + 3600000 - now };
  }

  return { allowed: true };
}

function recordSend(): void {
  sendTimestamps.push(Date.now());
}

// ─── Retry Helper ───
const RETRY_CONFIG = {
  maxRetries: Number(process.env.EMAIL_MAX_RETRIES) || 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: string): boolean {
  const retryable = [
    "rate_limit",
    "timeout",
    "ETIMEDOUT",
    "ECONNRESET",
    "429",
    "500",
    "502",
    "503",
    "504",
    "temporarily",
    "try again",
  ];
  const lower = error.toLowerCase();
  return retryable.some((keyword) => lower.includes(keyword.toLowerCase()));
}

// ─── Resend Client ───
function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[outreach-email] RESEND_API_KEY not set — skipping email send");
    return null;
  }
  return new Resend(apiKey);
}

// ─── Main Send Function ───
export async function sendOutreachEmail(
  params: SendOutreachEmailParams
): Promise<{ success: boolean; emailId?: string; error?: string; rateLimited?: boolean }> {
  // Check rate limit before attempting
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    const waitSec = Math.ceil((rateCheck.retryAfterMs || 60000) / 1000);
    console.warn(
      `[outreach-email] Rate limited. Retry after ${waitSec}s. ` +
        `Limits: ${RATE_LIMIT.perMinute}/min, ${RATE_LIMIT.perHour}/hr`
    );
    return {
      success: false,
      error: `Rate limited — retry after ${waitSec}s`,
      rateLimited: true,
    };
  }

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

  // Build email content
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

  // Send with retry
  let lastError = "";
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(
          RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt - 1),
          RETRY_CONFIG.maxDelayMs
        );
        console.log(
          `[outreach-email] Retry ${attempt}/${RETRY_CONFIG.maxRetries} for ${to} after ${delay}ms`
        );
        await sleep(delay);

        // Re-check rate limit before retry
        const retryRateCheck = checkRateLimit();
        if (!retryRateCheck.allowed) {
          lastError = "Rate limited during retry";
          continue;
        }
      }

      const result = await resend.emails.send({
        from: FROM_ADDRESS,
        to,
        subject,
        html,
      });

      if (result.error) {
        lastError = result.error.message;
        console.error(
          `[outreach-email] Attempt ${attempt + 1} failed for ${type} to ${to}:`,
          result.error
        );

        if (!isRetryableError(lastError)) {
          // Non-retryable error, bail immediately
          return { success: false, error: lastError };
        }
        continue;
      }

      // Success — record the send for rate limiting
      recordSend();
      console.log(
        `[outreach-email] Sent ${type} email to ${to} for ${domain}` +
          (attempt > 0 ? ` (after ${attempt} retries)` : "")
      );
      return {
        success: true,
        emailId: result.data?.id,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(
        `[outreach-email] Attempt ${attempt + 1} exception for ${type} to ${to}:`,
        lastError
      );

      if (!isRetryableError(lastError)) {
        return { success: false, error: lastError };
      }
    }
  }

  console.error(
    `[outreach-email] All ${RETRY_CONFIG.maxRetries + 1} attempts failed for ${type} to ${to}`
  );
  return {
    success: false,
    error: `Failed after ${RETRY_CONFIG.maxRetries + 1} attempts: ${lastError}`,
  };
}
