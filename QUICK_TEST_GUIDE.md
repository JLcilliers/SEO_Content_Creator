# Quick Test Guide - Local & Production

## 🏠 Local Testing (Before Deployment)

### Prerequisites
```bash
# 1. Ensure .env.local has Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
ANTHROPIC_API_KEY=sk-ant-...
```

### Start Development Server
```bash
npm run dev
# Server starts at http://localhost:3000
```

### Test 1: Check Status Endpoint
```bash
curl http://localhost:3000/api/status
```

**Expected:** JSON with system stats (or error if Supabase not configured)

### Test 2: Manual Worker Trigger
```bash
curl -X POST http://localhost:3000/api/worker
```

**Expected:**
- `{"message": "No pending jobs"}` if queue is empty
- Or job processing output if jobs exist

### Test 3: Create Test Job
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://example.com\",\"topic\":\"test\",\"keywords\":\"test\",\"length\":500}"
```

**Expected:** `{"jobId": "job_...", "message": "..."}`

### Test 4: Check Job Status
```bash
# Replace JOB_ID with the ID from Test 3
curl http://localhost:3000/api/jobs/JOB_ID
```

**Expected:** Job status with progress updates

### Test 5: Debug View
```bash
curl http://localhost:3000/api/debug/JOB_ID
```

**Expected:** Raw database data with analysis

---

## ☁️ Production Testing (Vercel)

### Test 1: System Health Check
```bash
# Replace YOUR-APP with your Vercel deployment
curl https://YOUR-APP.vercel.app/api/status
```

**Look for:**
- ✅ `environment.hasAnthropicKey: true`
- ✅ `environment.hasSupabaseKey: true`
- ✅ `environment.hasSupabaseUrl: true`
- ✅ `health.stuckJobs: 0`
- ✅ `worker.recommendation: "System healthy"`

### Test 2: Create Real Job
Open browser: `https://YOUR-APP.vercel.app`

Fill form:
- URL: `https://anthropic.com` (or your target site)
- Topic: `Benefits of AI assistance`
- Keywords: `AI, productivity, automation`
- Length: `1000`

Click "Generate Content"

**Watch for:**
- Loading spinner appears immediately
- Progress updates every 2 seconds
- Completes within 2 minutes
- Results display with all sections

### Test 3: Check Vercel Logs
1. Go to Vercel Dashboard
2. Select your project
3. Click "Logs" tab
4. Filter by "Error" or search for "[Worker]"

**Look for:**
```
[Worker Trigger Server] Starting trigger with strategies
[Worker] Worker endpoint called at [timestamp]
[Worker] Processing job job_xxx
[Worker] Job completed in Xms
```

### Test 4: Verify Cron Job
Vercel Dashboard → Settings → Cron Jobs

**Should show:**
- Path: `/api/worker`
- Schedule: `* * * * *`
- Status: Active/Enabled
- Last Run: Within last minute

---

## 🐛 Common Issues & Quick Fixes

### Issue: "No pending jobs" but UI stuck loading

**Check:**
```bash
curl https://YOUR-APP.vercel.app/api/jobs/YOUR_JOB_ID
```

**If status is "failed":**
- Check error message in response
- Look at Vercel logs for details

**If status is "pending" for >2 minutes:**
```bash
# Manual trigger
curl -X POST https://YOUR-APP.vercel.app/api/worker
```

### Issue: "Failed to create job"

**Check environment variables:**
```bash
curl https://YOUR-APP.vercel.app/api/status
```

Look at `environment` section - all should be `true`

**If any are false:**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add missing variables
3. Redeploy

### Issue: Jobs timeout/stuck

**Check processing time:**
```bash
curl https://YOUR-APP.vercel.app/api/status
```

Look at `health.avgProcessingTimeSec`

**If >180 seconds:**
- Consider reducing `SCRAPE_MAX_PAGES` to 3
- Reduce `SCRAPE_TIMEOUT_MS` to 6000
- Test with simpler websites

### Issue: Worker not triggering

**Check logs for:**
```
[Worker Trigger Server] FAILED with all URLs
```

**Quick fix:**
1. Ensure cron job is enabled (runs every minute)
2. Jobs will process, just with 0-60s delay
3. Check VERCEL_URL is set in environment

---

## 📊 Performance Benchmarks

### Healthy System:
- Job creation: <1 second
- Worker pickup: 0-60 seconds
- Crawling (3 pages): 15-25 seconds
- AI generation: 30-60 seconds
- Parsing: <1 second
- **Total: 60-120 seconds**

### Warning Signs:
- ⚠️ Job creation >3 seconds → Check API response time
- ⚠️ Worker pickup >90 seconds → Cron may not be running
- ⚠️ Crawling >60 seconds → Reduce max pages or timeout
- ⚠️ AI generation >120 seconds → Rate limiting or slow response
- ⚠️ Total >180 seconds → Optimize configuration

---

## ✅ Pre-Deployment Checklist

- [ ] Build succeeds locally (`npm run build`)
- [ ] Status endpoint works locally
- [ ] Worker endpoint responds (even with "no pending jobs")
- [ ] Test job completes successfully locally
- [ ] All environment variables ready for Vercel
- [ ] Supabase database accessible
- [ ] Anthropic API key valid

---

## ✅ Post-Deployment Checklist

- [ ] `/api/status` shows all environment vars as `true`
- [ ] Cron job enabled and running every minute
- [ ] Test job completes within 2 minutes
- [ ] Worker logs appear in Vercel logs
- [ ] No error spikes in logs
- [ ] Average processing time <120 seconds

---

## 🎯 Success Criteria

Your system is working correctly if:

1. **Response Time:** Job ID returned instantly (<1s)
2. **Processing Time:** Jobs complete in 60-120 seconds
3. **Success Rate:** >90% of jobs complete successfully
4. **Health Status:** `/api/status` shows 0 stuck jobs
5. **Worker Logs:** Show regular processing in Vercel logs

---

## 📞 Quick Commands Reference

```bash
# Check system health
curl https://YOUR-APP.vercel.app/api/status

# Create job
curl -X POST https://YOUR-APP.vercel.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","topic":"test","keywords":"test","length":500}'

# Check job
curl https://YOUR-APP.vercel.app/api/jobs/JOB_ID

# Debug job
curl https://YOUR-APP.vercel.app/api/debug/JOB_ID

# Manual worker trigger
curl -X POST https://YOUR-APP.vercel.app/api/worker
```

---

## 🔥 Emergency Commands

### Reset all stuck jobs (Supabase SQL Editor)
```sql
UPDATE jobs SET status = 'pending', attempts = 0
WHERE status IN ('crawling', 'generating', 'parsing')
AND updated_at < EXTRACT(EPOCH FROM NOW() - INTERVAL '10 minutes') * 1000;
```

### Clear old jobs
```sql
DELETE FROM jobs
WHERE status IN ('completed', 'failed')
AND updated_at < EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000;
```

### Check job queue
```sql
SELECT status, COUNT(*) FROM jobs GROUP BY status;
```
