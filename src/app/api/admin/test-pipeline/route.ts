import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase";

interface Check {
  label: string;
  status: "pass" | "fail";
  detail?: string;
}

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const supabase = createServerClient();
  const checks: Check[] = [];
  const sections: Record<string, unknown> = {};

  function pass(label: string, detail?: string) {
    checks.push({ label, status: "pass", detail });
  }

  function fail(label: string, detail?: string) {
    checks.push({ label, status: "fail", detail });
  }

  // 1. DB Connectivity
  try {
    await supabase.from("crm_records").select("id").limit(1);
    pass("Database connectivity");
  } catch (err) {
    fail("Database connectivity", String(err));
    return NextResponse.json({ checks, sections, summary: { passed: 0, failed: 1 } }, { status: 500 });
  }

  // 2. CRM Records
  try {
    const { data: allRecords } = await supabase.from("crm_records").select("id").limit(10000);
    const total = allRecords?.length ?? 0;
    if (total > 0) pass(`Total CRM records: ${total}`);
    else fail("No CRM records found");

    const { data: withAnalysis } = await supabase
      .from("crm_records")
      .select("id")
      .not("analysis_id", "is", null)
      .limit(10000);
    if ((withAnalysis?.length ?? 0) > 0) pass(`Records with analysis: ${withAnalysis!.length}`);
    else fail("No records have linked analysis");

    const { data: withEmail } = await supabase
      .from("crm_records")
      .select("id")
      .not("contact_email", "is", null)
      .limit(10000);
    pass(`Records with contact email: ${withEmail?.length ?? 0}`);

    const { data: enrolled } = await supabase
      .from("crm_records")
      .select("id")
      .not("outreach_sequence_id", "is", null)
      .limit(10000);
    pass(`Records enrolled in sequences: ${enrolled?.length ?? 0}`);

    sections.crm = { total, withAnalysis: withAnalysis?.length ?? 0, withEmail: withEmail?.length ?? 0, enrolled: enrolled?.length ?? 0 };
  } catch (err) {
    fail("CRM records query", String(err));
  }

  // 3. Analyses
  try {
    const { data: analyses } = await supabase.from("analyses").select("id, status").limit(10000);
    const byStatus: Record<string, number> = {};
    analyses?.forEach((a) => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });
    if ((analyses?.length ?? 0) > 0) pass(`Total analyses: ${analyses!.length}`);
    else fail("No analyses found");
    sections.analyses = { total: analyses?.length ?? 0, byStatus };
  } catch (err) {
    fail("Analyses query", String(err));
  }

  // 4. Screenshots
  try {
    const { data: screenshots } = await supabase.from("screenshots").select("id, domain, variant").limit(10000);
    if ((screenshots?.length ?? 0) > 0) {
      const domains = new Set(screenshots!.map((s) => s.domain));
      const variants = new Set(screenshots!.map((s) => s.variant));
      pass(`Total screenshots: ${screenshots!.length}`);
      pass(`Unique domains with screenshots: ${domains.size}`);
      sections.screenshots = { total: screenshots!.length, domains: domains.size, variants: Array.from(variants) };
    } else {
      fail("No screenshots found");
    }
  } catch (err) {
    fail("Screenshots table not accessible", String(err));
  }

  // 5. Outreach Sequences
  try {
    const { data: sequences } = await supabase.from("outreach_sequences").select("id, name, is_active, steps");
    if ((sequences?.length ?? 0) > 0) {
      pass(`Total sequences: ${sequences!.length}`);
      sections.sequences = sequences!.map((s) => ({
        id: s.id,
        name: s.name,
        active: s.is_active,
        stepCount: Array.isArray(s.steps) ? s.steps.length : 0,
      }));
    } else {
      fail("No sequences found — run POST /api/admin/seed-sequence");
    }
  } catch (err) {
    fail("Sequences query", String(err));
  }

  // 6. Video Render Queue
  try {
    const { data: renders } = await supabase.from("video_renders").select("id, status").limit(10000);
    if ((renders?.length ?? 0) > 0) {
      const byStatus: Record<string, number> = {};
      renders!.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
      pass(`Total renders: ${renders!.length}`);
      sections.videoRenders = { total: renders!.length, byStatus };
    } else {
      pass("No video renders queued yet (expected for fresh setup)");
    }
  } catch (err) {
    fail("Video renders table not accessible", String(err));
  }

  // 7. Email Logs
  try {
    const { data: logs } = await supabase.from("outreach_email_logs").select("id, status").limit(10000);
    if ((logs?.length ?? 0) > 0) {
      const byStatus: Record<string, number> = {};
      logs!.forEach((l) => { byStatus[l.status] = (byStatus[l.status] || 0) + 1; });
      pass(`Total email logs: ${logs!.length}`);
      sections.emailLogs = { total: logs!.length, byStatus };
    } else {
      pass("No emails sent yet (expected for fresh setup)");
    }
  } catch (err) {
    fail("Email logs table not accessible", String(err));
  }

  // 8. LinkedIn Tasks
  try {
    const { data: tasks } = await supabase.from("linkedin_tasks").select("id, status").limit(10000);
    if ((tasks?.length ?? 0) > 0) {
      const byStatus: Record<string, number> = {};
      tasks!.forEach((t) => { byStatus[t.status] = (byStatus[t.status] || 0) + 1; });
      pass(`Total LinkedIn tasks: ${tasks!.length}`);
      sections.linkedinTasks = { total: tasks!.length, byStatus };
    } else {
      pass("No LinkedIn tasks yet (expected for fresh setup)");
    }
  } catch (err) {
    fail("LinkedIn tasks table not accessible", String(err));
  }

  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;

  return NextResponse.json(
    { checks, sections, summary: { passed, failed, healthy: failed === 0 } },
    { status: failed > 0 ? 207 : 200 }
  );
}
