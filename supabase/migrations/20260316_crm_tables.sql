-- CRM Records: main CRM table for lead/customer tracking
CREATE TABLE IF NOT EXISTS crm_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  company_name TEXT,
  website_url TEXT NOT NULL,

  -- Contact info
  contact_email TEXT,
  contact_phone TEXT,
  contact_name TEXT,
  contact_role TEXT DEFAULT 'unknown' CHECK (contact_role IN ('owner', 'marketing', 'cto', 'unknown')),
  linkedin_url TEXT,

  -- Address
  address_street TEXT,
  address_city TEXT,
  address_zip TEXT,
  address_country TEXT DEFAULT 'CZ',

  -- Links to existing tables
  pre_scan_id UUID,  -- REFERENCES pre_scans(id) - table created by another session
  analysis_id UUID REFERENCES analyses(id),
  suitability_score INTEGER CHECK (suitability_score >= 0 AND suitability_score <= 100),

  -- Funnel
  stage TEXT NOT NULL DEFAULT 'prospect' CHECK (stage IN (
    'prospect', 'contacted', 'engaged', 'trial_started',
    'email_captured', 'trial_active', 'card_added', 'paid', 'churned', 'lost'
  )),

  -- Outreach
  outreach_channel TEXT,
  first_contact_date TIMESTAMPTZ,
  last_contact_date TIMESTAMPTZ,
  outreach_sequence_step INTEGER DEFAULT 0,

  -- Trial
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  trial_page_views INTEGER DEFAULT 0,
  trial_editor_uses INTEGER DEFAULT 0,

  -- Payment
  stripe_customer_id TEXT,
  paid_amount DECIMAL(10,2),
  paid_date TIMESTAMPTZ,

  -- Meta
  source TEXT DEFAULT 'manual',
  tags TEXT[],
  notes TEXT,
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_records_stage ON crm_records(stage);
CREATE INDEX IF NOT EXISTS idx_crm_records_suitability ON crm_records(suitability_score DESC);
CREATE INDEX IF NOT EXISTS idx_crm_records_source ON crm_records(source);
CREATE INDEX IF NOT EXISTS idx_crm_records_trial_end ON crm_records(trial_end_date);

-- CRM Activities: activity log for each CRM record
CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_record_id UUID NOT NULL REFERENCES crm_records(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'email_sent', 'email_opened', 'email_clicked',
    'linkedin_sent', 'linkedin_accepted', 'linkedin_replied',
    'physical_mail_sent', 'qr_scanned', 'website_visit',
    'analysis_started', 'email_captured', 'trial_started',
    'trial_page_view', 'editor_used', 'card_added',
    'payment_received', 'note_added', 'stage_changed', 'call_logged'
  )),
  subject TEXT,
  body TEXT,
  metadata JSONB,
  sequence_name TEXT,
  sequence_step INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_record ON crm_activities(crm_record_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_type ON crm_activities(type);

-- Auto-update updated_at on crm_records
CREATE OR REPLACE FUNCTION update_crm_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_records_updated_at ON crm_records;
CREATE TRIGGER trg_crm_records_updated_at
  BEFORE UPDATE ON crm_records
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_records_updated_at();
