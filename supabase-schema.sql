-- Webflipper: Analysis pipeline schema
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(64) UNIQUE NOT NULL,
  url TEXT NOT NULL,
  email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,

  -- Crawl data
  cloudflare_job_id VARCHAR(255),
  crawled_pages JSONB DEFAULT '[]',
  page_count INT DEFAULT 0,

  -- Scores (0-100)
  score_performance INT,
  score_seo INT,
  score_security INT,
  score_ux INT,
  score_content INT,
  score_ai_visibility INT,
  score_overall INT,

  -- Raw analysis data
  analysis_results JSONB,
  findings JSONB DEFAULT '[]',

  -- Redesign variants
  variants JSONB DEFAULT '[]',
  html_variants JSONB DEFAULT '[]',
  variant_progress JSONB,

  -- Extracted assets from crawl (logo, images, colors, company name)
  extracted_assets JSONB,

  -- Business interpretation profile (industry, audience, value props, FAQ/blog seeds)
  business_profile JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analyses_token ON analyses(token);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);

-- Enable RLS (but allow service role full access)
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Policy: service role can do everything (our API routes use service role key)
CREATE POLICY "Service role full access" ON analyses
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CRM & Outreach Tables
-- ============================================================================

-- CRM Records (core lead/prospect data)
CREATE TABLE IF NOT EXISTS crm_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  company_name TEXT,
  contact_email VARCHAR(255),
  linkedin_url TEXT,
  stage VARCHAR(50) DEFAULT 'prospect' CHECK (stage IN ('prospect', 'contacted', 'paid', 'churned', 'lost')),
  suitability_score INT,
  outreach_sequence_id UUID,
  outreach_sequence_step INT,
  last_contact_date TIMESTAMPTZ,
  trial_page_views INT DEFAULT 0,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for crm_records
CREATE INDEX IF NOT EXISTS idx_crm_records_domain ON crm_records(domain);
CREATE INDEX IF NOT EXISTS idx_crm_records_stage ON crm_records(stage);
CREATE INDEX IF NOT EXISTS idx_crm_records_outreach_sequence_id ON crm_records(outreach_sequence_id);
CREATE INDEX IF NOT EXISTS idx_crm_records_contact_email ON crm_records(contact_email);
CREATE INDEX IF NOT EXISTS idx_crm_records_created_at ON crm_records(created_at DESC);

-- RLS for crm_records
ALTER TABLE crm_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON crm_records
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Outreach Sequences (sequence definitions)
CREATE TABLE IF NOT EXISTS outreach_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  steps JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for outreach_sequences
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_is_active ON outreach_sequences(is_active);
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_created_at ON outreach_sequences(created_at DESC);

-- RLS for outreach_sequences
ALTER TABLE outreach_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON outreach_sequences
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CRM Activities (audit trail of actions taken)
CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_record_id UUID NOT NULL REFERENCES crm_records(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL CHECK (type IN (
    'email_sent', 'linkedin_sent', 'note_added', 'email_opened', 'email_clicked',
    'bounced', 'complained', 'sequence_started', 'sequence_completed', 'manual_call'
  )),
  subject TEXT,
  body TEXT,
  sequence_name TEXT,
  sequence_step INT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for crm_activities
CREATE INDEX IF NOT EXISTS idx_crm_activities_crm_record_id ON crm_activities(crm_record_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_type ON crm_activities(type);
CREATE INDEX IF NOT EXISTS idx_crm_activities_created_at ON crm_activities(created_at DESC);

-- RLS for crm_activities
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON crm_activities
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Outreach Email Logs (email send/delivery tracking)
CREATE TABLE IF NOT EXISTS outreach_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_record_id UUID NOT NULL REFERENCES crm_records(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES outreach_sequences(id) ON DELETE SET NULL,
  sequence_step INT,
  template_name TEXT,
  subject TEXT,
  resend_email_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'sent' CHECK (status IN (
    'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained'
  )),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for outreach_email_logs
CREATE INDEX IF NOT EXISTS idx_email_logs_crm_record_id ON outreach_email_logs(crm_record_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sequence_id ON outreach_email_logs(sequence_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON outreach_email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON outreach_email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_resend_id ON outreach_email_logs(resend_email_id);

-- RLS for outreach_email_logs
ALTER TABLE outreach_email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON outreach_email_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- LinkedIn Tasks (manual LinkedIn action tracking)
CREATE TABLE IF NOT EXISTS linkedin_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_record_id UUID NOT NULL REFERENCES crm_records(id) ON DELETE CASCADE,
  task_type VARCHAR(50) NOT NULL CHECK (task_type IN (
    'connection_request', 'message', 'follow_up', 'endorsement', 'comment'
  )),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  template_message TEXT,
  actual_message TEXT,
  sequence_id UUID REFERENCES outreach_sequences(id) ON DELETE SET NULL,
  sequence_step INT,
  assigned_to VARCHAR(255),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for linkedin_tasks
CREATE INDEX IF NOT EXISTS idx_linkedin_tasks_crm_record_id ON linkedin_tasks(crm_record_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_tasks_status ON linkedin_tasks(status);
CREATE INDEX IF NOT EXISTS idx_linkedin_tasks_task_type ON linkedin_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_linkedin_tasks_created_at ON linkedin_tasks(created_at DESC);

-- RLS for linkedin_tasks
ALTER TABLE linkedin_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON linkedin_tasks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Website Screenshots (domain variant screenshots)
CREATE TABLE IF NOT EXISTS website_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  variant TEXT,
  screenshot_url TEXT,
  storage_path TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for website_screenshots
CREATE INDEX IF NOT EXISTS idx_website_screenshots_domain ON website_screenshots(domain);
CREATE INDEX IF NOT EXISTS idx_website_screenshots_variant ON website_screenshots(variant);
CREATE INDEX IF NOT EXISTS idx_website_screenshots_expires_at ON website_screenshots(expires_at);
CREATE INDEX IF NOT EXISTS idx_website_screenshots_created_at ON website_screenshots(created_at DESC);

-- RLS for website_screenshots
ALTER TABLE website_screenshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON website_screenshots
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Video Render Queue (outreach videos)
CREATE TABLE IF NOT EXISTS outreach_video_renders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_record_id UUID NOT NULL REFERENCES crm_records(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'rendering', 'done', 'error')),
  input_props JSONB NOT NULL DEFAULT '{}',
  video_url TEXT,
  error_message TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(crm_record_id)
);

-- Indexes for outreach_video_renders
CREATE INDEX IF NOT EXISTS idx_video_renders_queue
  ON outreach_video_renders (status, priority DESC, queued_at ASC)
  WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_video_renders_crm_record_id ON outreach_video_renders(crm_record_id);

-- RLS for outreach_video_renders
ALTER TABLE outreach_video_renders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON outreach_video_renders
  FOR ALL
  USING (true)
  WITH CHECK (true);
