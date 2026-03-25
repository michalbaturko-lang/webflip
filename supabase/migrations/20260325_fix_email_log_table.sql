-- Fix table name: rename singular to plural to match codebase convention
-- (only runs if singular table exists and plural doesn't)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'outreach_email_log')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'outreach_email_logs')
  THEN
    ALTER TABLE outreach_email_log RENAME TO outreach_email_logs;
    -- Rename indexes too
    ALTER INDEX IF EXISTS idx_outreach_email_log_record RENAME TO idx_outreach_email_logs_record;
    ALTER INDEX IF EXISTS idx_outreach_email_log_sequence RENAME TO idx_outreach_email_logs_sequence;
  END IF;
END $$;

-- Add delivered_at column if missing
ALTER TABLE outreach_email_logs
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
