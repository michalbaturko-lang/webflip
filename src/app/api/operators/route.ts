import { NextRequest, NextResponse } from "next/server";
import { getOperators } from "@/lib/calls/queries";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("project_id") || undefined;
  const sortBy = request.nextUrl.searchParams.get("sort_by") || "avg_score";
  const sortDir = request.nextUrl.searchParams.get("sort_dir") || "desc";
  const data = getOperators(projectId, sortBy, sortDir);
  return NextResponse.json(data);
}
