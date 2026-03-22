import { NextRequest, NextResponse } from "next/server";
import { getVideoData, getVideoDataBatch } from "@/lib/outreach/video-data";


/**
 * GET /api/admin/video?id=<record_id>&format=json|props
 *
 * Returns the video props for a single CRM record.
 * Use `format=props` (default) for Remotion inputProps JSON.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const format = req.nextUrl.searchParams.get("format") ?? "props";


  if (!id) {
    return NextResponse.json(
      { error: "Missing ?id= query parameter" },
      { status: 400 }
    );
  }


  const data = await getVideoData(id);
  if (!data) {
    return NextResponse.json(
      { error: "Record not found or missing analysis data" },
      { status: 404 }
    );
  }


  if (format === "json") {
    return NextResponse.json({
      recordId: id,
      videoProps: data,
      renderCommand: buildRenderCommand(id, data as Record<string, unknown>),
    });
  }

