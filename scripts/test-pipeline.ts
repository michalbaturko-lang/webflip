#!/usr/bin/env npx tsx
/**
 * Pipeline health-check script
 *
 * Checks: DB connectivity, CRM records with analysis, screenshots per domain,
 * sequences, render queue status.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/test-pipeline.ts
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const headers = {
  apikey: SUPABASE_KEY!,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

let passed = 0;
let failed = 0;

async function query(table: string, params = ""): Promise<any[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?${params}`,
    { headers }
  );
  if (!res.ok) throw new Error(`Query ${table} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function pass(label: string, detail?: string) {
  passed++;
  console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label: string, detail?: string) {
  failed++;
  console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log("=== Outreach Pipeline Health Check ===\n");

  // 1. DB Connectivity
  console.log("1. Database Connectivity");
  try {
    await query("crm_records", "select=id&limit=1");
    pass("Connected to Supabase");
  } catch (err) {
    fail("Cannot connect to Supabase", String(err));
    process.exit(1);
  }

  // 2. CRM Records
  console.log("\n2. CRM Records");
  try {
    const allRecords = await query("crm_records", "select=id&limit=10000");
    const totalCount = allRecords.length;
    if (totalCount > 0) {
      pass(`Total CRM records: ${totalCount}`);
    } else {
      fail("No CRM records found");
    }

    // Records with analysis
    const withAnalysis = await query(
      "crm_records",
      "select=id&analysis_id=not.is.null&limit=10000"
    );
    if (withAnalysis.length > 0) {
      pass(`Records with analysis: ${withAnalysis.length}`);
    } else {
      fail("No records have linked analysis");
    }

    // Records with contact email
    const withEmail = await query(
      "crm_records",
      "select=id&contact_email=not.is.null&limit=10000"
    );
    pass(`Records with contact email: ${withEmail.length}`);

    // Records enrolled in sequences
    const enrolled = await query(
      "crm_records",
      "select=id&outreach_sequence_id=not.is.null&limit=10000"
    );
    pass(`Records enrolled in sequences: ${enrolled.length}`);
  } catch (err) {
    fail("Failed to query CRM records", String(err));
  }

  // 3. Analyses
  console.log("\n3. Analyses");
  try {
    const analyses = await query(
      "analyses",
      "select=id,status&limit=10000"
    );
    const byStatus: Record<string, number> = {};
    analyses.forEach((a: any) => {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    });
    if (analyses.length > 0) {
      pass(`Total analyses: ${analyses.length}`);
      for (const [status, count] of Object.entries(byStatus)) {
        console.log(`       ${status}: ${count}`);
      }
    } else {
      fail("No analyses found");
    }
  } catch (err) {
    fail("Failed to query analyses", String(err));
  }

  // 4. Screenshots
  console.log("\n4. Screenshots");
  try {
    const screenshots = await query(
      "screenshots",
      "select=id,domain,variant&limit=10000"
    );
    if (screenshots.length > 0) {
      const domains = new Set(screenshots.map((s: any) => s.domain));
      const variants = new Set(screenshots.map((s: any) => s.variant));
      pass(`Total screenshots: ${screenshots.length}`);
      pass(`Unique domains with screenshots: ${domains.size}`);
      console.log(`       Variants: ${Array.from(variants).join(", ")}`);
    } else {
      fail("No screenshots found — video rendering will lack visual assets");
    }
  } catch (err) {
    // Table may not exist
    fail("Screenshots table not accessible", String(err));
  }

  // 5. Outreach Sequences
  console.log("\n5. Outreach Sequences");
  try {
    const sequences = await query(
      "outreach_sequences",
      "select=id,name,is_active,steps"
    );
    if (sequences.length > 0) {
      pass(`Total sequences: ${sequences.length}`);
      for (const seq of sequences) {
        const stepCount = Array.isArray(seq.steps) ? seq.steps.length : 0;
        const status = seq.is_active ? "ACTIVE" : "INACTIVE";
        console.log(`       [${status}] "${seq.name}" — ${stepCount} steps`);
      }
    } else {
      fail(
        "No sequences found — run: npx tsx scripts/seed-sequence.ts"
      );
    }
  } catch (err) {
    fail("Failed to query sequences", String(err));
  }

  // 6. Video Render Queue
  console.log("\n6. Video Render Queue");
  try {
    const renders = await query(
      "video_renders",
      "select=id,status&limit=10000"
    );
    if (renders.length > 0) {
      const byStatus: Record<string, number> = {};
      renders.forEach((r: any) => {
        byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      });
      pass(`Total renders: ${renders.length}`);
      for (const [status, count] of Object.entries(byStatus)) {
        console.log(`       ${status}: ${count}`);
      }
    } else {
      pass("No video renders queued yet (expected for fresh setup)");
    }
  } catch (err) {
    fail("Video renders table not accessible", String(err));
  }

  // 7. Email Logs
  console.log("\n7. Outreach Email Logs");
  try {
    const logs = await query(
      "outreach_email_logs",
      "select=id,status&limit=10000"
    );
    if (logs.length > 0) {
      const byStatus: Record<string, number> = {};
      logs.forEach((l: any) => {
        byStatus[l.status] = (byStatus[l.status] || 0) + 1;
      });
      pass(`Total email logs: ${logs.length}`);
      for (const [status, count] of Object.entries(byStatus)) {
        console.log(`       ${status}: ${count}`);
      }
    } else {
      pass("No emails sent yet (expected for fresh setup)");
    }
  } catch (err) {
    fail("Email logs table not accessible", String(err));
  }

  // 8. LinkedIn Tasks
  console.log("\n8. LinkedIn Tasks");
  try {
    const tasks = await query(
      "linkedin_tasks",
      "select=id,status&limit=10000"
    );
    if (tasks.length > 0) {
      const byStatus: Record<string, number> = {};
      tasks.forEach((t: any) => {
        byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      });
      pass(`Total LinkedIn tasks: ${tasks.length}`);
      for (const [status, count] of Object.entries(byStatus)) {
        console.log(`       ${status}: ${count}`);
      }
    } else {
      pass("No LinkedIn tasks yet (expected for fresh setup)");
    }
  } catch (err) {
    fail("LinkedIn tasks table not accessible", String(err));
  }

  // Summary
  console.log("\n=== Summary ===");
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);

  if (failed > 0) {
    console.log("\n⚠️  Some checks failed. Review the issues above.");
    process.exit(1);
  } else {
    console.log("\n🎉 All checks passed. Pipeline is ready.");
  }
}

main().catch((err) => {
  console.error("Health check failed:", err);
  process.exit(1);
});
