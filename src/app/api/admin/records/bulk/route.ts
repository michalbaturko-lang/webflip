import { NextRequest, NextResponse } from "next/server";
import { bulkUpdateStage, bulkAddTags } from "@/lib/admin/queries";
import type { CrmStage } from "@/types/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ids, stage, tags } = body as {
      action: string;
      ids: string[];
      stage?: CrmStage;
      tags?: string[];
    };

    if (!action || !ids?.length) {
      return NextResponse.json(
        { error: "action and ids[] are required" },
        { status: 400 }
      );
    }

    let updated = 0;

    switch (action) {
      case "change_stage":
        if (!stage) {
          return NextResponse.json({ error: "stage is required for change_stage" }, { status: 400 });
        }
        updated = await bulkUpdateStage(ids, stage);
        break;
      case "add_tags":
        if (!tags?.length) {
          return NextResponse.json({ error: "tags[] is required for add_tags" }, { status: 400 });
        }
        updated = await bulkAddTags(ids, tags);
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
