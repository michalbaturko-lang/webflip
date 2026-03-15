-- Migration: Add missing columns for variant HTML previews, progress tracking, and extracted assets
-- Run this if your analyses table was created from the original schema without these columns.

ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS html_variants JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS variant_progress JSONB,
  ADD COLUMN IF NOT EXISTS extracted_assets JSONB;
