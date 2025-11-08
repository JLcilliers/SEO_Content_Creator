# 🔍 Worker Debugging & Monitoring System

## Overview

This guide explains the comprehensive debugging and monitoring system created to diagnose and fix worker trigger issues in production.

## 🎯 Problem Being Solved

**Issue**: Job `job_1762591189245_y01z5om` stayed in "pending" status for 6+ minutes without being processed, indicating that:
- Auto-trigger after job creation failed
- Cron backup job didn't pick up the work
- Worker wasn't being invoked properly

## 🛠️ New Debugging Infrastructure

### 1. **Job Debug Endpoint**
**Path**: `/api/jobs/debug/[jobId]`

**Purpose**: Get detailed diagnostic information about any job

**Usage**:
```bash
# Check your stuck job
curl https://your-app.vercel.app/api/jobs/debug/job_1762591189245_y01z5om
```

**Returns**:
- Complete job details with formatted timestamps
- Timing analysis (age, time since last update)
- Stuck job detection with reasons
- Retry recommendations
- Action URLs for force-processing or resetting

**Example Response**:
```json
{
  "job": {
    "id": "job_1762591189245_y01z5om",
    "status": "pending",
    "created_at_formatted": "2025-01-08T10:00:00.000Z",
    "updated_at_formatted": "2025-01-08T10:00:00.000Z"
  },
  "timing": {
    "timeSinceCreationMin": 6,
    "timeSinceUpdateMin": 6
  },
  "analysis": {
    "isStuck": true,
    "shouldRetry": true,
    "stuckReason": "Job has been in 'pending' status for 6 minutes without updates",
    "recommendation": "Use force-process endpoint to manually trigger this job"
  },
  "actions": {
    "forceProcessUrl": "/api/jobs/force-process/job_1762591189245_y01z5om",
    "resetJobUrl": "/api/jobs/reset/job_1762591189245_y01z5om"
  }
}
```

### 2. **Force Process Endpoint**
**Path**: `/api/jobs/force-process/[jobId]` (POST)

**Purpose**: Manually trigger worker to process a specific stuck job

**Usage**:
```bash
# Force process the stuck job
curl -X POST https://your-app.vercel.app/api/jobs/force-process/job_1762591189245_y01z5om
```

**What it does**:
1. Calls the worker endpoint with special headers
2. Passes the job ID to force processing
3. Bypasses the queue and immediately processes that specific job
4. Returns detailed worker response

### 3. **Enhanced Worker with Force Mode**
**Path**: `/api/worker` (POST)

**New Capabilities**:
- Accepts `x-force-job-id` header to process specific jobs
- Accepts `forceJobId` in request body
- Enhanced logging with clear trigger source tracking
- Detailed diagnostic output

**Headers Added**:
```typescript
{
  'x-force-job-id': 'job_123',
  'x-trigger-source': 'manual-force-process'
}
```

**Usage**:
```bash
# Normal invocation (processes next pending job)
curl -X POST https://your-app.vercel.app/api/worker

# Force specific job via header
curl -X POST https://your-app.vercel.app/api/worker \
  -H "x-force-job-id: job_1762591189245_y01z5om"

# Force specific job via body
curl -X POST https://your-app.vercel.app/api/worker \
  -H "Content-Type: application/json" \
  -d '{"forceJobId": "job_1762591189245_y01z5om"}'
```

### 4. **Worker Health Endpoint**
**Path**: `/api/worker/health` (GET)

**Purpose**: Real-time monitoring of worker and job queue health

**Returns**:
```json
{
  "health": {
    "status": "⚠️ WARNING",
    "timestamp": "2025-01-08T10:06:00.000Z"
  },
  "queue": {
    "pendingCount": 1,
    "stuckCount": 1,
    "oldestPendingJob": {
      "id": "job_1762591189245_y01z5om",
      "createdAt": "2025-01-08T10:00:00.000Z",
      "ageMinutes": 6,
      "attempts": 0
    }
  },
  "jobs": {
    "pending": [...],
    "stuck": [...],
    "recent": [...]
  },
  "statistics": {
    "statusDistribution": {
      "pending": 1,
      "completed": 45,
      "failed": 2
    },
    "lastRun": "2025-01-08T10:05:00.000Z"
  }
}
```

### 5. **WorkerHealth UI Component**
**Location**: Visible on main page (bottom-right corner)

**Features**:
- **Real-time monitoring**: Updates every 15 seconds
- **Visual health indicator**: ✅/⚠️/❌ status icons
- **Queue statistics**: Pending and stuck job counts
- **Expandable details**: Click to see full diagnostics
- **One-click actions**:
  - Force process specific stuck jobs
  - Manually trigger worker
  - Refresh health status
- **Job details**: Shows oldest pending job with age and attempts

**Screenshot**:
```
┌─────────────────────────────┐
│ ✅ Worker Health            │
│ 0 pending                   │
└─────────────────────────────┘

[Click to expand for details]
```

### 6. **Job List Endpoint**
**Path**: `/api/jobs/list` (GET)

**Purpose**: List all jobs with filtering

**Query Parameters**:
- `status`: Filter by status (pending, completed, failed, etc.)
- `limit`: Max results (default: 50)

**Usage**:
```bash
# Get all pending jobs
curl https://your-app.vercel.app/api/jobs/list?status=pending

# Get last 100 jobs
curl https://your-app.vercel.app/api/jobs/list?limit=100
```

