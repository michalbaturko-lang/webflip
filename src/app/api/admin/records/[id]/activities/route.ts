import { NextRequest, NextResponse } from "next/server";
import { listActivities, createActivity } from "@/lib/admin/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const activities = await listActivities(id);
    return NextResponse.json(activities);
  } catch (err) {
    console.error("GET /api/admin/records/[id]/activities error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.type) {
      return NextResponse.json({ error: "type is required" }, { status: 400 });
    }

    const activity = await createActivity({
      ...body,
      crm_record_id: id,
    });
    return NextResponse.json(activity, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
