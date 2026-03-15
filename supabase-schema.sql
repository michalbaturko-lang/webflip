-- Webflip: Analysis pipeline schema
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
