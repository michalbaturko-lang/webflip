import { createServerClient } from "@/lib/supabase";
import { sendOutreachEmail } from "@/lib/outreach-email";
import type { OutreachSequenceStep, OutreachSequence } from "@/types/outreach";
import type { CrmRecord, CrmActivity } from "@/types/admin";

export interface ProcessingResult {
  record_id: string;
  domain: string;
  step_number: number;
  channel: string;
  success: boolean;
  error?: string;
}

export interface SequenceRunSummary {
  processed: number;
  emails_sent: number;
  linkedin_tasks_created: number;
  skipped: number;
  errors: number;
  results: ProcessingResult[];
}

/**
 * Process all pending outreach sequence steps
 * Handles batch processing with limits to avoid timeouts
 */
export async function processOutreachSequences(options?: {
  maxRecords?: number;
  maxEmails?: number;
  sequenceId?: string;
}): Promise<SequenceRunSummary> {
  const maxRecords = options?.maxRecords ?? 100;
  const maxEmails = options?.maxEmails ?? 50;
  const db = createServerClient();

  const summary: SequenceRunSummary = {
    processed: 0,
    emails_sent: 0,
    linkedin_tasks_created: 0,
    skipped: 0,
    errors: 0,
    results: [],
  };

  try {
    // Fetch all active sequences
    let sequencesQuery = db
      .from("outreach_sequences")
      .select("*")
      .eq("is_active", true);

    if (options?.sequenceId) {
      sequencesQuery = sequencesQuery.eq("id", options.sequenceId);
    }

    const { data: sequences, error: seqError } = await sequencesQuery;

    if (seqError) {
      console.error("[sequence-engine] Failed to fetch sequences:", seqError);
      return summary;
    }

    if (!sequences || sequences.length === 0) {
      console.log("[sequence-engine] No active sequences found");
      return summary;
    }

    const now = new Date();
    const recordsToProcess: Array<{
      record: CrmRecord;
      sequence: OutreachSequence;
      step: OutreachSequenceStep;
    }> = [];

    // Collect all pending records across all sequences
    for (const sequence of sequences as OutreachSequence[]) {
      // Get records enrolled in this sequence
      const { data: records, error: recordsError } = await db
        .from("crm_records")
        .select("*")
        .eq("outreach_sequence_id", sequence.id)
        .not("outreach_sequence_id", "is", null)
        .limit(maxRecords);

      if (recordsError) {
        console.error(
          `[sequence-engine] Failed to fetch records for sequence ${sequence.id}:`,
          recordsError
        );
        continue;
      }

      for (const record of records || []) {
        const crmRecord = record as CrmRecord;

        // Skip if record has reached end of sequence
        if (crmRecord.outreach_sequence_step >= sequence.steps.length) {
          continue;
        }

        // Skip excluded stages
        if (["paid", "churned", "lost"].includes(crmRecord.stage)) {
          summary.skipped++;
          continue;
        }

        const currentStep = sequence.steps[crmRecord.outreach_sequence_step];
        if (!currentStep) continue;

        // Check if delay has elapsed
        let referenceDate = crmRecord.created_at;
        if (crmRecord.last_contact_date) {
          referenceDate = crmRecord.last_contact_date;
        }

        const lastContact = new Date(referenceDate);
        const nextDueDate = new Date(lastContact.getTime() + currentStep.delay_days * 86400000);

        if (nextDueDate <= now) {
          recordsToProcess.push({
            record: crmRecord,
            sequence,
            step: currentStep,
          });
        }
      }
    }

    // Limit to maxRecords
    const toProcess = recordsToProcess.slice(0, maxRecords);
    let emailsSent = 0;

    // Process each record
    for (const { record, sequence, step } of toProcess) {
      try {
        // Check step conditions
        if (shouldSkipStep(record, step)) {
          summary.skipped++;
          summary.results.push({
            record_id: record.id,
            domain: record.domain,
            step_number: step.step_number,
            channel: step.channel,
            success: false,
            error: "Skipped due to conditions",
          });
          continue;
        }

        // Process by channel
        if (step.channel === "email") {
          // Check email limit
          if (emailsSent >= maxEmails) {
            console.log(
              `[sequence-engine] Reached email limit (${maxEmails}), stopping email sends`
            );
            break;
          }

          const result = await processEmailStep(record, sequence, step);
          if (result.success) {
            emailsSent++;
            summary.emails_sent++;
          } else {
            summary.errors++;
          }
          summary.results.push(result);
        } else if (step.channel === "linkedin") {
          const result = await processLinkedInStep(record, sequence, step);
          if (result.success) {
            summary.linkedin_tasks_created++;
          } else {
            summary.errors++;
          }
          summary.results.push(result);
        }

        // Advance the sequence step for this record
        await advanceRecordSequenceStep(record.id, step.step_number + 1);
        summary.processed++;
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error(`[sequence-engine] Error processing record ${record.id}:`, err);
        summary.errors++;
        summary.results.push({
          record_id: record.id,
          domain: record.domain,
          step_number: step.step_number,
          channel: step.channel,
          success: false,
          error,
        });
      }
    }

    console.log("[sequence-engine] Run summary:", summary);
    return summary;
  } catch (err) {
    console.error("[sequence-engine] Unexpected error in processOutreachSequences:", err);
    return summary;
  }
}

