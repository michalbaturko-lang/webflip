import { NextResponse } from "next/server";
import { getPipelineData } from "@/lib/admin/queries";

export async function GET() {
  try {
    const pipeline = await getPipelineData();
    return NextResponse.json(pipeline);
  } catch (err) {
    console.error("GET /api/admin/pipeline error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