### 7. **Job Reset Endpoint**
**Path**: `/api/jobs/reset/[jobId]` (POST)

**Purpose**: Reset a failed/stuck job back to pending status

**What it does**:
- Resets status to "pending"
- Resets attempts counter to 0
- Clears progress and error messages
- Re-queues for processing

**Usage**:
```bash
curl -X POST https://your-app.vercel.app/api/jobs/reset/job_1762591189245_y01z5om
```

## 🚀 Immediate Actions for Your Stuck Job

### Step 1: Diagnose the Job
```bash
curl https://your-app.vercel.app/api/jobs/debug/job_1762591189245_y01z5om
```

This will tell you:
- Current status
- How long it's been stuck
- Whether it should be retried
- What action to take

### Step 2: Force Process It
```bash
curl -X POST https://your-app.vercel.app/api/jobs/force-process/job_1762591189245_y01z5om
```

This will:
- Immediately trigger the worker for this specific job
- Bypass the queue system
- Show you the worker's response

### Step 3: Monitor via UI
1. Open your app in browser
2. Look for the "Worker Health" widget in bottom-right
3. Click to expand and see details
4. Use "Force Process" button if job is still stuck

## 📊 Enhanced Logging

The worker now logs:

```
============================================================
[Worker] Worker endpoint called at 2025-01-08T10:06:00.000Z
[Worker] Force job ID: job_1762591189245_y01z5om
[Worker] Trigger source: manual-force-process
[Worker] Environment check: {
  hasSupabaseUrl: true,
  hasSupabaseKey: true,
  hasAnthropicKey: true,
  nodeEnv: 'production'
}
============================================================
[Worker] Reset 0 stuck jobs
[Worker] Cleaned up 0 old jobs
[Worker] FORCE MODE: Processing specific job: job_1762591189245_y01z5om
[Worker] Processing job job_1762591189245_y01z5om (forced: true)
```

## 🔧 Vercel Dashboard Checks

After deploying, check:

1. **Functions Tab**:
   - Look for `/api/worker` invocations
   - Check execution times
   - Look for errors

2. **Logs Tab**:
   - Search for your job ID: `job_1762591189245_y01z5om`
   - Look for worker invocation logs
   - Check for error traces

3. **Cron Jobs Tab**:
   - Verify cron is configured: `*/2 * * * *`
   - Check last execution time
   - Look for failures

## 🎯 Testing the System

### Test 1: Create a New Job
```bash
# Create job via your UI
# Watch the WorkerHealth widget update in real-time
# Check if it processes automatically
```

### Test 2: Manual Worker Trigger
```bash
# Click "Trigger Worker" in WorkerHealth UI
# Or use API:
curl -X POST https://your-app.vercel.app/api/worker
```

### Test 3: Force Process
```bash
# If a job gets stuck:
# 1. Note the job ID from WorkerHealth widget
# 2. Click "Force Process" button on that job
# 3. Watch it process immediately
```

### Test 4: Health Monitoring
```bash
# Check health endpoint:
curl https://your-app.vercel.app/api/worker/health

# Should show:
# - Number of pending jobs
# - Any stuck jobs
# - Recent activity
```

## 📈 What to Look For

### ✅ Good Signs:
- WorkerHealth shows "✅ HEALTHY"
- Pending count is 0 or decreases quickly
- No stuck jobs
- Jobs complete within 2-3 minutes

### ⚠️ Warning Signs:
- Pending count increasing
- Jobs stuck for >5 minutes
- Worker not running (check "Last run" timestamp)
- Same job stuck after force-process

### ❌ Critical Issues:
- Health endpoint returns errors
- Worker fails immediately
- Database connection errors
- Force-process doesn't work

## 🐛 Troubleshooting

### If force-process fails:
1. Check Vercel logs for worker errors
2. Verify environment variables are set
3. Check Supabase connection
4. Look for API rate limits

### If health endpoint fails:
1. Check Supabase credentials
2. Verify database schema
3. Check network connectivity
4. Look for region issues

### If UI widget doesn't update:
1. Check browser console for errors
2. Verify `/api/worker/health` endpoint works
3. Check CORS settings
4. Verify component is mounted

## 📝 Next Steps

1. **Deploy** all changes to Vercel
2. **Check** your stuck job: `/api/jobs/debug/job_1762591189245_y01z5om`
3. **Force process** if still stuck
4. **Monitor** via WorkerHealth widget
5. **Create** a test job to verify auto-trigger works
6. **Review** Vercel logs for insights

## 🔍 Additional Endpoints

### Check specific job:
```bash
GET /api/jobs/debug/[jobId]
```

### Force process job:
```bash
POST /api/jobs/force-process/[jobId]
```

### Reset job:
```bash
POST /api/jobs/reset/[jobId]
```

### List jobs:
```bash
GET /api/jobs/list?status=pending&limit=50
```

### Check health:
```bash
GET /api/worker/health
```

### Trigger worker:
```bash
POST /api/worker
```

## 💡 Pro Tips

1. **Keep WorkerHealth open** while testing - it provides real-time feedback
2. **Check debug endpoint first** before force-processing
3. **Use reset endpoint** if a job has exhausted retries but you want to try again
4. **Monitor health endpoint** to catch issues early
5. **Check Vercel logs** for detailed error traces
