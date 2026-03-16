import { NextResponse } from "next/server";
import { getDashboardKPIs } from "@/lib/admin/queries";

export async function GET() {
  try {
    const kpis = await getDashboardKPIs();
    return NextResponse.json(kpis);
  } catch (err) {
    console.error("GET /api/admin/dashboard error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
