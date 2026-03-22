-- Video render queue for automated outreach video generation
CREATE TABLE IF NOT EXISTS outreach_video_renders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crm_record_id UUID NOT NULL REFERENCES crm_records(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'rendering', 'done', 'error')),
  input_props JSONB NOT NULL DEFAULT '{}',
  video_url TEXT,
  thumbnail_url TEXT,
  error_message TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  file_size_bytes BIGINT,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(crm_record_id)
);

-- Index for worker to pick up next job efficiently
CREATE INDEX IF NOT EXISTS idx_video_renders_queue
  ON outreach_video_renders (status, priority DESC, queued_at ASC)
  WHERE status = 'queued';

-- Index for looking up render by record
CREATE INDEX IF NOT EXISTS idx_video_renders_record
  ON outreach_video_renders (crm_record_id);

-- Screenshots storage table
CREATE TABLE IF NOT EXISTS website_screenshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'original',
  screenshot_url TEXT NOT NULL,
  width INTEGER NOT NULL DEFAULT 1200,
  height INTEGER NOT NULL DEFAULT 800,
  file_size_bytes BIGINT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(domain, variant)
);

CREATE INDEX IF NOT EXISTS idx_screenshots_domain
  ON website_screenshots (domain);

-- RLS
ALTER TABLE outreach_video_renders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on video renders"
  ON outreach_video_renders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE website_screenshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on screenshots"
  ON website_screenshots FOR ALL USING (true) WITH CHECK (true);

-- Add video_url column to crm_records for quick access
ALTER TABLE crm_records
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_rendered_at TIMESTAMPTZ;
