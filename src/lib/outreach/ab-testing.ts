import { createServerClient } from "@/lib/supabase";

export interface ABTest {
  id: string;
  sequence_id: string;
  step_number: number;
  subject_a: string;
  subject_b: string;
  sent_a: number;
  sent_b: number;
  opened_a: number;
  opened_b: number;
  clicked_a: number;
  clicked_b: number;
  winner: 'a' | 'b' | null;
  is_active: boolean;
  created_at: string;
}

// Get which variant to use for next send (alternating 50/50)
export function getABVariant(test: ABTest): 'a' | 'b' {
  if (test.winner) return test.winner;
  // Alternate: if sent_a <= sent_b, send A next
  return test.sent_a <= test.sent_b ? 'a' : 'b';
}

// Record a send for variant
export async function recordABSend(testId: string, variant: 'a' | 'b'): Promise<void> {
  const supabase = createServerClient();
  const field = variant === 'a' ? 'sent_a' : 'sent_b';

  // Use RPC or manual increment
  const { data } = await supabase.from('ab_tests').select(field).eq('id', testId).single();
  if (data) {
    const record = data as unknown as Record<string, number>;
    await supabase.from('ab_tests').update({ [field]: (record[field] || 0) + 1 }).eq('id', testId);
  }
}

// Record an open/click
export async function recordABEvent(testId: string, variant: 'a' | 'b', eventType: 'opened' | 'clicked'): Promise<void> {
  const supabase = createServerClient();
  const field = `${eventType}_${variant}`;

  const { data } = await supabase.from('ab_tests').select(field).eq('id', testId).single();
  if (data) {
    const record = data as unknown as Record<string, number>;
    await supabase.from('ab_tests').update({ [field]: (record[field] || 0) + 1 }).eq('id', testId);
  }
}

// Check if we can declare a winner (min 50 sends per variant)
export async function checkABWinner(testId: string): Promise<'a' | 'b' | null> {
  const supabase = createServerClient();
  const { data: test } = await supabase.from('ab_tests').select('*').eq('id', testId).single();
  if (!test) return null;

  const MIN_SAMPLE = 50;
  const t = test as unknown as Record<string, number>;
  if (t.sent_a < MIN_SAMPLE || t.sent_b < MIN_SAMPLE) return null;

  const rateA = t.sent_a > 0 ? t.opened_a / t.sent_a : 0;
  const rateB = t.sent_b > 0 ? t.opened_b / t.sent_b : 0;

  // Simple: 3% difference threshold
  const diff = Math.abs(rateA - rateB);
  if (diff < 0.03) return null; // Too close to call

  const winner = rateA > rateB ? 'a' : 'b';
  await supabase.from('ab_tests').update({ winner, is_active: false }).eq('id', testId);

  return winner as 'a' | 'b';
}

// CRUD
export async function createABTest(data: { sequence_id: string; step_number: number; subject_a: string; subject_b: string }): Promise<ABTest> {
  const supabase = createServerClient();
  const { data: test, error } = await supabase.from('ab_tests').insert({
    ...data, sent_a: 0, sent_b: 0, opened_a: 0, opened_b: 0, clicked_a: 0, clicked_b: 0, is_active: true
  }).select().single();
  if (error) throw new Error(`createABTest: ${error.message}`);
  return test as ABTest;
}

export async function listABTests(sequenceId?: string): Promise<ABTest[]> {
  const supabase = createServerClient();
  let query = supabase.from('ab_tests').select('*').order('created_at', { ascending: false });
  if (sequenceId) query = query.eq('sequence_id', sequenceId);
  const { data, error } = await query;
  if (error) throw new Error(`listABTests: ${error.message}`);
  return (data || []) as ABTest[];
}
