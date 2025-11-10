# ⚡ Quick Fix - 5 Minutes

## The Problem
Database schema mismatch is preventing jobs from processing.

## The Solution (Copy & Paste)

### Step 1: Open Supabase SQL Editor
👉 https://supabase.com/dashboard → Your Project → SQL Editor → New Query

### Step 2: Copy & Paste This SQL

```sql
-- Delete old table
DROP TABLE IF EXISTS jobs CASCADE;

-- Create correct table
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('pending', 'crawling', 'generating', 'parsing', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  message TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at BIGINT,
  input_url TEXT NOT NULL,
  input_topic TEXT NOT NULL,
  input_keywords JSONB NOT NULL,
  input_length INTEGER NOT NULL,
  result_meta_title TEXT,
  result_meta_description TEXT,
  result_content_markdown TEXT,
  result_faq_raw TEXT,
  result_schema_json_string TEXT,
  result_pages JSONB,
  error TEXT
);

CREATE INDEX idx_jobs_status_created ON jobs(status, created_at) WHERE status = 'pending';
CREATE INDEX idx_jobs_id ON jobs(id);
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service role" ON jobs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Allow anonymous read" ON jobs FOR SELECT USING (true);
```

### Step 3: Click "RUN"

You should see: `Success. No rows returned`

### Step 4: Test It Works

```bash
curl -X POST https://seo-content-creator-nine.vercel.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","topic":"Test","keywords":"test","length":500}'
```

### Step 5: Check Status (2 min later)

```bash
# Use the jobId from Step 4
curl https://seo-content-creator-nine.vercel.app/api/jobs/YOUR_JOB_ID
```

## Done! 🎉

Your SEO Content Creator should now:
- ✅ Create jobs
- ✅ Process them automatically
- ✅ Generate actual content
- ✅ Display results in UI

---

**If you see `{"error":"column jobs.input does not exist"}` - you haven't run the SQL yet!**

Go to Supabase and run the SQL from Step 2. That's the fix! 🚀
