-- ============================================================================
-- Outreach system tables for mass campaign management
-- ============================================================================

-- Outreach Sequences: define multi-step outreach campaigns
CREATE TABLE IF NOT EXISTS outreach_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Each step: { step_number, delay_days, channel, template, subject, conditions }
  is_active BOOLEAN DEFAULT true,
  total_enrolled INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- LinkedIn Tasks: manual task queue for operators
CREATE TABLE IF NOT EXISTS linkedin_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_record_id UUID NOT NULL REFERENCES crm_records(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN (
    'connection_request', 'message', 'follow_up', 'endorsement', 'comment'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'completed', 'skipped', 'failed'
  )),
  template_message TEXT,
  actual_message TEXT,
  assigned_to TEXT,
  sequence_id UUID REFERENCES outreach_sequences(id),
  sequence_step INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_linkedin_tasks_status ON linkedin_tasks(status);
CREATE INDEX IF NOT EXISTS idx_linkedin_tasks_record ON linkedin_tasks(crm_record_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_tasks_assigned ON linkedin_tasks(assigned_to, status);

-- Outreach Email Log: track individual outreach emails sent
CREATE TABLE IF NOT EXISTS outreach_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_record_id UUID NOT NULL REFERENCES crm_records(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES outreach_sequences(id),
  sequence_step INTEGER,
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  resend_email_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN (
    'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained'
  )),
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  bounce_reason TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_outreach_email_log_record ON outreach_email_log(crm_record_id);
CREATE INDEX IF NOT EXISTS idx_outreach_email_log_sequence ON outreach_email_log(sequence_id, sequence_step);

-- Add outreach fields to crm_records
ALTER TABLE crm_records
  ADD COLUMN IF NOT EXISTS outreach_sequence_id UUID REFERENCES outreach_sequences(id),
  ADD COLUMN IF NOT EXISTS outreach_slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS last_visit_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS landing_page_visits INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_crm_records_slug ON crm_records(outreach_slug);
CREATE INDEX IF NOT EXISTS idx_crm_records_sequence ON crm_records(outreach_sequence_id, outreach_sequence_step);

-- Auto-update updated_at on outreach_sequences
CREATE OR REPLACE FUNCTION update_outreach_sequences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_outreach_sequences_updated_at ON outreach_sequences;
CREATE TRIGGER trg_outreach_sequences_updated_at
  BEFORE UPDATE ON outreach_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_outreach_sequences_updated_at();
