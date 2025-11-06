# Worker Trigger Investigation - Action Required

## Problem Identified

**Jobs are created but never processed** - they stay in "pending" status forever because:
1. Auto-trigger system is not working
2. Cron job backup is not working either

## Changes Deployed (Commit 533daf9)

### Enhanced Logging

Added comprehensive logging to identify exactly where the trigger fails:

#### In `app/api/generate/route.ts`:
```
[API] Created job {jobId}
[API] Attempting to auto-trigger worker...
[API] Worker auto-trigger succeeded  OR  [API] Worker auto-trigger FAILED: {error}
```

#### In `lib/worker-trigger.ts` (`autoTriggerWorkerServer`):
```
[Worker Trigger Server] Starting trigger, base URL: {url}
[Worker Trigger Server] Environment: VERCEL_URL= {value}
[Worker Trigger Server] Environment: NEXT_PUBLIC_BASE_URL= {value}
[Worker Trigger Server] Trigger completed successfully  OR  ERROR triggering worker
```

#### In `lib/worker-trigger.ts` (`triggerWorker`):
```
[Worker Trigger] Triggering worker at: {url}
[Worker Trigger] Using fetch implementation: {type}
[Worker Trigger] Response status: {status}
[Worker Trigger] Worker response: {json}
```

### Technical Improvements

1. **Changed from fire-and-forget to await pattern**
   - Old: `fetch().catch()` - errors swallowed silently
   - New: `await fetch()` with proper error handling

2. **Added 30-second timeout**
   - Prevents infinite hanging if worker doesn't respond
   - `signal: AbortSignal.timeout(30000)`

3. **Better error propagation**
   - Errors now bubble up through the call chain
   - Each layer logs and re-throws for visibility

4. **Environment variable logging**
   - Will show which URL is being used
   - Helps diagnose VERCEL_URL issues

## What to Test Next

### Step 1: Trigger a Test Job

1. **Deploy to Vercel** (already pushed to GitHub)
2. **Open Vercel Logs** before submitting
3. **Submit a test job** through the UI
4. **Watch for these log messages** in order:

```
✅ Expected Flow:
[API] Created job job_XXXXX
[API] Attempting to auto-trigger worker...
[Worker Trigger Server] Starting trigger, base URL: https://your-app.vercel.app
[Worker Trigger Server] Environment: VERCEL_URL= your-app.vercel.app
[Worker Trigger] Triggering worker at: https://your-app.vercel.app/api/worker
[Worker Trigger] Using fetch implementation: function
[Worker Trigger] Response status: 200 OK
[Worker Trigger] Worker response: { success: true, jobId: ... }
[Worker Trigger Server] Trigger completed successfully
[API] Worker auto-trigger succeeded
```

```
❌ If Auto-Trigger Fails (Look for):
[API] Worker auto-trigger FAILED: {error details}
[Worker Trigger Server] ERROR triggering worker: {error}
[Worker Trigger] Failed to trigger worker: {error}
```

### Step 2: Check Cron Job Status

Even if auto-trigger fails, the cron job should pick up jobs within 60 seconds.

**To verify cron is working:**

1. Go to Vercel Dashboard → Project → Settings → Crons
2. Check if cron job is listed and enabled
3. Look for cron execution logs (should run every minute)
4. If cron is NOT listed, you need to enable it in Vercel dashboard

**Cron configuration in `vercel.json`:**
```json
{
  "crons": [
    {
      "path": "/api/worker",
      "schedule": "* * * * *"  // Every minute
    }
  ]
}
```

### Step 3: Identify the Root Cause

Based on the logs, we'll identify one of these issues:

#### Scenario A: Fetch Implementation Missing
```
[Worker Trigger] Using fetch implementation: undefined
```
**Solution**: Install node-fetch or use Vercel's fetch polyfill

#### Scenario B: Wrong URL
```
[Worker Trigger Server] Environment: VERCEL_URL= not set
[Worker Trigger] Triggering worker at: http://localhost:3000/api/worker
```
**Solution**: Set VERCEL_URL environment variable in Vercel dashboard

#### Scenario C: Network/Permission Error
```
[Worker Trigger] Failed to trigger worker: TypeError: fetch failed
```
**Solution**: Check Vercel function permissions and networking

#### Scenario D: Worker Endpoint Error
```
[Worker Trigger] Response status: 500 Internal Server Error
```
**Solution**: Check worker logs for the actual error

#### Scenario E: Cron Not Configured
- No cron logs appear in Vercel
- Jobs never process even after 5+ minutes

**Solution**: Manually enable cron in Vercel dashboard

## Temporary Workaround

If both auto-trigger and cron fail, you can manually trigger the worker:

```bash
# Manual trigger via API
curl -X POST https://your-app.vercel.app/api/worker

# Or open in browser:
https://your-app.vercel.app/api/worker
```

This will process one pending job immediately.

## Expected Outcome

After deployment:

1. **Immediate logging** will show exactly where trigger fails
2. **Cron backup** should process jobs within 60 seconds
3. **Debug endpoint** will show job data: `/api/debug/{jobId}`

## Next Actions

1. ✅ **Deploy** - Already pushed to GitHub (commit 533daf9)
2. 🔄 **Wait for Vercel deployment** to complete
3. 🧪 **Test** - Submit a job and check logs
4. 📊 **Share logs** - Copy the trigger logs from Vercel
5. 🔧 **Apply fix** - Based on what logs reveal

---

**Created**: 2025-01-06
**Commit**: 533daf9
**Status**: Awaiting deployment and testing