/**
 * Process an email step for a record
 */
async function processEmailStep(
  record: CrmRecord,
  sequence: OutreachSequence,
  step: OutreachSequenceStep
): Promise<ProcessingResult> {
  const db = createServerClient();

  try {
    if (!record.contact_email) {
      return {
        record_id: record.id,
        domain: record.domain,
        step_number: step.step_number,
        channel: "email",
        success: false,
        error: "No contact email",
      };
    }

    // Map template name to email type
    const emailType = mapTemplateToEmailType(step.template);
    if (!emailType) {
      return {
        record_id: record.id,
        domain: record.domain,
        step_number: step.step_number,
        channel: "email",
        success: false,
        error: `Unknown email template: ${step.template}`,
      };
    }

    // Get landing page URL
    const landingPageUrl = getLandingPageUrl(record);

    // Prepare email parameters
    const emailParams: any = {
      to: record.contact_email,
      type: emailType,
      companyName: record.company_name || record.domain,
      domain: record.domain,
      landingPageUrl,
    };

    // Add type-specific parameters
    if (emailType === "cold_intro") {
      emailParams.suitabilityScore = record.suitability_score || 0;
      emailParams.topIssues = []; // Could be populated from analysis
    } else if (emailType === "final_push") {
      emailParams.expirationDays = 7;
    }

    // Send email via Resend (with built-in retry + rate limiting)
    const sendResult = await sendOutreachEmail(emailParams);

    if (!sendResult.success) {
      // If rate limited, don't advance the step — it will be retried next run
      if ((sendResult as any).rateLimited) {
        console.warn(
          `[sequence-engine] Rate limited for record ${record.id}, will retry next run`
        );
      }
      return {
        record_id: record.id,
        domain: record.domain,
        step_number: step.step_number,
        channel: "email",
        success: false,
        error: sendResult.error || "Failed to send email",
      };
    }

    // Log email in outreach_email_logs
    const now = new Date().toISOString();
    const { error: logError } = await db.from("outreach_email_logs").insert({
      crm_record_id: record.id,
      sequence_id: sequence.id,
      sequence_step: step.step_number,
      template_name: step.template,
      subject: step.subject || "",
      resend_email_id: sendResult.emailId || null,
      status: "sent",
      sent_at: now,
      metadata: {
        suitability_score: record.suitability_score,
      },
    });

    if (logError) {
      console.error(`[sequence-engine] Failed to log email for record ${record.id}:`, logError);
    }

    // Log as CRM activity
    const { error: activityError } = await db.from("crm_activities").insert({
      crm_record_id: record.id,
      type: "email_sent",
      subject: step.subject || step.template,
      body: null,
      sequence_name: sequence.name,
      sequence_step: step.step_number,
    });

    if (activityError) {
      console.error(`[sequence-engine] Failed to log activity for record ${record.id}:`, activityError);
    }

    // Update record stage to 'contacted' if still 'prospect'
    if (record.stage === "prospect") {
      const { error: updateError } = await db
        .from("crm_records")
        .update({ stage: "contacted" })
        .eq("id", record.id);

      if (updateError) {
        console.error(`[sequence-engine] Failed to update stage for record ${record.id}:`, updateError);
      }
    }

    return {
      record_id: record.id,
      domain: record.domain,
      step_number: step.step_number,
      channel: "email",
      success: true,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      record_id: record.id,
      domain: record.domain,
      step_number: step.step_number,
      channel: "email",
      success: false,
      error,
    };
  }
}

