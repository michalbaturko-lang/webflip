import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase";
import { sendOutreachEmail } from "@/lib/outreach-email";
import {
  getVideoTemplateVars,
  processVideoPlaceholders,
} from "@/lib/outreach/video-integration";
import { getLandingPageUrl } from "@/lib/outreach/sequence-engine";

export async function POST(request: NextRequest) {
  try {
    const authError = requireAdmin(request);
    if (authError) return authError;

    const body = await request.json();
    const { record_ids, sequence_id, step_number } = body;

    // Validate input: either record_ids or (sequence_id + step_number)
    if (!record_ids && (!sequence_id || step_number === undefined)) {
      return NextResponse.json(
        {
          error:
            "Either record_ids array or (sequence_id and step_number) are required",
        },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    let targetRecordIds: string[] = [];

    // If sequence_id and step_number provided, fetch matching records
    if (sequence_id && step_number !== undefined) {
      const { data: records, error: recordError } = await supabase
        .from("crm_records")
        .select("id")
        .eq("outreach_sequence_id", sequence_id)
        .eq("outreach_sequence_step", step_number);

      if (recordError)
        throw new Error(`Failed to fetch records: ${recordError.message}`);

      targetRecordIds = (records || []).map((r: any) => r.id);
    } else {
      targetRecordIds = record_ids || [];
    }

    if (targetRecordIds.length === 0) {
      return NextResponse.json(
        { error: "No records found matching criteria" },
        { status: 400 }
      );
    }

    // Fetch records with their sequence info
    const { data: records, error: recordError } = await supabase
      .from("crm_records")
      .select(
        "id, outreach_sequence_id, outreach_sequence_step, contact_email, linkedin_url, company_name, domain, suitability_score, stage, tags"
      )
      .in("id", targetRecordIds);

    if (recordError) throw new Error(`Failed to fetch records: ${recordError.message}`);

    // Get sequence details
    const sequenceIds = [
      ...new Set((records || []).map((r: any) => r.outreach_sequence_id).filter(Boolean)),
    ];

    const { data: sequences, error: seqError } = await supabase
      .from("outreach_sequences")
      .select("id, name, steps");

    if (seqError) throw new Error(`Failed to fetch sequences: ${seqError.message}`);

    const seqMap: Record<string, any> = {};
    (sequences || []).forEach((seq: any) => {
      seqMap[seq.id] = seq;
    });

    const results: any[] = [];
    const now = new Date().toISOString();

    // Process each record
    for (const record of records || []) {
      try {
        if (!record.outreach_sequence_id) {
          results.push({
            record_id: record.id,
            status: "skipped",
            reason: "No sequence enrolled",
          });
          continue;
        }

        const seq = seqMap[record.outreach_sequence_id];
        if (!seq) {
          results.push({
            record_id: record.id,
            status: "skipped",
            reason: "Sequence not found",
          });
          continue;
        }

        const currentStep = record.outreach_sequence_step || 0;
        const nextStep = seq.steps.find((s: any) => s.step_number === currentStep + 1);

        if (!nextStep) {
          results.push({
            record_id: record.id,
            status: "skipped",
            reason: "No next step in sequence",
          });
          continue;
        }

        let stepExecuted = false;

        // Execute email step
        if (nextStep.channel === "email") {
          if (!record.contact_email) {
            results.push({
              record_id: record.id,
              status: "failed",
              reason: "No contact email",
            });
            continue;
          }

          // Skip bounced or unsubscribed contacts
          const tags: string[] = record.tags || [];
          if (tags.includes("bounced") || tags.includes("unsubscribed")) {
            results.push({
              record_id: record.id,
              status: "skipped",
              reason: "Contact is bounced or unsubscribed",
            });
            continue;
          }

          // Map template name to email type
          const templateLower = (nextStep.template || "").toLowerCase();
          let emailType: "cold_intro" | "follow_up" | "final_push" = "cold_intro";
          if (templateLower.includes("follow")) emailType = "follow_up";
          else if (templateLower.includes("final") || templateLower.includes("push") || templateLower.includes("last")) emailType = "final_push";

          const companyName = record.company_name || record.domain;
          const landingPageUrl = getLandingPageUrl(record as any);

          // Build email params
          const emailParams: any = {
            to: record.contact_email,
            type: emailType,
            companyName,
            domain: record.domain,
            landingPageUrl,
          };

          if (emailType === "cold_intro") {
            emailParams.suitabilityScore = record.suitability_score || 75;
            emailParams.topIssues = ["Zastaralý design webu", "Nízké skóre výkonu", "Chybějící mobilní optimalizace"];
          } else if (emailType === "final_push") {
            emailParams.expirationDays = 7;
          }

          // Actually send the email via Resend
          const sendResult = await sendOutreachEmail(emailParams);

          if (!sendResult.success) {
            results.push({
              record_id: record.id,
              status: "failed",
              reason: sendResult.error || "Failed to send email",
            });
            continue;
          }

          // Inject video template variables if available
          const videoVars = await getVideoTemplateVars(record.id);

          // Log to outreach_email_logs
          const { error: emailLogError } = await supabase
            .from("outreach_email_logs")
            .insert({
              crm_record_id: record.id,
              sequence_id: record.outreach_sequence_id,
              sequence_step: nextStep.step_number,
              template_name: nextStep.template,
              subject: nextStep.subject || "",
              resend_email_id: sendResult.emailId || null,
              status: "sent",
              sent_at: now,
              metadata: {
                channel: "sequence",
                step: nextStep.step_number,
                has_video: !!videoVars,
                video_url: videoVars?.video_url ?? null,
              },
            });

          if (emailLogError) {
            console.error(`[outreach/execute] Failed to log email for record ${record.id}:`, emailLogError);
          }

          // Create activity log
          await supabase.from("crm_activities").insert({
            crm_record_id: record.id,
            type: "email_sent",
            subject: nextStep.subject,
            sequence_name: seq.name || null,
            sequence_step: nextStep.step_number,
          });

          // Update stage if still prospect
          if (record.stage === "prospect") {
            await supabase
              .from("crm_records")
              .update({ stage: "contacted" })
              .eq("id", record.id);
          }

          stepExecuted = true;
        }

        // Execute LinkedIn step
        if (nextStep.channel === "linkedin") {
          if (!record.linkedin_url) {
            results.push({
              record_id: record.id,
              status: "failed",
              reason: "No LinkedIn URL",
            });
            continue;
          }

          // Create LinkedIn task
          const { error: liTaskError } = await supabase
            .from("linkedin_tasks")
            .insert({
              crm_record_id: record.id,
              task_type: nextStep.task_type,
              template_message: nextStep.template,
              status: "pending",
              sequence_id: record.outreach_sequence_id,
              sequence_step: nextStep.step_number,
            });

          if (!liTaskError) {
            stepExecuted = true;
          } else {
            results.push({
              record_id: record.id,
              status: "failed",
              reason: liTaskError.message,
            });
            continue;
          }
        }

        // If step was executed, advance the sequence step
        if (stepExecuted) {
          const { error: updateError } = await supabase
            .from("crm_records")
            .update({
              outreach_sequence_step: nextStep.step_number,
              last_contact_date: now,
            })
            .eq("id", record.id);

          if (!updateError) {
            results.push({
              record_id: record.id,
              status: "executed",
              step: nextStep.step_number,
              channel: nextStep.channel,
            });
          } else {
            results.push({
              record_id: record.id,
              status: "failed",
              reason: updateError.message,
            });
          }
        }
      } catch (recordErr) {
        const msg =
          recordErr instanceof Error ? recordErr.message : "Unknown error";
        results.push({
          record_id: record.id,
          status: "error",
          reason: msg,
        });
      }
    }

    const successCount = results.filter((r) => r.status === "executed").length;

    return NextResponse.json({
      executed: successCount,
      total: results.length,
      results,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("POST /api/admin/outreach/execute error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
