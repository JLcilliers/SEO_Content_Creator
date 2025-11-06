-- Migration script to add retry fields to existing jobs table
-- Run this ONLY if you already have a jobs table without the attempts/last_attempt_at fields

-- Add attempts column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='jobs' AND column_name='attempts'
  ) THEN
    ALTER TABLE jobs ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add last_attempt_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='jobs' AND column_name='last_attempt_at'
  ) THEN
    ALTER TABLE jobs ADD COLUMN last_attempt_at BIGINT;
  END IF;
END $$;

-- Update existing pending jobs to have 0 attempts
UPDATE jobs SET attempts = 0 WHERE attempts IS NULL;
