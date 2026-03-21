import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  // Auth check
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { rows, auto_prescan, auto_analyze, sequence_id } = body;
    // rows: Array<{website_url, company_name?, contact_email?, contact_name?, contact_phone?, linkedin_url?, contact_role?}>
    // auto_prescan: boolean - run pre-scan for each URL
    // auto_analyze: boolean - auto-run full analysis for "ideal"/"suitable" results
    // sequence_id: string | null - auto-enroll in outreach sequence

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Missing or empty 'rows' array" }, { status: 400 });
    }

    if (rows.length > 500) {
      return NextResponse.json({ error: "Maximum 500 rows per import" }, { status: 400 });
    }

    const supabase = createServerClient();
    const results = {
      total: rows.length,
      created: 0,
      skipped: 0,
      errors: [] as { url: string; reason: string }[],
      records: [] as { id: string; domain: string; classification: string; score: number }[],
    };

    for (const row of rows) {
      try {
        // Normalize URL
        let url = (row.website_url || "").trim();
        if (!url) {
          results.errors.push({ url: "empty", reason: "Missing URL" });
          continue;
        }
        if (!url.startsWith("http")) url = `https://${url}`;

        let domain: string;
        try {
          domain = new URL(url).hostname.replace(/^www\./, "");
        } catch {
          results.errors.push({ url, reason: "Invalid URL format" });
          continue;
        }

        // Check for duplicate
        const { data: existing } = await supabase
          .from("crm_records")
          .select("id")
          .eq("domain", domain)
          .single();

        if (existing) {
          results.skipped++;
          continue;
        }

        // Generate slug
        const slug = (row.company_name || domain)
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 80);

        // Ensure slug uniqueness
        const { data: slugExists } = await supabase
          .from("crm_records")
          .select("id")
          .eq("outreach_slug", slug)
          .single();

        const finalSlug = slugExists ? `${slug}-${Date.now().toString(36)}` : slug;

        // Create CRM record
        const recordData: Record<string, unknown> = {
          domain,
          website_url: url,
          company_name: row.company_name || null,
          contact_email: row.contact_email || null,
          contact_name: row.contact_name || null,
          contact_phone: row.contact_phone || null,
          linkedin_url: row.linkedin_url || null,
          contact_role: row.contact_role || "unknown",
          source: "bulk_import",
          stage: "prospect",
          outreach_slug: finalSlug,
          outreach_sequence_step: 0,
        };

        if (sequence_id) {
          recordData.outreach_sequence_id = sequence_id;
        }

        const { data: record, error: insertError } = await supabase
          .from("crm_records")
          .insert(recordData)
          .select("id, domain")
          .single();

        if (insertError) {
          results.errors.push({ url, reason: insertError.message });
          continue;
        }

        results.created++;

        // Run pre-scan if requested
        let classification = "unknown";
        let score = 0;

        if (auto_prescan) {
          try {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            const preScanRes = await fetch(`${appUrl}/api/pre-scan`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url }),
            });
            if (preScanRes.ok) {
              const preScanData = await preScanRes.json();
              classification = preScanData.classification || "unknown";
              score = preScanData.score_overall || 0;

              // Update CRM record with pre-scan results
              await supabase
                .from("crm_records")
                .update({
                  pre_scan_id: preScanData.id,
                  suitability_score: score,
                })
                .eq("id", record.id);

              // Auto-analyze if ideal/suitable
              if (auto_analyze && (classification === "ideal" || classification === "suitable")) {
                try {
                  const analyzeRes = await fetch(`${appUrl}/api/analyze`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url }),
                  });
                  if (analyzeRes.ok) {
                    const analyzeData = await analyzeRes.json();
                    if (analyzeData.token) {
                      // Link analysis to CRM record
                      // The analysis creates its own record, we'll link it later via token
                      await supabase
                        .from("crm_records")
                        .update({ tags: ["auto_analyzed"] })
                        .eq("id", record.id);
                    }
                  }
                } catch {
                  // Non-critical: analysis can be triggered later
                }
              }
            }
          } catch {
            // Pre-scan failure is non-critical
            classification = "error";
          }
        }

        results.records.push({
          id: record.id,
          domain: record.domain,
          classification,
          score,
        });

        // Log import activity
        await supabase.from("crm_activities").insert({
          crm_record_id: record.id,
          type: "note_added",
          subject: "Bulk import",
          body: `Imported via bulk import. Classification: ${classification}, Score: ${score}`,
          metadata: { source: "bulk_import", classification, score },
        });
      } catch (err) {
        results.errors.push({
          url: row.website_url || "unknown",
          reason: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500 }
    );
  }
}
