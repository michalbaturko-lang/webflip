import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin/auth";

export async function GET(request: NextRequest) {
  // Auth check
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const supabase = createServerClient();

    // Get all email stats
    const { data: emailLogs, error: logsError } = await supabase
      .from("outreach_email_logs")
      .select("*");

    if (logsError || !emailLogs) {
      throw new Error(`Failed to fetch email logs: ${logsError?.message}`);
    }

    // Calculate totals by status
    const totals = {
      sent: emailLogs.filter((e) => e.status === "sent").length,
      delivered: emailLogs.filter((e) => e.status === "delivered").length,
      opened: emailLogs.filter((e) => e.status === "opened").length,
      clicked: emailLogs.filter((e) => e.status === "clicked").length,
      bounced: emailLogs.filter((e) => e.status === "bounced").length,
      complained: emailLogs.filter((e) => e.status === "complained").length,
    };

    const totalSent = totals.sent + totals.delivered + totals.opened + totals.clicked + totals.bounced + totals.complained;

    // Calculate rates
    const rates = {
      delivery_rate: totalSent > 0 ? ((totals.delivered + totals.opened + totals.clicked) / totalSent) * 100 : 0,
      open_rate: totalSent > 0 ? (totals.opened / totalSent) * 100 : 0,
      click_rate: totalSent > 0 ? (totals.clicked / totalSent) * 100 : 0,
      bounce_rate: totalSent > 0 ? (totals.bounced / totalSent) * 100 : 0,
    };

    // Daily stats for last 14 days
    const now = new Date();
    const dailyStats: Record<string, { date: string; sent: number; opened: number; clicked: number; bounced: number }> = {};

    for (let i = 0; i < 14; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      dailyStats[dateStr] = {
        date: dateStr,
        sent: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
      };
    }

    // Count by day
    for (const log of emailLogs) {
      if (!log.sent_at) continue;
      const dateStr = log.sent_at.split("T")[0];
      if (dailyStats[dateStr]) {
        dailyStats[dateStr].sent++;
        if (log.status === "opened") dailyStats[dateStr].opened++;
        if (log.status === "clicked") dailyStats[dateStr].clicked++;
        if (log.status === "bounced") dailyStats[dateStr].bounced++;
      }
    }

    const daily_stats = Object.values(dailyStats)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .reverse();

    // Recent bounces with CRM details
    const bouncedEmails = emailLogs
      .filter((e) => e.status === "bounced" && e.bounced_at)
      .sort((a, b) => new Date(b.bounced_at!).getTime() - new Date(a.bounced_at!).getTime())
      .slice(0, 20);

    // Get CRM details for bounced emails
    const recent_bounces = await Promise.all(
      bouncedEmails.map(async (log) => {
        const { data: record } = await supabase
          .from("crm_records")
          .select("domain, company_name, contact_email")
          .eq("id", log.crm_record_id)
          .single();

        return {
          domain: record?.domain || "â",
          company_name: record?.company_name || "â",
          email: record?.contact_email || "â",
          bounce_reason: log.bounce_reason || "bounced",
          bounced_at: log.bounced_at || new Date().toISOString(),
        };
      })
    );

    // Top performing subjects
    const subjectStats: Record<string, { subject: string; sent: number; opened: number }> = {};

    for (const log of emailLogs) {
      if (!log.subject) continue;
      if (!subjectStats[log.subject]) {
        subjectStats[log.subject] = {
          subject: log.subject,
          sent: 0,
          opened: 0,
        };
      }
      subjectStats[log.subject].sent++;
      if (log.status === "opened" || log.status === "clicked") {
        subjectStats[log.subject].opened++;
      }
    }

    const top_performing_subjects = Object.values(subjectStats)
      .map((s) => ({
        subject: s.subject,
        sent: s.sent,
        open_rate: s.sent > 0 ? (s.opened / s.sent) * 100 : 0,
      }))
      .sort((a, b) => b.open_rate - a.open_rate)
      .slice(0, 10);

    return NextResponse.json({
      totals,
      rates,
      daily_stats,
      recent_bounces,
      top_performing_subjects,
    });
  } catch (err) {
    console.error("GET /api/admin/email-health error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}
