# Deployment Fixes Checklist - Worker Timeout Resolution

## ✅ Changes Applied (Ready for Deployment)

### 1. Enhanced Worker Trigger System (lib/worker-trigger.ts)
**What was fixed:**
- Added multiple URL strategy fallback mechanism
- Tries 4 different URL patterns: VERCEL_URL, NEXT_PUBLIC_VERCEL_URL, NEXT_PUBLIC_BASE_URL, localhost
- Better error handling - doesn't throw on failure, lets cron job take over
- Comprehensive logging for debugging

**Impact:**
- Worker trigger will work in more environments
- Graceful degradation if trigger fails
- Better visibility into what's happening

### 2. Non-Blocking Worker Trigger (app/api/generate/route.ts)
**What was fixed:**
- Changed from `await` to fire-and-forget pattern
- Response returns immediately with job ID
- Worker trigger happens asynchronously
- No longer blocks API response if trigger fails

**Impact:**
- User gets instant feedback
- No timeout on job creation endpoint
- Worker will either trigger immediately OR cron will pick it up within 60s

### 3. Enhanced Worker Logging (app/api/worker/route.ts)
**What was fixed:**
- Added environment variable checks at startup
- Logs maintenance task results (stuck jobs, cleanup)
- Better visibility into worker execution
- Shows when no jobs are pending

**Impact:**
- Easier to debug issues in Vercel logs
- Can verify environment is configured correctly
- Can see if jobs are being processed

### 4. Updated Vercel Configuration (vercel.json)
**What was fixed:**
- Added VERCEL_URL to environment configuration
- Ensures URL is available for worker trigger

**Impact:**
- Worker trigger has access to deployment URL
- Better chance of successful auto-trigger

### 5. New Monitoring Endpoints

#### GET /api/status
**What it shows:**
- Last hour statistics (total jobs, by status)
- Health metrics (stuck jobs, failed jobs, avg processing time)
- Environment configuration check
- System recommendations

**How to use:**
```bash
curl https://your-app.vercel.app/api/status
```

#### GET /api/debug/[jobId] (Already existed, kept)
**What it shows:**
- Raw database data for specific job
- Analysis of result fields
- Content lengths and page counts

---

## 🚀 Deployment Steps

### Step 1: Environment Variables (Vercel Dashboard)
Go to your project → Settings → Environment Variables

**Required variables:**
```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Optional (with defaults):**
```
CLAUDE_MODEL=claude-sonnet-4-5-20250929
SCRAPE_MAX_PAGES=5
SCRAPE_CONCURRENCY=3
SCRAPE_TIMEOUT_MS=8000
PROMPT_TEMPERATURE=0.2
```

### Step 2: Verify Supabase Database
Run this in Supabase SQL Editor to check for stuck jobs:
```sql
-- Check current job states
SELECT status, COUNT(*)
FROM jobs
GROUP BY status;

-- Find any stuck jobs
SELECT id, status, attempts,
       to_timestamp(created_at/1000) as created,
       to_timestamp(updated_at/1000) as updated
FROM jobs
WHERE status IN ('crawling', 'generating', 'parsing')
AND updated_at < EXTRACT(EPOCH FROM NOW() - INTERVAL '10 minutes') * 1000;

-- Manual reset if needed
UPDATE jobs
SET status = 'pending', attempts = 0
WHERE status IN ('crawling', 'generating', 'parsing')
AND updated_at < EXTRACT(EPOCH FROM NOW() - INTERVAL '10 minutes') * 1000;
```

### Step 3: Deploy to Vercel
```bash
git add .
git commit -m "Fix: Enhanced worker trigger with fallback strategies and better logging"
git push origin main
```

Or use Vercel CLI:
```bash
vercel --prod
```

### Step 4: Verify Cron Job
1. Go to Vercel Dashboard → Your Project → Settings → Cron Jobs
2. Verify cron is enabled:
   - Path: `/api/worker`
   - Schedule: `* * * * *` (every minute)
3. Check "Logs" tab to see cron executions

### Step 5: Test the Deployment

**Test 1: Create a job**
```bash
curl -X POST https://your-app.vercel.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "topic": "test topic",
    "keywords": "test,keywords",
    "length": 500
  }'
