import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authError = requireAdmin(request);
    if (authError) return authError;

    const body = await request.json();
    const { status, actual_message } = body;

    if (!status) {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const now = new Date().toISOString();
    const taskId = params.id;

    const updateData: any = { status };

    if (status === "completed") {
      updateData.completed_at = now;
      if (actual_message) {
        updateData.actual_message = actual_message;
      }
    }

    // Fetch the task to get the record ID
    const { data: task, error: fetchError } = await supabase
      .from("linkedin_tasks")
      .select("crm_record_id, template_message, task_type")
      .eq("id", taskId)
      .single();

    if (fetchError || !task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Update the LinkedIn task
    const { data: updatedTask, error: updateError } = await supabase
      .from("linkedin_tasks")
      .update(updateData)
      .eq("id", taskId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update LinkedIn task: ${updateError.message}`);
    }

    // If completed, create an activity log
    if (status === "completed") {
      await supabase.from("crm_activities").insert({
        crm_record_id: task.crm_record_id,
        type: "linkedin_sent",
        subject: task.task_type,
        body: actual_message || task.template_message,
        metadata: {
          linkedin_task_id: taskId,
          task_type: task.task_type,
        },
      });
    }

    return NextResponse.json(updatedTask);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error(`PUT /api/admin/linkedin-tasks/[id] error:`, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authError = requireAdmin(request);
    if (authError) return authError;

    const supabase = createServerClient();
    const taskId = params.id;

    const { error } = await supabase
      .from("linkedin_tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      throw new Error(`Failed to delete LinkedIn task: ${error.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error(`DELETE /api/admin/linkedin-tasks/[id] error:`, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
