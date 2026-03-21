import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();
    const { record_ids } = body;

    // Validate input
    if (!Array.isArray(record_ids) || record_ids.length === 0) {
      return NextResponse.json(
        { error: "record_ids must be a non-empty array" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify sequence exists
    const { data: sequence, error: seqError } = await supabase
      .from("outreach_sequences")
      .select("id")
      .eq("id", id)
      .single();

    if (seqError || !sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    }

    // Get records to update
    const { data: records, error: recordError } = await supabase
      .from("crm_records")
      .select("id, first_contact_date")
      .in("id", record_ids);

    if (recordError) throw new Error(`Failed to fetch records: ${recordError.message}`);

    const now = new Date().toISOString();

    // Prepare updates
    const updates = (records || []).map((record: any) => ({
      id: record.id,
      outreach_sequence_id: id,
      outreach_sequence_step: 0,
      first_contact_date: record.first_contact_date || now,
    }));

    // Update all records
    let enrolledCount = 0;
    for (const update of updates) {
      const { error } = await supabase
        .from("crm_records")
        .update({
          outreach_sequence_id: update.outreach_sequence_id,
          outreach_sequence_step: update.outreach_sequence_step,
          first_contact_date: update.first_contact_date,
        })
        .eq("id", update.id);

      if (!error) {
        enrolledCount++;
      }
    }

    return NextResponse.json(
      {
        enrolled_count: enrolledCount,
        total_requested: record_ids.length,
        sequence_id: id,
      },
      { status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("POST /api/admin/sequences/[id]/enroll error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
