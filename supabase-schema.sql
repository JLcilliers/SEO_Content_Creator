-- Job Queue Table for SEO Content Creator
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('pending', 'crawling', 'generating', 'parsing', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  message TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at BIGINT,

  -- Input data
  input_url TEXT NOT NULL,
  input_topic TEXT NOT NULL,
  input_keywords JSONB NOT NULL,
  input_length INTEGER NOT NULL,
  input_additional_notes TEXT,

  -- Result data (nullable until completed)
  result_meta_title TEXT,
  result_meta_description TEXT,
  result_content_markdown TEXT,
  result_faq_raw TEXT,
  result_schema_json_string TEXT,
  result_pages JSONB,

  -- Error message (nullable unless failed)
  error TEXT
);

-- Index for finding pending jobs quickly
CREATE INDEX IF NOT EXISTS idx_jobs_status_created
ON jobs(status, created_at)
WHERE status = 'pending';

-- Index for retrieving jobs by ID
CREATE INDEX IF NOT EXISTS idx_jobs_id ON jobs(id);

-- Enable Row Level Security (RLS)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for service role (backend)
CREATE POLICY "Allow all for service role" ON jobs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Allow anonymous users to read their own jobs (if needed)
-- This is optional - you can remove if you only want backend access
CREATE POLICY "Allow anonymous read" ON jobs
  FOR SELECT
  USING (true);
