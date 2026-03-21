CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES outreach_sequences(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  subject_a TEXT NOT NULL,
  subject_b TEXT NOT NULL,
  sent_a INTEGER DEFAULT 0,
  sent_b INTEGER DEFAULT 0,
  opened_a INTEGER DEFAULT 0,
  opened_b INTEGER DEFAULT 0,
  clicked_a INTEGER DEFAULT 0,
  clicked_b INTEGER DEFAULT 0,
  winner TEXT CHECK (winner IN ('a', 'b')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ab_tests_sequence ON ab_tests(sequence_id, step_number);
