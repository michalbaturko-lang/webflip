import { NextRequest, NextResponse } from "next/server";
import { listRecords, createRecord } from "@/lib/admin/queries";

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const params = {
      stage: url.searchParams.get("stage") || undefined,
      source: url.searchParams.get("source") || undefined,
      search: url.searchParams.get("search") || undefined,
      scoreMin: url.searchParams.has("scoreMin") ? Number(url.searchParams.get("scoreMin")) : undefined,
      scoreMax: url.searchParams.has("scoreMax") ? Number(url.searchParams.get("scoreMax")) : undefined,
      tags: url.searchParams.get("tags")?.split(",").filter(Boolean) || undefined,
      limit: Number(url.searchParams.get("limit")) || 50,
      offset: Number(url.searchParams.get("offset")) || 0,
      sortBy: url.searchParams.get("sortBy") || undefined,
      sortDir: (url.searchParams.get("sortDir") as "asc" | "desc") || undefined,
    };

    const result = await listRecords(params);
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/admin/records error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.domain || !body.website_url) {
      return NextResponse.json(
        { error: "domain and website_url are required" },
        { status: 400 }
      );
    }

    const record = await createRecord(body);
    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    const status = msg.includes("duplicate") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
