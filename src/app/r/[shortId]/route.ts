import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import type { CrmRecord } from "@/types/admin";

const supabase = () => createServerClient();

/**
 * Short URL redirect endpoint
 *
 * GET /r/[shortId]
 *
 * Looks up the short ID, records a QR scan activity,
 * and redirects to the full outreach page.
 */
export async function GET(
  request: Request,
  { params }: { params: { shortId: string } }
) {
  try {
    const shortId = params.shortId;
    const db = supabase();

    // Find the record with this short ID
    const { data: records, error: fetchError } = await db
      .from("crm_records")
      .select("id, outreach_slug, company_name, domain")
      .eq("outreach_slug", shortId);

    if (fetchError || !records || records.length === 0) {
      // Short ID not found, redirect to home
      return redirect("/");
    }

    const record = records[0] as CrmRecord & { outreach_slug?: string };

    // Record the QR scan activity
    await db.from("crm_activities").insert({
      crm_record_id: record.id,
      type: "qr_scanned",
      subject: "QR Code Scanned",
      metadata: {
        short_id: shortId,
        timestamp: new Date().toISOString(),
      },
    });

    // Redirect to the outreach page
    // Use the company name as slug if available, otherwise use domain
    const slug = record.company_name
      ? record.company_name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      : record.domain;

    return redirect(`/for/${slug}`);
  } catch (err) {
    console.error("GET /r/[shortId] error:", err);
    // On error, redirect to home
    return redirect("/");
  }
}
