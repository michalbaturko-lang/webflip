import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { CrmRecord } from "@/types/admin";
import type { OutreachSequence, OutreachEmailLog } from "@/types/outreach";

const supabase = () => createServerClient();

interface AnalyticsResponse {
  overview: {
    total_records: number;
    total_contacted: number;
    total_engaged: number;
    total_paid: number;
    conversion_rate: number;
  };
  funnel: {
    stage: string;
    count: number;
    percentage: number;
  }[];
  sequences: {
    sequence_id: string;
    name: string;
    enrolled: number;
    completed: number;
    conversion_rate: number;
    avg_time_to_engage_days: number;
  }[];
  channels: {
    email: {
      sent: number;
      opened: number;
      clicked: number;
      conversions: number;
    };
    linkedin: {
      sent: number;
      accepted: number;
      replied: number;
      conversions: number;
    };
  };
  timeline: {
    date: string;
    new_contacts: number;
    emails_sent: number;
    visits: number;
    payments: number;
  }[];
}

export async function GET(): Promise<NextResponse<AnalyticsResponse | { error: string }>> {
  try {
    const db = supabase();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    // ─── Overview ───
    const [
      totalRecordsRes,
      contactedRes,
      engagedRes,
      paidRes,
    ] = await Promise.all([
      db.from("crm_records").select("id", { count: "exact", head: true }),
      db.from("crm_records").select("id", { count: "exact", head: true })
        .in("stage", ["contacted", "engaged", "trial_started", "trial_active", "card_added", "paid"]),
      db.from("crm_records").select("id", { count: "exact", head: true })
        .in("stage", ["engaged", "trial_started", "trial_active", "card_added", "paid"]),
      db.from("crm_records").select("id", { count: "exact", head: true })
        .eq("stage", "paid"),
    ]);

    const totalRecords = totalRecordsRes.count || 0;
    const totalContacted = contactedRes.count || 0;
    const totalEngaged = engagedRes.count || 0;
    const totalPaid = paidRes.count || 0;
    const conversionRate = totalContacted > 0 ? totalPaid / totalContacted : 0;

    // ─── Funnel ───
    const { data: funnelData } = await db.from("crm_records").select("stage");
    const stageCounts: Record<string, number> = {};
    for (const record of (funnelData || []) as CrmRecord[]) {
      stageCounts[record.stage] = (stageCounts[record.stage] || 0) + 1;
    }
    const funnel = Object.entries(stageCounts).map(([stage, count]) => ({
      stage,
      count,
      percentage: totalRecords > 0 ? Math.round((count / totalRecords) * 100) : 0,
    }));

    // ─── Sequences ───
    const { data: sequences } = await db.from("outreach_sequences").select("*");
    const sequenceStats = [];

    for (const seq of (sequences || []) as OutreachSequence[]) {
      // Enrolled = records with this sequence_id
      const { count: enrolledCount } = await db
        .from("crm_records")
        .select("id", { count: "exact", head: true })
        .eq("outreach_sequence_id", seq.id);

      // Completed = records that reached end of sequence or converted
      const { data: enrolledRecords } = await db
        .from("crm_records")
        .select("id, created_at, paid_date")
        .eq("outreach_sequence_id", seq.id);

      const completedRecords = ((enrolledRecords || []) as CrmRecord[]).filter(
        (r) => r.outreach_sequence_step >= seq.steps.length || r.paid_date
      );

      const enrolled = enrolledCount || 0;
      const completed = completedRecords.length;
      const conversionRate = enrolled > 0 ? completed / enrolled : 0;

      // Average time to engage
      const engagingRecords = enrolledRecords?.filter((r) => r.paid_date);
      let avgTimeToEngage = 0;
      if (engagingRecords && engagingRecords.length > 0) {
        const totalDays = engagingRecords.reduce((sum, r) => {
          const created = new Date(r.created_at).getTime();
          const paid = new Date(r.paid_date!).getTime();
          return sum + (paid - created) / 86400000;
        }, 0);
        avgTimeToEngage = Math.round(totalDays / engagingRecords.length);
      }

      sequenceStats.push({
        sequence_id: seq.id,
        name: seq.name,
        enrolled,
        completed,
        conversion_rate: Math.round(conversionRate * 10000) / 10000,
        avg_time_to_engage_days: avgTimeToEngage,
      });
    }

    // ─── Channels ───
    // Email
    const [emailSentRes, emailOpenedRes, emailClickedRes] = await Promise.all([
      db.from("outreach_email_logs").select("id", { count: "exact", head: true })
        .in("status", ["sent", "delivered", "opened", "clicked"]),
      db.from("outreach_email_logs").select("id", { count: "exact", head: true })
        .in("status", ["opened", "clicked"]),
      db.from("outreach_email_logs").select("id", { count: "exact", head: true })
        .eq("status", "clicked"),
    ]);

    // Email conversions = records that paid and have email logs
    const { data: emailConversionData } = await db
      .from("crm_records")
      .select("id")
      .eq("stage", "paid");
    const emailConversions = (emailConversionData || []).length;

    // LinkedIn
    const [linkedinSentRes, linkedinAcceptedRes, linkedinRepliedRes] = await Promise.all([
      db.from("crm_activities").select("id", { count: "exact", head: true })
        .eq("type", "linkedin_sent"),
      db.from("crm_activities").select("id", { count: "exact", head: true })
        .eq("type", "linkedin_accepted"),
      db.from("crm_activities").select("id", { count: "exact", head: true })
        .eq("type", "linkedin_replied"),
    ]);

    const channels = {
      email: {
        sent: emailSentRes.count || 0,
        opened: emailOpenedRes.count || 0,
        clicked: emailClickedRes.count || 0,
        conversions: emailConversions,
      },
      linkedin: {
        sent: linkedinSentRes.count || 0,
        accepted: linkedinAcceptedRes.count || 0,
        replied: linkedinRepliedRes.count || 0,
        conversions: 0, // Would need more complex logic
      },
    };

    // ─── Timeline (last 30 days) ───
    const { data: recentRecords } = await db
      .from("crm_records")
      .select("created_at, paid_date")
      .gte("created_at", thirtyDaysAgo.toISOString());

    const { data: emailLogs } = await db
      .from("outreach_email_logs")
      .select("sent_at")
      .gte("sent_at", thirtyDaysAgo.toISOString());

    const { data: activities } = await db
      .from("crm_activities")
      .select("type, created_at")
      .gte("created_at", thirtyDaysAgo.toISOString());

    // Build daily timeline
    const timelineMap: Record<string, { new_contacts: number; emails_sent: number; visits: number; payments: number }> = {};

    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = date.toISOString().split("T")[0];
      timelineMap[dateStr] = { new_contacts: 0, emails_sent: 0, visits: 0, payments: 0 };
    }

    for (const record of (recentRecords || []) as CrmRecord[]) {
      const dateStr = new Date(record.created_at).toISOString().split("T")[0];
      if (timelineMap[dateStr]) {
        timelineMap[dateStr].new_contacts++;
      }
      if (record.paid_date) {
        const paidDateStr = new Date(record.paid_date).toISOString().split("T")[0];
        if (timelineMap[paidDateStr]) {
          timelineMap[paidDateStr].payments++;
        }
      }
    }

    for (const log of (emailLogs || []) as OutreachEmailLog[]) {
      const dateStr = new Date(log.sent_at).toISOString().split("T")[0];
      if (timelineMap[dateStr]) {
        timelineMap[dateStr].emails_sent++;
      }
    }

    for (const activity of (activities || []) as any[]) {
      const dateStr = new Date(activity.created_at).toISOString().split("T")[0];
      if (timelineMap[dateStr] && activity.type === "website_visit") {
        timelineMap[dateStr].visits++;
      }
    }

    const timeline = Object.entries(timelineMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        ...data,
      }));

    return NextResponse.json({
      overview: {
        total_records: totalRecords,
        total_contacted: totalContacted,
        total_engaged: totalEngaged,
        total_paid: totalPaid,
        conversion_rate: Math.round(conversionRate * 10000) / 10000,
      },
      funnel,
      sequences: sequenceStats,
      channels,
      timeline,
    });
  } catch (err) {
    console.error("GET /api/admin/analytics error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
