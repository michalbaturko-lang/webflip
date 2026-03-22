import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { timingSafeEqual } from "crypto";

// Webhook secret for verification — MUST be configured in production
function verifyWebhookSecret(request: NextRequest): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET is not configured");
    return false; // Reject if no secret configured
  }

  // Try header first, then query param
  const provided =
    request.headers.get("x-webhook-secret") ||
    request.nextUrl.searchParams.get("secret");

  if (!provided) return false;
  // Use timing-safe comparison to prevent timing attacks
  try {
    const a = Buffer.from(secret);
    const b = Buffer.from(provided);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

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

export async function POST(request: NextRequest) {
  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as ResendWebhookEvent;
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
    const { data: emailLogs, error: findError } = await supabase
      .from("outreach_email_log")
      .select("*")
      .eq("resend_email_id", emailId)
      .single();

    if (findError || !emailLogs) {
      console.warn(
        `[resend-webhook] Email log not found for resend_email_id: ${emailId}`
      );
      return NextResponse.json(
        { error: "Email log not found" },
        { status: 404 }
      );
    }

    const emailLog = emailLogs;
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
        bounceReason = data.bounce?.diagnostic_code || "bounced";
        break;

      case "email.complained":
        statusToSet = "complained";
        break;

      default:
        console.warn(`[resend-webhook] Unknown event type: ${eventType}`);
        return NextResponse.json({ success: true }, { status: 200 });
    }

    if (!statusToSet) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Update outreach_email_log status
    const updatePayload: Record<string, unknown> = { status: statusToSet };
    if (timestampField && timestampValue) {
      updatePayload[timestampField] = timestampValue;
    }
    if (bounceReason) {
      updatePayload["bounce_reason"] = bounceReason;
    }

    const { error: updateError } = await supabase
      .from("outreach_email_log")
      .update(updatePayload)
      .eq("id", emailLog.id);

    if (updateError) {
      console.error(`[resend-webhook] Failed to update email log:`, updateError);
      return NextResponse.json(
        { error: "Failed to update email log" },
        { status: 500 }
      );
    }

    // Create crm_activity for opens and clicks
    if (activityType && emailLog.crm_record_id) {
      await supabase.from("crm_activities").insert({
        crm_record_id: emailLog.crm_record_id,
        type: activityType,
        subject: emailLog.subject,
        metadata: {
          webhook_source: "resend",
          event_type: eventType,
          email_id: emailId,
        },
      });
    }

    // Handle bounces: mark CRM email as invalid and add tag
    if (eventType === "email.bounced" && emailLog.crm_record_id) {
      const { data: record } = await supabase
        .from("crm_records")
        .select("tags")
        .eq("id", emailLog.crm_record_id)
        .single();

      if (record) {
        const tags = record.tags || [];
        if (!tags.includes("bounced")) {
          tags.push("bounced");
          await supabase
            .from("crm_records")
            .update({ tags })
            .eq("id", emailLog.crm_record_id);
        }
      }

      // Log bounce activity
      await supabase.from("crm_activities").insert({
        crm_record_id: emailLog.crm_record_id,
        type: "email_opened",
        subject: emailLog.subject,
        metadata: {
          webhook_source: "resend",
          event_type: "email.bounced",
          email_id: emailId,
          bounce_reason: bounceReason,
        },
      });
    }

    // Handle complaints: add unsubscribed tag and stop sequences
    if (eventType === "email.complained" && emailLog.crm_record_id) {
      const { data: record } = await supabase
        .from("crm_records")
        .select("tags, outreach_sequence_id")
        .eq("id", emailLog.crm_record_id)
        .single();

      if (record) {
        const tags = record.tags || [];
        if (!tags.includes("unsubscribed")) {
          tags.push("unsubscribed");
          await supabase
            .from("crm_records")
            .update({ tags, outreach_sequence_id: null })
            .eq("id", emailLog.crm_record_id);
        }
      }

      // Log complaint activity
      await supabase.from("crm_activities").insert({
        crm_record_id: emailLog.crm_record_id,
        type: "email_opened",
        subject: emailLog.subject,
        metadata: {
          webhook_source: "resend",
          event_type: "email.complained",
          email_id: emailId,
        },
      });
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
    // Do not leak internal error details to the client
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Support GET for webhook verification
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
