-- Webflip: Pre-scan suitability table
-- Run this in Supabase SQL Editor after the main schema

CREATE TABLE IF NOT EXISTS pre_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  title TEXT,
  meta_description TEXT,
  tech_stack TEXT,
  page_type TEXT,
  estimated_page_count INTEGER,
  has_ecommerce BOOLEAN DEFAULT false,
  has_contact_form BOOLEAN DEFAULT false,
  language TEXT,
  html_size INTEGER,

  -- Suitability scores (0-100)
  score_redesign_need INTEGER CHECK (score_redesign_need >= 0 AND score_redesign_need <= 100),
  score_business_viability INTEGER CHECK (score_business_viability >= 0 AND score_business_viability <= 100),
  score_complexity_fit INTEGER CHECK (score_complexity_fit >= 0 AND score_complexity_fit <= 100),
  score_contact_reachability INTEGER CHECK (score_contact_reachability >= 0 AND score_contact_reachability <= 100),
  score_overall INTEGER CHECK (score_overall >= 0 AND score_overall <= 100),

  -- Classification
  classification TEXT CHECK (classification IN ('ideal', 'suitable', 'marginal', 'unsuitable')),
  reason TEXT,

  -- Link to full analysis (if proceeded)
  analysis_id UUID REFERENCES analyses(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),

  -- One record per domain
  UNIQUE(domain)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_pre_scans_classification ON pre_scans(classification);
CREATE INDEX IF NOT EXISTS idx_pre_scans_score_overall ON pre_scans(score_overall DESC);
CREATE INDEX IF NOT EXISTS idx_pre_scans_created_at ON pre_scans(created_at DESC);
