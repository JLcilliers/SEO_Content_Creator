# Timeout Diagnostic Guide

Your SEO Content Creator is experiencing 6-minute timeouts. I've deployed comprehensive diagnostic tools to help identify the root cause.

## 🔍 Step 1: Check System Health

Visit this endpoint in your browser:
```
https://seo-content-creator-qtej3kzfx-johan-cilliers-projects.vercel.app/api/health
```

This will show you:
- ✅ Environment variables status (are all API keys set?)
- ✅ Database connectivity (can the app connect to Supabase?)
- ✅ Queue status (how many jobs are pending, stuck, completed, failed?)
- ✅ Recent jobs (last 5 jobs and their status)
- ✅ Stuck jobs (jobs that haven't updated in 5+ minutes)
- ✅ Oldest pending job (how long has it been waiting?)

## 🎯 Step 2: Manual Worker Trigger

If jobs are stuck in pending status, manually trigger the worker:
```
https://seo-content-creator-qtej3kzfx-johan-cilliers-projects.vercel.app/api/worker/manual
```

This will:
- Immediately call the worker endpoint
- Show you the worker's response
- Help identify if the cron job is the issue

## 📊 Step 3: Check Vercel Logs

Go to Vercel Dashboard:
1. Open your project: https://vercel.com/johan-cilliers-projects/seo-content-creator
2. Click "Functions" tab
3. Look for `/api/worker` function
4. Check the logs for:
   - Is the cron job running every minute?
   - Are there any errors when processing jobs?
   - What stage is failing (crawling, generating, parsing)?

## 🐛 Common Issues & Solutions

### Issue 1: Worker Not Running (Jobs Stuck in Pending)
**Symptoms**: `/api/health` shows many pending jobs, no recent updates
**Solution**:
1. Check if cron job is enabled in Vercel Dashboard
2. Verify `NEXT_PUBLIC_APP_URL` environment variable is set
3. Manually trigger with `/api/worker/manual`

### Issue 2: Environment Variables Missing
**Symptoms**: `/api/health` shows `hasAnthropicKey: false` or `hasSupabaseKey: false`
**Solution**:
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Ensure these are set:
   - `ANTHROPIC_API_KEY` (your Claude API key)
   - `NEXT_PUBLIC_SUPABASE_URL` (your Supabase project URL)
   - `SUPABASE_SERVICE_ROLE_KEY` (NOT the anon key!)
3. Redeploy after adding variables

### Issue 3: Database Connection Issues
**Symptoms**: `/api/health` shows `database.connected: false`
**Solution**:
1. Verify Supabase credentials are correct
2. Check if Supabase project is paused (free tier auto-pauses after inactivity)
3. Test direct connection to Supabase from Supabase Dashboard → SQL Editor

### Issue 4: AI Generation Timeout
**Symptoms**: Jobs stuck in "generating" status for long time
**Solution**: Currently being investigated - may need to:
- Reduce `max_tokens` in AI generation
- Add timeout wrapper to Claude API calls
- Break long content into smaller chunks

### Issue 5: Scraping Timeout
**Symptoms**: Jobs stuck in "crawling" status
**Solution**: Reduce scraping scope temporarily:
```env
SCRAPE_MAX_PAGES=3  # Reduce from 5
SCRAPE_CONCURRENCY=2  # Reduce from 3
SCRAPE_TIMEOUT_MS=5000  # Reduce from 8000
```

## 🔧 Immediate Actions

### For Stuck Jobs
If you have specific job IDs that are stuck:

1. **View Job Details**:
   ```
   https://seo-content-creator-qtej3kzfx-johan-cilliers-projects.vercel.app/api/jobs/debug/{jobId}
   ```

2. **Reset Job to Pending**:
   ```
   POST https://seo-content-creator-qtej3kzfx-johan-cilliers-projects.vercel.app/api/jobs/reset/{jobId}
   ```

3. **Force Process Job**:
   ```
   POST https://seo-content-creator-qtej3kzfx-johan-cilliers-projects.vercel.app/api/jobs/force-process/{jobId}
   ```

### View All Jobs
See all jobs in the system:
```
https://seo-content-creator-qtej3kzfx-johan-cilliers-projects.vercel.app/api/jobs/list
```

Filter by status:
```
https://seo-content-creator-qtej3kzfx-johan-cilliers-projects.vercel.app/api/jobs/list?status=pending
https://seo-content-creator-qtej3kzfx-johan-cilliers-projects.vercel.app/api/jobs/list?status=failed
```

## 📝 What to Report Back

After running the diagnostics, please share:

1. **Health Check Results**: Copy the JSON from `/api/health`
2. **Stuck Job Details**: If any, copy details from `/api/jobs/debug/{jobId}`
3. **Vercel Function Logs**: Screenshot or copy logs from Vercel Dashboard
4. **Worker Manual Trigger**: What happened when you called `/api/worker/manual`

## 🎯 Most Likely Root Causes

Based on 6-minute timeout (exactly matching frontend polling limit):

1. **Worker not running at all** (jobs never leave pending)
   - Cron job disabled or not configured
   - Environment variables missing
   - Database connection failed

2. **Worker running but timing out** (jobs stuck in crawling/generating)
   - AI generation taking too long
   - Scraping taking too long
   - No progress updates sent

3. **Caching/stale data issue** (worker thinks no jobs pending)
   - PostgREST cache not being busted correctly
   - Need to verify cache-busting timestamps are working

## 🚀 Next Steps

1. Visit `/api/health` endpoint and copy the JSON response
2. Visit `/api/worker/manual` to trigger worker manually
3. Check Vercel function logs for the worker
4. Report back findings so I can provide targeted fix

The diagnostic endpoints are now live and ready to help identify the exact issue!
