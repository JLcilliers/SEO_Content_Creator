# 🚀 Quick Debug Reference Card

## One-Line Commands (Copy & Paste)

### Check Stuck Job
```bash
curl https://your-app.vercel.app/api/jobs/debug/job_1762591189245_y01z5om
```

### Force Process Stuck Job
```bash
curl -X POST https://your-app.vercel.app/api/jobs/force-process/job_1762591189245_y01z5om
```

### Check Overall Health
```bash
curl https://your-app.vercel.app/api/worker/health
```

### List All Pending Jobs
```bash
curl https://your-app.vercel.app/api/jobs/list?status=pending
```

### Manual Worker Trigger
```bash
curl -X POST https://your-app.vercel.app/api/worker
```

### Reset a Job
```bash
curl -X POST https://your-app.vercel.app/api/jobs/reset/JOB_ID
```

---

## Quick Diagnostics

### Is the worker healthy?
```bash
curl https://your-app.vercel.app/api/worker/health | jq '.health.status'
# ✅ "✅ HEALTHY" = Good
# ⚠️ "⚠️ WARNING" = Jobs stuck
# ❌ "❌ ERROR" = System issue
```

### How many pending jobs?
```bash
curl https://your-app.vercel.app/api/worker/health | jq '.queue.pendingCount'
# 0 = Good
# >0 for >5min = Problem
```

### Is my job stuck?
```bash
curl https://your-app.vercel.app/api/jobs/debug/YOUR_JOB_ID | jq '.analysis.isStuck'
# true = Force process it
# false = Wait or check again
```

---

## UI Quick Actions

1. **Open your app**: `https://your-app.vercel.app`
2. **Look bottom-right**: WorkerHealth widget
3. **Click to expand**: See all details
4. **Click "Force Process"**: On stuck jobs
5. **Click "Trigger Worker"**: Manual execution

---

## Common Scenarios

### Scenario 1: Job stuck for 6+ minutes
```bash
# Diagnose
curl https://your-app.vercel.app/api/jobs/debug/JOB_ID

# Force process
curl -X POST https://your-app.vercel.app/api/jobs/force-process/JOB_ID

# Verify started
curl https://your-app.vercel.app/api/jobs/debug/JOB_ID | jq '.job.status'
```

### Scenario 2: Many pending jobs
```bash
# Check how many
curl https://your-app.vercel.app/api/jobs/list?status=pending | jq '.count'

# Trigger worker to process queue
curl -X POST https://your-app.vercel.app/api/worker

# Check again in 2 minutes
curl https://your-app.vercel.app/api/worker/health
```

### Scenario 3: Job failed after 3 attempts
```bash
# Get job details
curl https://your-app.vercel.app/api/jobs/debug/JOB_ID

# Reset to try again
curl -X POST https://your-app.vercel.app/api/jobs/reset/JOB_ID

# Force process
curl -X POST https://your-app.vercel.app/api/jobs/force-process/JOB_ID
```

---

## Status Meanings

### Job Status
- `pending` = Waiting in queue
- `crawling` = Fetching pages
- `generating` = AI writing content
- `parsing` = Formatting output
- `completed` = Done ✅
- `failed` = Error ❌

### Health Status
- `✅ HEALTHY` = All good
- `⚠️ WARNING` = Jobs stuck >5min
- `❌ ERROR` = System failure

---

## Vercel Dashboard Quick Checks

### Functions Tab
1. Go to: Vercel Dashboard → Your Project → Functions
2. Look for: `/api/worker`
3. Should see: Invocations every ~2 minutes
4. If not: Cron not working

### Logs Tab
1. Go to: Vercel Dashboard → Your Project → Logs
2. Search: `[Worker] Processing job`
3. Should see: Recent entries
4. If not: Worker not running

### Cron Jobs Tab
1. Go to: Vercel Dashboard → Your Project → Cron Jobs
2. Check: `*/2 * * * *` scheduled
3. Last run: Should be <2 min ago
4. If failed: Check logs

---

## Emergency Actions

### Nothing working?
```bash
# 1. Check if app is up
curl https://your-app.vercel.app

# 2. Check database connection
curl https://your-app.vercel.app/api/worker/health

# 3. Check environment variables in Vercel

# 4. Check Vercel logs for errors

# 5. Redeploy
git commit --allow-empty -m "Redeploy"
git push
```

### Job stuck forever?
```bash
# Last resort: Reset and force process
curl -X POST https://your-app.vercel.app/api/jobs/reset/JOB_ID
sleep 2
curl -X POST https://your-app.vercel.app/api/jobs/force-process/JOB_ID
```

---

## PowerShell Versions (Windows)

### Check Stuck Job
```powershell
Invoke-RestMethod -Uri "https://your-app.vercel.app/api/jobs/debug/job_1762591189245_y01z5om"
```

### Force Process
```powershell
Invoke-RestMethod -Uri "https://your-app.vercel.app/api/jobs/force-process/job_1762591189245_y01z5om" -Method Post
```

### Check Health
```powershell
Invoke-RestMethod -Uri "https://your-app.vercel.app/api/worker/health"
```

---

## Testing Locally

### Start dev server
```bash
npm run dev
```

### Run test script
```bash
# Bash (Linux/Mac)
bash scripts/test-debug-system.sh

# PowerShell (Windows)
powershell scripts/test-debug-system.ps1
```

### Test endpoints
```bash
# Health
curl http://localhost:3000/api/worker/health

# List jobs
curl http://localhost:3000/api/jobs/list

# Worker
curl -X POST http://localhost:3000/api/worker
```

---

## Need Help?

1. **Check documentation**: `WORKER_DEBUG_GUIDE.md`
2. **Check logs**: Vercel Dashboard → Logs
3. **Use debug endpoint**: `/api/jobs/debug/[jobId]`
4. **Check health**: `/api/worker/health`
5. **Review**: `TROUBLESHOOTING.md`

---

## Quick Deploy

```bash
git add .
git commit -m "Fix worker trigger issues"
git push
```

Then wait 1-2 minutes and test!

---

**Remember**: The WorkerHealth widget on your page provides real-time monitoring and one-click actions! 🎯
