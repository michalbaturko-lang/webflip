import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsData } from "@/lib/calls/queries";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("project_id") || undefined;
  const data = getAnalyticsData(projectId);
  return NextResponse.json(data);
}
