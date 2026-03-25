import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const authError = requireAdmin(request);
    if (authError) return authError;

    const supabase = createServerClient();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    // Get records enrolled in sequences with full details for UI
    const { data: pendingEmailRecords, error: emailError } = await supabase
      .from("crm_records")
      .select("id, outreach_sequence_id, outreach_sequence_step, company_name, domain, first_contact_date, last_contact_date, created_at, tags")
      .not("outreach_sequence_id", "is", null);

    if (emailError) throw new Error(`Failed to fetch email pending: ${emailError.message}`);

    // Filter to those with next email step ready
    let pendingEmailTasks: any[] = [];
    if (pendingEmailRecords) {
      const sequenceIds = [
        ...new Set((pendingEmailRecords || []).map((r: any) => r.outreach_sequence_id)),
      ];

      if (sequenceIds.length > 0) {
        const { data: sequences, error: seqError } = await supabase
          .from("outreach_sequences")
          .select("id, name, steps")
          .in("id", sequenceIds);

        if (seqError) throw new Error(`Failed to fetch sequences: ${seqError.message}`);

        const seqMap: Record<string, any> = {};
        (sequences || []).forEach((seq: any) => {
          seqMap[seq.id] = seq;
        });

        // Check which records are due for next email step
        pendingEmailTasks = (pendingEmailRecords || [])
          .filter((record: any) => {
            const seq = seqMap[record.outreach_sequence_id];
            if (!seq) return false;

            // Skip bounced/unsubscribed
            const tags: string[] = record.tags || [];
            if (tags.includes("bounced") || tags.includes("unsubscribed")) return false;

            // outreach_sequence_step = last completed step (0 = none)
            const completedStep = record.outreach_sequence_step || 0;
            const nextStep = seq.steps.find((s: any) => s.step_number === completedStep + 1);

            if (!nextStep || nextStep.channel !== "email") return false;

            // Use last_contact_date for delay calculation (falls back to created_at)
            const referenceDate = record.last_contact_date || record.first_contact_date || record.created_at;
            if (!referenceDate) return false;

            const lastContact = new Date(referenceDate);
            const dueDate = new Date(
              lastContact.getTime() + nextStep.delay_days * 24 * 60 * 60 * 1000
            );

            return dueDate <= now;
          })
          .map((record: any) => {
            const seq = seqMap[record.outreach_sequence_id];
            const completedStep = record.outreach_sequence_step || 0;
            const nextStep = seq?.steps.find((s: any) => s.step_number === completedStep + 1);

            return {
              record_id: record.id,
              company_name: record.company_name,
              domain: record.domain,
              sequence_id: record.outreach_sequence_id,
              sequence_name: seq?.name || "Unknown",
              current_step: completedStep,
              template: nextStep?.template || "",
              subject: nextStep?.subject || "",
              first_contact_date: record.last_contact_date || record.first_contact_date || record.created_at,
            };
          });
      }
    }

    // Get pending LinkedIn tasks
    const { data: pendingLinkedInTasks, error: liError } = await supabase
      .from("linkedin_tasks")
      .select("*")
      .eq("status", "pending");

    if (liError) throw new Error(`Failed to fetch LinkedIn tasks: ${liError.message}`);

    // Get today's stats
    const { data: emailsToday, error: emailTodayError } = await supabase
      .from("outreach_email_logs")
      .select("id", { count: "exact" })
      .gte("sent_at", todayStart);

    if (emailTodayError) throw new Error(`Failed to fetch today's emails: ${emailTodayError.message}`);

    const { data: linkedinToday, error: liTodayError } = await supabase
      .from("linkedin_tasks")
      .select("id", { count: "exact" })
      .eq("status", "completed")
      .gte("created_at", todayStart);

    if (liTodayError) throw new Error(`Failed to fetch LinkedIn today: ${liTodayError.message}`);

    const { data: visitsToday, error: visitsError } = await supabase
      .from("crm_activities")
      .select("id", { count: "exact" })
      .eq("type", "website_visit")
      .gte("created_at", todayStart);

    if (visitsError) throw new Error(`Failed to fetch visits today: ${visitsError.message}`);

    // Get sequence stats
    const { data: allSequences, error: allSeqError } = await supabase
      .from("outreach_sequences")
      .select("id, name");

    if (allSeqError) throw new Error(`Failed to fetch all sequences: ${allSeqError.message}`);

    const sequenceStats: any[] = [];
    for (const sequence of allSequences || []) {
      const { data: enrolled, error: enrolledError } = await supabase
        .from("crm_records")
        .select("outreach_sequence_step", { count: "exact" })
        .eq("outreach_sequence_id", sequence.id);

      if (enrolledError) throw new Error(`Failed to fetch enrollment: ${enrolledError.message}`);

      // Count by step
      const stepCounts: Record<number, number> = {};
      (enrolled || []).forEach((record: any) => {
        const step = record.outreach_sequence_step || 0;
        stepCounts[step] = (stepCounts[step] || 0) + 1;
      });

      sequenceStats.push({
        sequence_id: sequence.id,
        sequence_name: sequence.name,
        total_enrolled: enrolled?.length || 0,
        step_counts: stepCounts,
      });
    }

    return NextResponse.json({
      pending_email_tasks: pendingEmailTasks,
      pending_linkedin_tasks: pendingLinkedInTasks || [],
      today_stats: {
        emails_sent: emailsToday?.length || 0,
        linkedin_completed: linkedinToday?.length || 0,
        new_visits: visitsToday?.length || 0,
      },
      sequence_stats: sequenceStats,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("GET /api/admin/outreach/daily error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
