import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase";

const SEQUENCE = {
  name: "Webflipper Intro v1",
  description:
    "3-step email sequence for B2B web redesign outreach (Czech). " +
    "Day 0: cold intro, Day 3: follow-up, Day 7: final push.",
  is_active: true,
  steps: [
    {
      step_number: 1,
      delay_days: 0,
      channel: "email",
      template: "cold_intro",
      subject: "Připravili jsme redesign pro {{company_name}}",
      conditions: {
        skip_if_paid: true,
        skip_if_visited: false,
        skip_if_replied: false,
      },
    },
    {
      step_number: 2,
      delay_days: 3,
      channel: "email",
      template: "follow_up_1",
      subject: "{{company_name}} — váš redesign stále čeká",
      conditions: {
        skip_if_paid: true,
        skip_if_visited: true,
        skip_if_replied: true,
      },
    },
    {
      step_number: 3,
      delay_days: 7,
      channel: "email",
      template: "break_up",
      subject: "Poslední šance: redesign {{company_name}} bude brzy odstraněn",
      conditions: {
        skip_if_paid: true,
        skip_if_visited: true,
        skip_if_replied: true,
      },
    },
  ],
};

export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const supabase = createServerClient();

    // Check if sequence already exists
    const { data: existing, error: checkError } = await supabase
      .from("outreach_sequences")
      .select("id, name")
      .eq("name", SEQUENCE.name);

    if (checkError) {
      return NextResponse.json(
        { error: "Failed to check existing sequences", detail: checkError.message },
        { status: 500 }
      );
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({
        status: "skipped",
        message: `Sequence "${SEQUENCE.name}" already exists`,
        sequence: existing[0],
      });
    }

    // Insert new sequence
    const { data: created, error: insertError } = await supabase
      .from("outreach_sequences")
      .insert(SEQUENCE)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to create sequence", detail: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "created",
      sequence: created,
      merge_variables: [
        "{{company_name}} — Company name from CRM record",
        "{{domain}} — Company domain",
        "{{contact_name}} — Contact person name",
        "{{video_url}} — Personalized video URL (if rendered)",
      ],
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Seed failed", detail: String(err) },
      { status: 500 }
    );
  }
}
