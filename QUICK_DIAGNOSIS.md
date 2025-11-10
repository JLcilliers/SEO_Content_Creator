# Quick Diagnosis Steps

## 🚨 6-Minute Timeout Issue

Your jobs are timing out after exactly 6 minutes. This matches the frontend polling limit (180 attempts × 2 seconds).

## ⚡ Quick Check (Do This First)

### 1. Check System Health
Open this URL in your browser:
```
https://seo-content-creator-qtej3kzfx-johan-cilliers-projects.vercel.app/api/health
```

**Look for:**
- `status`: Should be `"✅ HEALTHY"` not `"⚠️ WARNING"`
- `environment.hasAnthropicKey`: Should be `true`
- `environment.hasSupabaseKey`: Should be `true`
- `database.connected`: Should be `true`
- `queue.pending`: Number of pending jobs
- `jobs.stuck`: Should be empty array `[]`

### 2. Manual Worker Trigger
Open this URL to manually trigger the worker:
```
https://seo-content-creator-qtej3kzfx-johan-cilliers-projects.vercel.app/api/worker/manual
```

**Look for:**
- `success`: Should be `true`
- `triggered`: Should be `true`
- `response.body.message`: Should NOT be "No pending jobs" if you have pending jobs

## 🔍 Detailed Diagnosis

### Check #1: Are Environment Variables Set?

**Visit:** `/api/health`

**If you see:**
```json
{
  "environment": {
    "hasAnthropicKey": false,  // ❌ Problem!
    "hasSupabaseKey": false,   // ❌ Problem!
    "hasSupabaseUrl": false    // ❌ Problem!
  }
}
```

**Fix:**
1. Go to Vercel Dashboard: https://vercel.com/johan-cilliers-projects/seo-content-creator
2. Click "Settings" → "Environment Variables"
3. Add these variables:
   - `ANTHROPIC_API_KEY` = your Claude API key
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL (format: https://xxxxx.supabase.co)
   - `SUPABASE_SERVICE_ROLE_KEY` = your service role key (NOT anon key!)
4. Redeploy: `vercel --prod`

### Check #2: Is Database Connected?

**Visit:** `/api/health`

**If you see:**
```json
{
  "database": {
    "connected": false,
    "error": "some error message"
  }
}
```

**Possible Causes:**
1. **Supabase project paused** (free tier auto-pauses after 7 days inactivity)
   - Go to https://supabase.com/dashboard
   - Check if project shows "Paused" status
   - Click "Resume" if paused

2. **Wrong credentials**
   - Verify `NEXT_PUBLIC_SUPABASE_URL` in Vercel matches Supabase dashboard
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is the service role key, not anon key

3. **Network issue**
   - Try connecting from Supabase SQL Editor
   - Check if you have any IP restrictions

### Check #3: Is Worker Running?

**Visit:** `/api/health`

**If you see many pending jobs but no recent activity:**
```json
{
  "queue": {
    "pending": 5,  // Jobs waiting
    "completed": 0,
    "failed": 0
  },
  "jobs": {
    "recent": [],  // No recent jobs!
    "oldestPending": {
      "waitingForMinutes": 45  // ❌ Jobs stuck for 45 minutes!
    }
  }
}
```

**This means the worker isn't running. Check:**

1. **Cron Job Status**
   - Go to Vercel Dashboard → Functions → Crons
   - Verify cron job shows as "Active"
   - Check "Last Execution" time - should be within last 1 minute

2. **Manual Trigger Test**
   - Visit: `/api/worker/manual`
   - Should immediately process a job
   - If this works but cron doesn't, the cron job is the problem

3. **Function Logs**
   - Go to Vercel Dashboard → Functions
   - Click on `/api/worker`
   - Click "View Logs"
   - Should see logs every minute if cron is working

### Check #4: Worker Running But Jobs Timing Out

**Visit:** `/api/health`

**If you see:**
```json
{
  "jobs": {
    "stuck": [
      {
        "id": "abc123",
        "status": "generating",  // Stuck in AI generation
        "stuckForMinutes": 15
      }
    ]
  }
}
```

**This means worker is running but timing out during processing.**

**Check which stage it's stuck in:**
- `"crawling"` - Scraping is taking too long
- `"generating"` - AI generation is taking too long
- `"parsing"` - Parsing is taking too long (rare)

**Temporary Fix - Reduce Scope:**

Add these to Vercel environment variables:
```
SCRAPE_MAX_PAGES=3         # Reduce from 5
SCRAPE_CONCURRENCY=2       # Reduce from 3
SCRAPE_TIMEOUT_MS=5000     # Reduce from 8000
```

Then redeploy.

## 🎯 Quick Recovery Actions

### Reset All Stuck Jobs
If you have stuck jobs, reset them:

1. Visit: `/api/jobs/list?status=pending`
2. Copy all job IDs
3. For each job ID, visit:
   ```
   POST /api/jobs/reset/{jobId}
   ```
   (You'll need to use curl, Postman, or Thunder Client)

### Force Process a Specific Job
If you want to immediately process a specific job:

```bash
# Using curl
curl -X POST https://seo-content-creator-qtej3kzfx-johan-cilliers-projects.vercel.app/api/jobs/force-process/{jobId}

# Using browser (install Thunder Client extension)
POST /api/jobs/force-process/{jobId}
```

## 📊 Understanding the Timeout

**Frontend Polling Logic:**
- Polls every 2 seconds
- Maximum 180 attempts
- Total timeout: 180 × 2s = 360s = 6 minutes

**Worker Timeout:**
- Vercel function timeout: 300 seconds (5 minutes)
- If worker exceeds 5 minutes, it's killed
- Job stays in "generating" or "crawling" status forever

**The Issue:**
The worker is either:
1. Not running at all (cron issue or env vars)
2. Running but exceeding 5-minute limit
3. Running but not updating job status

## 🚀 What to Do Next

1. **Visit `/api/health`** - Copy the entire JSON response
2. **Visit `/api/worker/manual`** - See if manual trigger works
3. **Check Vercel Dashboard** - Look at function logs for `/api/worker`
4. **Report back** - Share the JSON from step 1 and what you see in step 3

Once I see the health check results, I can provide a targeted fix!

## 📞 Getting Help

Share these with me:
1. Complete JSON from `/api/health`
2. Screenshot of Vercel function logs
3. What happens when you visit `/api/worker/manual`
4. Any specific job ID that's stuck (so I can check details)

---

**Current Deployment:**
- Production URL: https://seo-content-creator-qtej3kzfx-johan-cilliers-projects.vercel.app
- Health Check: https://seo-content-creator-qtej3kzfx-johan-cilliers-projects.vercel.app/api/health
- Manual Trigger: https://seo-content-creator-qtej3kzfx-johan-cilliers-projects.vercel.app/api/worker/manual
