import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const authError = requireAdmin(request);
    if (authError) return authError;

    const url = request.nextUrl;
    const status = url.searchParams.get("status") || undefined;
    const assignedTo = url.searchParams.get("assigned_to") || undefined;
    const limit = Number(url.searchParams.get("limit")) || 100;

    const supabase = createServerClient();

    let query = supabase
      .from("linkedin_tasks")
      .select(
        `
        id,
        crm_record_id,
        task_type,
        status,
        template_message,
        actual_message,
        assigned_to,
        sequence_id,
        sequence_step,
        created_at,
        completed_at,
        crm_records!inner(company_name, domain, linkedin_url)
      `
      )
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    if (assignedTo) {
      query = query.eq("assigned_to", assignedTo);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch LinkedIn tasks: ${error.message}`);
    }

    // Transform the response to flatten the nested crm_records data
    const transformedData = (data || []).map((task: any) => ({
      id: task.id,
      crm_record_id: task.crm_record_id,
      task_type: task.task_type,
      status: task.status,
      template_message: task.template_message,
      actual_message: task.actual_message,
      assigned_to: task.assigned_to,
      sequence_id: task.sequence_id,
      sequence_step: task.sequence_step,
      created_at: task.created_at,
      completed_at: task.completed_at,
      company_name: task.crm_records?.company_name || null,
      domain: task.crm_records?.domain || null,
      linkedin_url: task.crm_records?.linkedin_url || null,
    }));

    return NextResponse.json(transformedData);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("GET /api/admin/linkedin-tasks error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authError = requireAdmin(request);
    if (authError) return authError;

    const body = await request.json();
    const { task_id, status, actual_message } = body;

    if (!task_id || !status) {
      return NextResponse.json(
        { error: "task_id and status are required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const now = new Date().toISOString();

    const updateData: any = { status };

    if (status === "completed") {
      updateData.completed_at = now;
      if (actual_message) {
        updateData.actual_message = actual_message;
      }
    }

    const { data: task, error: fetchError } = await supabase
      .from("linkedin_tasks")
      .select("crm_record_id")
      .eq("id", task_id)
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
      .eq("id", task_id)
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
        subject: updatedTask.task_type,
        body: actual_message || updatedTask.template_message,
        metadata: {
          linkedin_task_id: task_id,
          task_type: updatedTask.task_type,
        },
      });
    }

    return NextResponse.json(updatedTask);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("PUT /api/admin/linkedin-tasks error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
