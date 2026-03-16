import { NextResponse } from "next/server";
import { exportRecordsCsv } from "@/lib/admin/queries";

export async function GET() {
  try {
    const csv = await exportRecordsCsv();
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="webflip-crm-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    console.error("GET /api/admin/export error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