```

Expected response:
```json
{
  "jobId": "job_1234567890_abc123",
  "message": "Job created successfully..."
}
```

**Test 2: Check job status**
```bash
curl https://your-app.vercel.app/api/jobs/YOUR_JOB_ID
```

**Test 3: Check system status**
```bash
curl https://your-app.vercel.app/api/status
```

Should show healthy stats and environment check.

**Test 4: Monitor Vercel Logs**
1. Go to Vercel Dashboard → Deployments → Latest → Logs
2. Look for:
   - `[Worker Trigger Server] Starting trigger with strategies`
   - `[Worker] Worker endpoint called at`
   - `[Worker] Processing job`
   - `[Worker] Job completed in Xms`

---

## 🔍 Troubleshooting Guide

### Issue: Jobs stuck in "pending"

**Check 1: Cron job enabled?**
- Vercel Dashboard → Settings → Cron Jobs
- Should show active cron for `/api/worker`

**Check 2: Worker logs**
- Vercel Dashboard → Logs
- Search for `[Worker]` to see if worker is running
- Should run every minute

**Check 3: Trigger logs**
- Search for `[Worker Trigger]`
- Should show which URL strategy succeeded/failed

**Manual trigger:**
```bash
curl -X POST https://your-app.vercel.app/api/worker
```

### Issue: Jobs timing out

**Check 1: Environment variables**
```bash
curl https://your-app.vercel.app/api/status
```
Look at `environment` section - all should be `true`

**Check 2: Supabase connection**
- Run status endpoint
- Check if it returns data or errors

**Check 3: Processing time**
- Check status endpoint for `avgProcessingTimeMs`
- Should be under 120,000ms (2 minutes)
- If higher, consider reducing SCRAPE_MAX_PAGES

### Issue: Multiple failures

**Check 1: API key issues**
```bash
# In Vercel logs, look for:
# "Invalid API key" - ANTHROPIC_API_KEY wrong
# "Model not found" - Check CLAUDE_MODEL value
# "Rate limit" - Too many requests, wait
```

**Check 2: Scraping issues**
```bash
# Look for:
# "No content could be extracted"
# "Failed to crawl"
# Solution: Test with a different URL
```

---

## 📊 Monitoring Checklist (Post-Deployment)

### First 5 minutes:
- [ ] Create a test job via UI
- [ ] Check Vercel logs for worker trigger
- [ ] Verify job completes successfully
- [ ] Check `/api/status` shows healthy stats

### First hour:
- [ ] Create 2-3 real jobs
- [ ] Monitor completion rate in `/api/status`
- [ ] Check for any stuck or failed jobs
- [ ] Verify average processing time is reasonable

### Daily:
- [ ] Check `/api/status` for health
- [ ] Review failed jobs if any
- [ ] Monitor cron job execution logs

---

## 🎯 Expected Behavior After Fixes

### Normal Flow:
1. User submits form → Job created instantly (jobId returned in <1s)
2. Worker auto-trigger fires (tries 4 URL strategies)
3. If auto-trigger succeeds → Job starts processing immediately
4. If auto-trigger fails → Cron picks up job within 60 seconds
5. Job processes through stages: crawling → generating → parsing
6. Job completes, result stored in database
7. Frontend polls and receives completed result

### Timing:
- **Job creation**: <1 second
- **Worker pickup**: 0-60 seconds (0 if auto-trigger works, <60 if cron)
- **Crawling**: 10-30 seconds (3 pages × 6s timeout)
- **Generating**: 30-60 seconds (AI processing)
- **Parsing**: <1 second
- **Total**: 60-120 seconds typical

---

## 🆘 Emergency Fixes

### If jobs are completely stuck:

**Option 1: Manual worker trigger**
```bash
# Keep running this until jobs clear
curl -X POST https://your-app.vercel.app/api/worker
```

**Option 2: Reset all stuck jobs via Supabase**
```sql
UPDATE jobs
SET status = 'pending', attempts = 0
WHERE status IN ('crawling', 'generating', 'parsing');
```

**Option 3: Reduce processing time**
Update environment variables in Vercel:
```
SCRAPE_MAX_PAGES=2
SCRAPE_TIMEOUT_MS=5000
```
Redeploy.

---

## ✨ New Features Available

### System Status Dashboard
Access at: `https://your-app.vercel.app/api/status`

Shows:
- Job statistics (last hour)
- System health
- Environment configuration
- Processing time averages
- Recommendations

### Job Debug View
Access at: `https://your-app.vercel.app/api/debug/[jobId]`

Shows:
- Raw database data
- Field-by-field analysis
- Content lengths
- Page counts

---

## 📝 Notes

### What these fixes solve:
✅ Worker trigger failures causing jobs to wait
✅ Timeout on job creation endpoint
✅ Missing visibility into system health
✅ Difficult debugging in production

### What still requires monitoring:
⚠️ Individual job failures (API key, rate limits, site issues)
⚠️ Supabase connection issues
⚠️ Processing time for very large sites

### Best practices going forward:
- Check `/api/status` daily
- Monitor Vercel logs for errors
- Keep SCRAPE_MAX_PAGES reasonable (3-5)
- Ensure environment variables are set correctly

---

## 🎉 Success Indicators

Your deployment is successful if:
1. ✅ Jobs complete within 2 minutes
2. ✅ `/api/status` shows 0 stuck jobs
3. ✅ Completion rate >90%
4. ✅ Worker logs show regular processing
5. ✅ No timeout errors in Vercel logs

---

## 📧 Support

If issues persist after these fixes:
1. Check Vercel logs (full error messages)
2. Run `/api/status` and share output
3. Check Supabase job table directly
4. Review DEBUGGING_GUIDE.md for additional tips
