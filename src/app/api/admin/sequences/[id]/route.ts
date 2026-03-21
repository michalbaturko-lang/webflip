import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    const supabase = createServerClient();

    // Fetch the sequence
    const { data: sequence, error: seqError } = await supabase
      .from("outreach_sequences")
      .select("*")
      .eq("id", id)
      .single();

    if (seqError || !sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    }

    // Get enrollment counts per sequence
    const { data: enrollments, error: enrollError } = await supabase
      .from("crm_records")
      .select("outreach_sequence_step")
      .eq("outreach_sequence_id", id);

    if (enrollError) throw new Error(`Failed to fetch enrollments: ${enrollError.message}`);

    // Count by step
    const stepCounts: Record<number, number> = {};
    (enrollments || []).forEach((record: any) => {
      const step = record.outreach_sequence_step || 0;
      stepCounts[step] = (stepCounts[step] || 0) + 1;
    });

    const totalEnrolled = enrollments?.length || 0;

    return NextResponse.json({
      ...sequence,
      total_enrolled: totalEnrolled,
      enrolled_per_step: stepCounts,
    });
  } catch (err) {
    console.error("GET /api/admin/sequences/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();
    const { name, description, steps, is_active } = body;

    // Validate steps structure if provided
    if (steps && Array.isArray(steps)) {
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
    }

    const supabase = createServerClient();

    // Build update object
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (steps !== undefined) updates.steps = steps;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabase
      .from("outreach_sequences")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    }

    // Get updated enrollment counts
    const { data: enrollments, error: enrollError } = await supabase
      .from("crm_records")
      .select("outreach_sequence_step")
      .eq("outreach_sequence_id", id);

    if (enrollError) throw new Error(`Failed to fetch enrollments: ${enrollError.message}`);

    const stepCounts: Record<number, number> = {};
    (enrollments || []).forEach((record: any) => {
      const step = record.outreach_sequence_step || 0;
      stepCounts[step] = (stepCounts[step] || 0) + 1;
    });

    const totalEnrolled = enrollments?.length || 0;

    return NextResponse.json({
      ...data,
      total_enrolled: totalEnrolled,
      enrolled_per_step: stepCounts,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("PUT /api/admin/sequences/[id] error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    const supabase = createServerClient();

    // Check if any records are enrolled in this sequence
    const { data: enrollments, error: enrollError } = await supabase
      .from("crm_records")
      .select("id")
      .eq("outreach_sequence_id", id);

    if (enrollError) throw new Error(`Failed to fetch enrollments: ${enrollError.message}`);

    if (enrollments && enrollments.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete sequence with enrolled records" },
        { status: 409 }
      );
    }

    // Delete the sequence
    const { error: deleteError } = await supabase
      .from("outreach_sequences")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete sequence" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/sequences/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
