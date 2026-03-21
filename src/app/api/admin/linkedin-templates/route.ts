import { LINKEDIN_TEMPLATES } from "@/lib/outreach/linkedin-templates";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type');
    const language = req.nextUrl.searchParams.get('language');

    let filtered = LINKEDIN_TEMPLATES;

    if (type) {
      filtered = filtered.filter(t => t.type === type);
    }

    if (language) {
      filtered = filtered.filter(t => t.language === language);
    }

    return NextResponse.json(filtered);
  } catch (err) {
    console.error('[linkedin-templates API] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
