import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// Webhook secret for verification
function verifyWebhookSecret(request: NextRequest): boolean {
  const secret = process.env.PHANTOMBUSTER_WEBHOOK_SECRET;
  if (!secret) return true; // No secret configured = accept all (dev mode)
  const provided =
    request.headers.get("x-webhook-secret") ||
    request.nextUrl.searchParams.get("secret");
  return provided === secret;
}

export async function POST(request: NextRequest) {
  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const supabase = createServerClient();

    // Phantombuster/Dripify/Roger webhook payload
    // Support multiple formats
    const event = body.event || body.type || body.action;
    const linkedinUrl =
      body.linkedin_url || body.profileUrl || body.linkedInUrl;
    const email = body.email || body.contact_email;
    const message = body.message || body.messageText;

    if (!event) {
      return NextResponse.json(
        { error: "Missing event type" },
        { status: 400 }
      );
    }

    // Find CRM record by LinkedIn URL or email
    let record = null;
    if (linkedinUrl) {
      const { data } = await supabase
        .from("crm_records")
        .select("*")
        .eq("linkedin_url", linkedinUrl)
        .single();
      record = data;
    }
    if (!record && email) {
      const { data } = await supabase
        .from("crm_records")
        .select("*")
        .eq("contact_email", email)
        .single();
      record = data;
    }

    if (!record) {
      return NextResponse.json(
        { error: "Contact not found", linkedin_url: linkedinUrl, email },
        { status: 404 }
      );
    }

    // Map webhook event to activity type
    const eventMap: Record<string, string> = {
      connection_sent: "linkedin_sent",
      connection_request: "linkedin_sent",
      connection_accepted: "linkedin_accepted",
      accepted: "linkedin_accepted",
      message_sent: "linkedin_sent",
      message_replied: "linkedin_replied",
      replied: "linkedin_replied",
      reply: "linkedin_replied",
    };

    const activityType = eventMap[event] || "linkedin_sent";

    // Log activity
    await supabase.from("crm_activities").insert({
      crm_record_id: record.id,
      type: activityType,
      subject: `LinkedIn: ${event}`,
      body: message || null,
      metadata: {
        webhook_source: "phantombuster",
        raw_event: event,
        linkedin_url: linkedinUrl,
        ...body,
      },
    });

    // Auto-advance stage based on event
    const stageAdvance: Record<string, string> = {
      linkedin_accepted: "engaged",
      linkedin_replied: "engaged",
    };

    const newStage = stageAdvance[activityType];
    if (
      newStage &&
      (record.stage === "prospect" || record.stage === "contacted")
    ) {
      await supabase
        .from("crm_records")
        .update({
          stage: newStage,
          last_contact_date: new Date().toISOString(),
        })
        .eq("id", record.id);
    }

    // If connection accepted, complete any pending LinkedIn tasks
    if (activityType === "linkedin_accepted") {
      await supabase
        .from("linkedin_tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("crm_record_id", record.id)
        .eq("task_type", "connection_request")
        .eq("status", "pending");
    }

    return NextResponse.json({
      success: true,
      record_id: record.id,
      activity_type: activityType,
      stage_updated: !!newStage,
    });
  } catch (err) {
    console.error("POST /api/webhooks/phantombuster error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}

// Also support GET for webhook verification (some services send a verification request)
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get("challenge");
  if (challenge) {
    return NextResponse.json({ challenge });
  }
  return NextResponse.json({
    status: "ok",
    service: "webflipper-phantombuster-webhook",
  });
}
