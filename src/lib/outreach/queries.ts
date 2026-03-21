import { createServerClient } from "@/lib/supabase";
import type {
  OutreachSequence,
  LinkedInTask,
  OutreachEmailLog,
  DailyOutreachStats,
} from "@/types/outreach";
import type { CrmRecord } from "@/types/admin";

const supabase = () => createServerClient();

// ─── Outreach Sequences ───

export async function createSequence(
  seq: Partial<OutreachSequence>
): Promise<OutreachSequence> {
  const { data, error } = await supabase()
    .from("outreach_sequences")
    .insert(seq)
    .select()
    .single();
  if (error) throw new Error(`createSequence: ${error.message}`);
  return data as OutreachSequence;
}

export async function listSequences(): Promise<OutreachSequence[]> {
  const { data, error } = await supabase()
    .from("outreach_sequences")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listSequences: ${error.message}`);
  return (data || []) as OutreachSequence[];
}

export async function getSequence(id: string): Promise<OutreachSequence | null> {
  const { data, error } = await supabase()
    .from("outreach_sequences")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as OutreachSequence;
}

export async function updateSequence(
  id: string,
  updates: Partial<OutreachSequence>
): Promise<OutreachSequence> {
  const { data, error } = await supabase()
    .from("outreach_sequences")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`updateSequence: ${error.message}`);
  return data as OutreachSequence;
}

export async function deleteSequence(id: string): Promise<void> {
  const { error } = await supabase()
    .from("outreach_sequences")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`deleteSequence: ${error.message}`);
}

// ─── Sequence Enrollment ───

export async function enrollInSequence(
  recordIds: string[],
  sequenceId: string
): Promise<number> {
  const { data, error } = await supabase()
    .from("crm_records")
    .update({
      outreach_sequence_id: sequenceId,
      outreach_sequence_step: 0,
    })
    .in("id", recordIds)
    .select("id");
  if (error) throw new Error(`enrollInSequence: ${error.message}`);
  return data?.length || 0;
}

// ─── Pending Steps ───

export async function getPendingOutreachSteps(): Promise<
  {
    record: CrmRecord;
    sequence: OutreachSequence;
    step: any; // OutreachSequenceStep
  }[]
> {
  const db = supabase();

  // Get all records enrolled in sequences
  const { data: records, error: recordsError } = await db
    .from("crm_records")
    .select("*")
    .not("outreach_sequence_id", "is", null);

  if (recordsError)
    throw new Error(`getPendingOutreachSteps records: ${recordsError.message}`);

  const results = [];
  const now = new Date();

  for (const record of records || []) {
    // Get the sequence
    const { data: sequenceData, error: seqError } = await db
      .from("outreach_sequences")
      .select("*")
      .eq("id", record.outreach_sequence_id)
      .single();

    if (seqError || !sequenceData) continue;
    const sequence = sequenceData as OutreachSequence;

    const currentStep = sequence.steps[record.outreach_sequence_step];
    if (!currentStep) continue;

    // Check if delay has elapsed
    const lastContactDate = record.last_contact_date
      ? new Date(record.last_contact_date)
      : new Date(record.created_at);
    const nextDueDate = new Date(
      lastContactDate.getTime() + currentStep.delay_days * 86400000
    );

    if (nextDueDate <= now) {
      results.push({
        record: record as CrmRecord,
        sequence,
        step: currentStep,
      });
    }
  }

  return results;
}

export async function advanceSequenceStep(recordId: string): Promise<void> {
  const now = new Date().toISOString();
  const db = supabase();

  // Fetch current step value first
  const { data: record } = await db
    .from("crm_records")
    .select("outreach_sequence_step")
    .eq("id", recordId)
    .single();

  const currentStep = (record as unknown as Record<string, number>)?.outreach_sequence_step ?? 0;

  const { error } = await db
    .from("crm_records")
    .update({
      outreach_sequence_step: currentStep + 1,
      last_contact_date: now,
    })
    .eq("id", recordId);
  if (error) throw new Error(`advanceSequenceStep: ${error.message}`);
}

// ─── LinkedIn Tasks ───

export async function createLinkedInTask(
  task: Partial<LinkedInTask>
): Promise<LinkedInTask> {
  const { data, error } = await supabase()
    .from("linkedin_tasks")
    .insert(task)
    .select()
    .single();
  if (error) throw new Error(`createLinkedInTask: ${error.message}`);
  return data as LinkedInTask;
}

export async function listLinkedInTasks(params: {
  status?: string;
  assigned_to?: string;
  limit?: number;
}): Promise<LinkedInTask[]> {
  let query = supabase()
    .from("linkedin_tasks")
    .select("*");

  if (params.status) query = query.eq("status", params.status);
  if (params.assigned_to) query = query.eq("assigned_to", params.assigned_to);
  const limit = params.limit || 50;
  query = query.limit(limit);
  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw new Error(`listLinkedInTasks: ${error.message}`);
  return (data || []) as LinkedInTask[];
}

export async function completeLinkedInTask(
  taskId: string,
  actualMessage?: string
): Promise<LinkedInTask> {
  const now = new Date().toISOString();
  const { data, error } = await supabase()
    .from("linkedin_tasks")
    .update({
      status: "completed",
      actual_message: actualMessage || null,
      completed_at: now,
    })
    .eq("id", taskId)
    .select()
    .single();
  if (error) throw new Error(`completeLinkedInTask: ${error.message}`);
  return data as LinkedInTask;
}

// ─── Email Logs ───

export async function logOutreachEmail(
  log: Partial<OutreachEmailLog>
): Promise<OutreachEmailLog> {
  const { data, error } = await supabase()
    .from("outreach_email_logs")
    .insert(log)
    .select()
    .single();
  if (error) throw new Error(`logOutreachEmail: ${error.message}`);
  return data as OutreachEmailLog;
}

// ─── Daily Stats ───

export async function getDailyOutreachStats(): Promise<DailyOutreachStats> {
  const db = supabase();
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

  const [
    pendingEmailsRes,
    sentTodayRes,
    pendingLinkedInRes,
    completedLinkedInRes,
    openedRes,
    clickedRes,
  ] = await Promise.all([
    // Pending emails (not yet sent)
    db
      .from("outreach_email_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent"),
    // Sent today
    db
      .from("outreach_email_logs")
      .select("id", { count: "exact", head: true })
      .gte("sent_at", todayStart),
    // Pending LinkedIn tasks
    db
      .from("linkedin_tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    // Completed LinkedIn tasks today
    db
      .from("linkedin_tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("completed_at", todayStart),
    // Opened emails (last 7 days)
    db
      .from("outreach_email_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "opened")
      .gte("opened_at", sevenDaysAgo),
    // Clicked emails (last 7 days)
    db
      .from("outreach_email_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "clicked")
      .gte("clicked_at", sevenDaysAgo),
  ]);

  // Calculate total sent in last 7 days
  const { data: sentData, error: sentError } = await db
    .from("outreach_email_logs")
    .select("*")
    .gte("sent_at", sevenDaysAgo);

  if (sentError)
    throw new Error(`getDailyOutreachStats sent: ${sentError.message}`);

  const totalSent7d = sentData?.length || 0;
  const openRate =
    totalSent7d > 0 ? (openedRes.count || 0) / totalSent7d : 0;
  const clickRate =
    totalSent7d > 0 ? (clickedRes.count || 0) / totalSent7d : 0;

  return {
    pending_emails: pendingEmailsRes.count || 0,
    sent_today: sentTodayRes.count || 0,
    pending_linkedin: pendingLinkedInRes.count || 0,
    completed_linkedin_today: completedLinkedInRes.count || 0,
    open_rate_7d: Math.round(openRate * 10000) / 10000,
    click_rate_7d: Math.round(clickRate * 10000) / 10000,
  };
}

// ─── Slug Utilities ───

export function generateSlug(companyName: string, domain: string): string {
  const base =
    companyName && companyName.trim().length > 0 ? companyName : domain;
  return base
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getRecordBySlug(slug: string): Promise<CrmRecord | null> {
  // Try to match against company name slug first, then domain slug
  const { data: records, error } = await supabase()
    .from("crm_records")
    .select("*");

  if (error) return null;

  for (const record of records || []) {
    const companySlug = generateSlug(record.company_name || "", record.domain);
    const domainSlug = generateSlug("", record.domain);
    if (companySlug === slug || domainSlug === slug) {
      return record as CrmRecord;
    }
  }

  return null;
}