/**
 * Process a LinkedIn step for a record
 */
async function processLinkedInStep(
  record: CrmRecord,
  sequence: OutreachSequence,
  step: OutreachSequenceStep
): Promise<ProcessingResult> {
  const db = createServerClient();

  try {
    if (!record.linkedin_url) {
      return {
        record_id: record.id,
        domain: record.domain,
        step_number: step.step_number,
        channel: "linkedin",
        success: false,
        error: "No LinkedIn URL",
      };
    }

    const taskType = step.task_type || "message";
    const now = new Date().toISOString();

    // Create LinkedIn task
    const { data: task, error: taskError } = await db
      .from("linkedin_tasks")
      .insert({
        crm_record_id: record.id,
        task_type: taskType,
        status: "pending",
        template_message: step.template,
        sequence_id: sequence.id,
        sequence_step: step.step_number,
        created_at: now,
      })
      .select()
      .single();

    if (taskError) {
      return {
        record_id: record.id,
        domain: record.domain,
        step_number: step.step_number,
        channel: "linkedin",
        success: false,
        error: taskError.message,
      };
    }

    // Log as CRM activity
    const { error: activityError } = await db.from("crm_activities").insert({
      crm_record_id: record.id,
      type: "linkedin_sent",
      subject: `LinkedIn ${taskType}`,
      body: step.template,
      sequence_name: sequence.name,
      sequence_step: step.step_number,
    });

    if (activityError) {
      console.error(`[sequence-engine] Failed to log LinkedIn activity for record ${record.id}:`, activityError);
    }

    // Update record stage to 'contacted' if still 'prospect'
    if (record.stage === "prospect") {
      const { error: updateError } = await db
        .from("crm_records")
        .update({ stage: "contacted" })
        .eq("id", record.id);

      if (updateError) {
        console.error(`[sequence-engine] Failed to update stage for record ${record.id}:`, updateError);
      }
    }

    return {
      record_id: record.id,
      domain: record.domain,
      step_number: step.step_number,
      channel: "linkedin",
      success: true,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      record_id: record.id,
      domain: record.domain,
      step_number: step.step_number,
      channel: "linkedin",
      success: false,
      error,
    };
  }
}

/**
 * Check if a record should skip this step based on conditions
 */
function shouldSkipStep(record: CrmRecord, step: OutreachSequenceStep): boolean {
  if (!step.conditions) return false;

  if (step.conditions.skip_if_paid && record.stage === "paid") {
    return true;
  }

  if (step.conditions.skip_if_visited && (record.trial_page_views || 0) > 0) {
    return true;
  }

  // skip_if_replied would require checking activities, skip for now
  // as it requires additional query per record
  if (step.conditions.skip_if_replied) {
    // This would need to query crm_activities to check for replies
    // For performance, we can implement this later
    return false;
  }

  return false;
}

/**
 * Map template name to email type for sendOutreachEmail
 */
function mapTemplateToEmailType(template: string): "cold_intro" | "follow_up" | "final_push" | null {
  const lower = template.toLowerCase();
  if (lower.includes("cold") || lower.includes("intro")) return "cold_intro";
  if (lower.includes("follow")) return "follow_up";
  if (lower.includes("final") || lower.includes("push") || lower.includes("last")) return "final_push";
  return null;
}

/**
 * Get landing page URL for a record
 */
export function getLandingPageUrl(record: CrmRecord): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://webflipper.app";
  const slug = record.company_name
    ? record.company_name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    : record.domain;
  return `${appUrl}/for/${slug || record.domain}`;
}

/**
 * Advance a record to the next sequence step
 */
async function advanceRecordSequenceStep(recordId: string, nextStep: number): Promise<void> {
  const db = createServerClient();
  const now = new Date().toISOString();

  const { error } = await db
    .from("crm_records")
    .update({
      outreach_sequence_step: nextStep,
      last_contact_date: now,
    })
    .eq("id", recordId);

  if (error) {
    throw new Error(`Failed to advance sequence step for record ${recordId}: ${error.message}`);
  }
}
