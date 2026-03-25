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
