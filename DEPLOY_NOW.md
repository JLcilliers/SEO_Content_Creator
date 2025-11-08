# 🚀 Deploy Worker Debug System

## Quick Deploy (Copy & Paste)

```bash
git add .
git commit -m "Add comprehensive worker debugging and monitoring system

- Add 7 diagnostic API endpoints for job management
- Add WorkerHealth real-time monitoring widget
- Enhance worker with force-process capability
- Add comprehensive documentation and test scripts
- Fix worker trigger issues for stuck jobs"
git push
```

## ⏱️ After Deployment (Wait 1-2 minutes for Vercel)

### Step 1: Check Your Stuck Job
```bash
curl https://your-app.vercel.app/api/jobs/debug/job_1762591189245_y01z5om
```

**What to look for:**
- `"isStuck": true` → Force process it (Step 2)
- `"isStuck": false` → Job already processed or will process soon
- `"status": "completed"` → Job finished (cron eventually got it)
- `"status": "pending"` → Still stuck, use Step 2

### Step 2: Force Process (If Stuck)
```bash
curl -X POST https://your-app.vercel.app/api/jobs/force-process/job_1762591189245_y01z5om
```

**Expected response:**
```json
{
  "success": true,
  "jobId": "job_1762591189245_y01z5om",
  "message": "Worker triggered successfully"
}
```

### Step 3: Verify Processing Started
Wait 10 seconds, then check again:
```bash
curl https://your-app.vercel.app/api/jobs/debug/job_1762591189245_y01z5om | grep status
```

**Should show:** `"status": "crawling"` or `"status": "generating"` or `"status": "completed"`

### Step 4: Monitor System Health
```bash
curl https://your-app.vercel.app/api/worker/health
```

**Healthy output:**
```json
{
  "health": {
    "status": "✅ HEALTHY"
  },
  "queue": {
    "pendingCount": 0,
    "stuckCount": 0
  }
}
```

### Step 5: Check UI Widget
1. Open: `https://your-app.vercel.app`
2. Look bottom-right corner
3. Should see: **WorkerHealth** widget
4. Click to expand and see queue status

## 🧪 Test New Job (Verify Auto-Trigger Works)

1. Go to your app UI
2. Submit a test job:
   - URL: `https://example.com`
   - Topic: `test`
   - Keywords: `test`
   - Length: 500
3. Watch WorkerHealth widget
4. Should process within **10-30 seconds** (not 6+ minutes!)

## 📊 What Success Looks Like

**Immediate (0-2 minutes):**
- ✅ Deployment completes
- ✅ Health endpoint returns data
- ✅ WorkerHealth widget appears on page
- ✅ Debug endpoint shows job details

**Short-term (2-10 minutes):**
- ✅ Stuck job processes (via force or cron)
- ✅ New test job auto-processes quickly
- ✅ WorkerHealth shows "✅ HEALTHY"
- ✅ No stuck jobs in queue

**Long-term (24 hours):**
- ✅ All jobs auto-process consistently
- ✅ No jobs stuck >5 minutes
- ✅ Cron running reliably every 2 minutes
- ✅ Zero manual interventions needed

## 🐛 If Something's Wrong

### Stuck job won't process even after force-process:
```bash
# Reset and try again
curl -X POST https://your-app.vercel.app/api/jobs/reset/job_1762591189245_y01z5om
sleep 5
curl -X POST https://your-app.vercel.app/api/jobs/force-process/job_1762591189245_y01z5om
```

### Health endpoint returns error:
1. Check Vercel logs for error details
2. Verify environment variables set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
3. Test Supabase connection directly

### WorkerHealth widget not showing:
1. Hard refresh browser (Ctrl+Shift+R)
2. Check browser console for errors
3. Verify deployment completed successfully
4. Check if health endpoint works via curl

### New jobs still take 6+ minutes:
1. Check Vercel Functions tab for worker invocations
2. Check Cron Jobs tab for cron schedule
3. Review worker logs for trigger source
4. Check `lib/worker-trigger.ts` for auto-trigger logic

## 📞 Need the Full Docs?

- **Quick Reference**: `QUICK_DEBUG_REFERENCE.md`
- **Complete Guide**: `WORKER_DEBUG_GUIDE.md`
- **Deployment Checklist**: `DEPLOYMENT_READY.md`
- **Troubleshooting**: Check Vercel logs + documentation

## 🎯 TL;DR

```bash
# 1. Deploy
git add . && git commit -m "Add worker debug system" && git push

# 2. Wait 2 minutes for deployment

# 3. Fix your stuck job
curl -X POST https://your-app.vercel.app/api/jobs/force-process/job_1762591189245_y01z5om

# 4. Verify health
curl https://your-app.vercel.app/api/worker/health

# 5. Create test job via UI and watch it process quickly
```

---

**That's it!** Your worker debugging system is ready to deploy. 🚀

The WorkerHealth widget will give you real-time visibility, and the force-process endpoint will immediately fix stuck jobs. Deploy now and resolve that 6-minute stuck job issue!
