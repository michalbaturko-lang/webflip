import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase";
import type { OutreachSequence, OutreachSequenceStep } from "@/types/outreach";

export async function GET(request: NextRequest) {
  try {
    const authError = requireAdmin(request);
    if (authError) return authError;

    const supabase = createServerClient();

    // Fetch all sequences ordered by created_at DESC
    const { data: sequences, error: seqError } = await supabase
      .from("outreach_sequences")
      .select("*")
      .order("created_at", { ascending: false });

    if (seqError) throw new Error(`Failed to fetch sequences: ${seqError.message}`);

    // Get enrollment counts per sequence
    const { data: enrollments, error: enrollError } = await supabase
      .from("crm_records")
      .select("outreach_sequence_id");

    if (enrollError) throw new Error(`Failed to fetch enrollments: ${enrollError.message}`);

    const enrollmentCounts: Record<string, number> = {};
    (enrollments || []).forEach((record: any) => {
      if (record.outreach_sequence_id) {
        enrollmentCounts[record.outreach_sequence_id] =
          (enrollmentCounts[record.outreach_sequence_id] || 0) + 1;
      }
    });

    const result = (sequences || []).map((seq: any) => ({
      ...seq,
      total_enrolled: enrollmentCounts[seq.id] || 0,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/admin/sequences error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = requireAdmin(request);
    if (authError) return authError;

    const body = await request.json();
    const { name, description, steps, is_active } = body;

    // Validate required fields
    if (!name || !Array.isArray(steps)) {
      return NextResponse.json(
        { error: "name and steps array are required" },
        { status: 400 }
      );
    }

    // Validate steps structure
    for (const step of steps) {
      if (
        typeof step.step_number !== "number" ||
        typeof step.delay_days !== "number" ||
        !["email", "linkedin"].includes(step.channel)
      ) {
        return NextResponse.json(
          {
            error:
              "Each step must have step_number, delay_days, and channel (email or linkedin)",
          },
          { status: 400 }
        );
      }

      if (step.channel === "email" && !step.subject) {
        return NextResponse.json(
          { error: "Email steps must have a subject" },
          { status: 400 }
        );
      }

      if (step.channel === "linkedin" && !step.task_type) {
        return NextResponse.json(
          { error: "LinkedIn steps must have a task_type" },
          { status: 400 }
        );
      }
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("outreach_sequences")
      .insert({
        name,
        description: description || null,
        steps,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create sequence: ${error.message}`);

    return NextResponse.json(
      {
        ...data,
        total_enrolled: 0,
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("POST /api/admin/sequences error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
