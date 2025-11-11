-- Migration: Add input_additional_notes column to jobs table
-- Run this in your Supabase SQL Editor

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS input_additional_notes TEXT;

COMMENT ON COLUMN jobs.input_additional_notes IS 'Optional user guidance for AI content generation (restrictions, requirements, tone preferences)';
