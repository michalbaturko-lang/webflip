-- Migration 002: Add columns for batch 3 features
-- (benchmarks, link graph, enrichment, SEO suggestions, templates, PageSpeed, accessibility)
-- Run this in Supabase SQL Editor if these columns are missing.

ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS benchmark_results JSONB,
  ADD COLUMN IF NOT EXISTS link_graph_data JSONB,
  ADD COLUMN IF NOT EXISTS enrichment_results JSONB,
  ADD COLUMN IF NOT EXISTS seo_suggestions JSONB,
  ADD COLUMN IF NOT EXISTS template_clusters JSONB,
  ADD COLUMN IF NOT EXISTS pagespeed_metrics JSONB,
  ADD COLUMN IF NOT EXISTS score_accessibility INT;
