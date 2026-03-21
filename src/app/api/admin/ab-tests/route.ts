import { createServerClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const sequenceId = req.nextUrl.searchParams.get('sequence_id');
    const supabase = createServerClient();

    let query = supabase
      .from('ab_tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (sequenceId) {
      query = query.eq('sequence_id', sequenceId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ab-tests API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate conversion rates
    const testsWithRates = (data || []).map((test: any) => ({
      ...test,
      rate_a: test.sent_a > 0 ? (test.opened_a / test.sent_a * 100).toFixed(1) : '—',
      rate_b: test.sent_b > 0 ? (test.opened_b / test.sent_b * 100).toFixed(1) : '—',
    }));

    return NextResponse.json(testsWithRates);
  } catch (err) {
    console.error('[ab-tests API] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sequence_id, step_number, subject_a, subject_b } = body;

    if (!sequence_id || !step_number || !subject_a || !subject_b) {
      return NextResponse.json(
        { error: 'Missing required fields: sequence_id, step_number, subject_a, subject_b' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('ab_tests')
      .insert({
        sequence_id,
        step_number,
        subject_a,
        subject_b,
        sent_a: 0,
        sent_b: 0,
        opened_a: 0,
        opened_b: 0,
        clicked_a: 0,
        clicked_b: 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('[ab-tests API] Error creating test:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[ab-tests API] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
