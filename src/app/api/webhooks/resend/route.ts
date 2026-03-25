import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { Webhook } from "svix";

// ---------------------------------------------------------------------------
// Svix signature verification — Resend signs webhooks via svix
// ---------------------------------------------------------------------------
async function verifyAndParseWebhook(
  request: NextRequest
): Promise<ResendWebhookEvent | null> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET is not configured");
    return null;
  }

  const rawBody = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  // If svix headers are present, verify using svix
  if (svixId && svixTimestamp && svixSignature) {
    try {
      const wh = new Webhook(secret);
      const payload = wh.verify(rawBody, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as ResendWebhookEvent;
      return payload;
    } catch (err) {
      console.error("[resend-webhook] Svix verification failed:", err);
      return null;
    }
  }

  // Fallback: legacy custom header verification (for backwards compat)
  const legacySecret =
    request.headers.get("x-webhook-secret") ||
    new URL(request.url).searchParams.get("secret");
  if (legacySecret === secret) {
    try {
      return JSON.parse(rawBody) as ResendWebhookEvent;
    } catch {
      return null;
    }
  }

  console.warn("[resend-webhook] No valid verification headers found");
  return null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ResendWebhookEvent {
  type: string;
  data: {
    email_id?: string;
    email?: string;
    bounce?: {
      type: string;
      diagnostic_code?: string;
    };
    error?: {
      message: string;
    };
  };
}

// ---------------------------------------------------------------------------
// POST handler — processes Resend webhook events
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const body = await verifyAndParseWebhook(request);
  if (!body) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerClient();
    const eventType = body.type;
    const data = body.data;
    const emailId = data.email_id;

    if (!emailId) {
      return NextResponse.json(
        { error: "Missing email_id" },
        { status: 400 }
      );
    }

    // Find email log by resend_email_id
    const { data: emailLog, error: findError } = await supabase
      .from("outreach_email_logs")
      .select("*")
      .eq("resend_email_id", emailId)
      .single();

    if (findError || !emailLog) {
      console.warn(
        `[resend-webhook] Email log not found for resend_email_id: ${emailId}`
      );
      // Return 200 so Resend doesn't retry — email may not be an outreach email
      return NextResponse.json({ success: true, skipped: true }, { status: 200 });
    }

    let statusToSet: string | null = null;
    let timestampField: string | null = null;
    let timestampValue: string | null = null;
    let activityType: string | null = null;
    let bounceReason: string | null = null;

    // Map webhook event to status and activity type
    switch (eventType) {
      case "email.sent":
        statusToSet = "sent";
        break;

      case "email.delivered":
        statusToSet = "delivered";
        timestampField = "delivered_at";
        timestampValue = new Date().toISOString();
        break;

      case "email.opened":
        statusToSet = "opened";
        timestampField = "opened_at";
        timestampValue = new Date().toISOString();
        activityType = "email_opened";
        break;

      case "email.clicked":
        statusToSet = "clicked";
        timestampField = "clicked_at";
        timestampValue = new Date().toISOString();
        activityType = "email_clicked";
        break;

      case "email.bounced":
        statusToSet = "bounced";
        timestampField = "bounced_at";
        timestampValue = new Date().toISOString();
        activityType = "email_bounced";
        bounceReason = data.bounce?.diagnostic_code || "bounced";
        break;

      case "email.complained":
        statusToSet = "complained";
        activityType = "email_complained";
        break;

      default:
        console.warn(`[resend-webhook] Unknown event type: ${eventType}`);
        return NextResponse.json({ success: true }, { status: 200 });
    }

    if (!statusToSet) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Update outreach_email_logs status
    const updatePayload: Record<string, unknown> = { status: statusToSet };
    if (timestampField && timestampValue) {
      updatePayload[timestampField] = timestampValue;
    }
    if (bounceReason) {
      updatePayload["bounce_reason"] = bounceReason;
    }

    const { error: updateError } = await supabase
      .from("outreach_email_logs")
      .update(updatePayload)
      .eq("id", emailLog.id);

    if (updateError) {
      console.error(`[resend-webhook] Failed to update email log:`, updateError);
      return NextResponse.json(
        { error: "Failed to update email log" },
        { status: 500 }
      );
    }

    // Create crm_activity for engagement events
    if (activityType && emailLog.crm_record_id) {
      await supabase.from("crm_activities").insert({
        crm_record_id: emailLog.crm_record_id,
        type: activityType,
        subject: emailLog.subject,
        metadata: {
          webhook_source: "resend",
          event_type: eventType,
          email_id: emailId,
          ...(bounceReason ? { bounce_reason: bounceReason } : {}),
        },
      });
    }

    // Handle bounces: tag CRM record
    if (eventType === "email.bounced" && emailLog.crm_record_id) {
      const { data: record } = await supabase
        .from("crm_records")
        .select("tags")
        .eq("id", emailLog.crm_record_id)
        .single();

      if (record) {
        const tags: string[] = record.tags || [];
        if (!tags.includes("bounced")) {
          tags.push("bounced");
          await supabase
            .from("crm_records")
            .update({ tags })
            .eq("id", emailLog.crm_record_id);
        }
      }
    }

    // Handle complaints: unsubscribe + stop sequences
    if (eventType === "email.complained" && emailLog.crm_record_id) {
      const { data: record } = await supabase
        .from("crm_records")
        .select("tags, outreach_sequence_id")
        .eq("id", emailLog.crm_record_id)
        .single();

      if (record) {
        const tags: string[] = record.tags || [];
        if (!tags.includes("unsubscribed")) {
          tags.push("unsubscribed");
          await supabase
            .from("crm_records")
            .update({ tags, outreach_sequence_id: null })
            .eq("id", emailLog.crm_record_id);
        }
      }
    }

    console.log(
      `[resend-webhook] Processed ${eventType} for email log ${emailLog.id}`
    );

    return NextResponse.json({
      success: true,
      email_log_id: emailLog.id,
      event_type: eventType,
      status_updated: statusToSet,
    });
  } catch (err) {
    console.error("[resend-webhook] POST error:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Support GET for webhook verification / health check
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get("challenge");
  if (challenge) {
    return NextResponse.json({ challenge });
  }
  return NextResponse.json({
    status: "ok",
    service: "webflipper-resend-webhook",
  });
}
