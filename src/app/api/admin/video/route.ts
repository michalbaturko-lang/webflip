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
      renderCommand: buildRenderCommand(id, data),
    });
  }

  // Default: return pure inputProps for Remotion
  return NextResponse.json(data);
}

/**
 * POST /api/admin/video
 * Body: { recordIds: string[], voiceoverUrl?: string }
 *
 * Batch: returns video props + render commands for multiple records.
 * Optionally attach a voiceover URL to all videos.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const recordIds: string[] = body.recordIds ?? [];
  const voiceoverUrl: string | undefined = body.voiceoverUrl;

  if (!recordIds.length) {
    return NextResponse.json(
      { error: "Provide recordIds array in body" },
      { status: 400 }
    );
  }

  if (recordIds.length > 50) {
    return NextResponse.json(
      { error: "Maximum 50 records per batch" },
      { status: 400 }
    );
  }

  const batchData = await getVideoDataBatch(recordIds);

  const results = recordIds.map((id) => {
    const data = batchData.get(id);
    if (!data) {
      return { recordId: id, error: "Not found" };
    }

    // Attach voiceover if provided
    const props = voiceoverUrl ? { ...data, voiceoverUrl } : data;

    return {
      recordId: id,
      videoProps: props,
      renderCommand: buildRenderCommand(id, props),
    };
  });

  return NextResponse.json({
    total: recordIds.length,
    success: results.filter((r) => !("error" in r && r.error)).length,
    results,
  });
}

/**
 * Generate a CLI render command for a single video.
 * This is what would be executed on the render server.
 */
function buildRenderCommand(
  recordId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any
): string {
  const propsB64 = Buffer.from(JSON.stringify(props)).toString("base64");
  return [
    `npx remotion render`,
    `WebflipperVideo`,
    `out/video-${recordId}.mp4`,
    `--props='${propsB64}'`,
    `--codec=h264`,
    `--image-format=jpeg`,
    `--jpeg-quality=90`,
    `--concurrency=50%`,
  ].join(" ");
}
