# SEO Content Creator - Comprehensive Debugging Guide

## Current Issue: Jobs Never Start Processing

**UPDATE 2025-01-06**: The issue has been identified as **worker auto-trigger failure**. Jobs are created but never leave "pending" status. See [TRIGGER_INVESTIGATION.md](./TRIGGER_INVESTIGATION.md) for detailed diagnosis steps and latest fixes.

## Historical Issue: Job Completes But No Results Display

You're experiencing an issue where:
- Database shows job status as "completed"
- Frontend shows "timeout" or no results
- Content generation appears to work but results don't display

## Debugging Tools Added

### 1. **Server-Side Logging** (Automatic)

The following log messages will appear in your Vercel logs or local console:

#### Worker Logs:
```
[Worker] Job {jobId}: Completing with result data: { hasMetaTitle: true, ... }
[Worker] Job {jobId}: Completed in {ms}ms
```

#### Queue Logs:
```
[Queue] completeJob called for {jobId}: { hasResult: true, ... }
[Queue] Job {jobId} marked as completed in database
[Queue] rowToJob for {jobId}: { status: 'completed', hasResult: true, ... }
```

#### Form (Browser Console):
```
[Form] Polling job status: { jobId, status, hasResult, ... }
[Form] Job completed, checking result...
[Form] Result found, calling onSuccess with: { ... }
```

### 2. **Debug API Endpoint** (NEW)

Access raw database data for any job:

```
GET /api/debug/[jobId]
```

**Example**:
```
https://your-app.vercel.app/api/debug/job_1234567890_abc123
```

**Response**:
```json
{
  "jobId": "job_1234567890_abc123",
  "rawData": {
    // Complete raw database row
    "status": "completed",
    "result_meta_title": "...",
    "result_content_markdown": "...",
    // ... all fields
  },
  "analysis": {
    "status": "completed",
    "progress": 100,
    "hasError": false,
    "hasMetaTitle": true,
    "hasMetaDescription": true,
    "hasContentMarkdown": true,
    "hasFaqRaw": true,
    "hasSchemaJsonString": true,
    "hasPages": true,
    "metaTitleLength": 58,
    "contentLength": 4523,
    "faqLength": 892,
    "pagesCount": 5
  }
}
```

## Step-by-Step Diagnostic Process

### Step 1: Check Browser Console

1. **Open browser developer tools** (F12)
2. **Go to Console tab**
3. **Submit a test job**
4. **Watch for log messages**:

```
[Form] Polling job status: ...
[Form] Job completed, checking result...
```

**Key Questions**:
- Does it show `hasResult: true`?
- Does it show `hasResult: false`?
- Does it throw "Job completed but no result returned" error?

### Step 2: Check Vercel Function Logs

1. **Go to Vercel Dashboard** → Your Project → **Logs**
2. **Filter by**: `/api/worker`
3. **Look for the job ID** you just submitted
4. **Check for these messages**:

```
[Worker] Job {id}: Completing with result data: { hasMetaTitle: true, ... }
[Queue] completeJob called for {id}: { hasResult: true, ... }
[Queue] Job {id} marked as completed in database
```

**Key Questions**:
- Does worker show `hasMetaTitle: true`?
- Does `completeJob` get called with result data?
- Are all `has*` flags true?

### Step 3: Use Debug Endpoint

Get the job ID from your browser console or Vercel logs, then:

```bash
curl https://your-app.vercel.app/api/debug/job_YOUR_JOB_ID
```

Or visit in browser:
```
https://your-app.vercel.app/api/debug/job_YOUR_JOB_ID
```

**Check the `analysis` section**:
- All `has*` fields should be `true`
- `metaTitleLength` should be > 0
- `contentLength` should be > 0 (1000+)
- `pagesCount` should match scraped pages

### Step 4: Check Status Polling

In browser console, look for repeated polling:

```
[Form] Polling job status: { status: 'completed', hasResult: false }
[Form] Polling job status: { status: 'completed', hasResult: false }
```

**If `hasResult` is always `false` but debug endpoint shows data**:
- This indicates a data transformation issue in `rowToJob` function
- Check that `result_meta_title` field exists in database

### Step 5: Check Database Directly (Supabase)

1. **Go to Supabase Dashboard** → SQL Editor
2. **Run this query** (replace JOB_ID):

```sql
SELECT
  id,
  status,
  progress,
  result_meta_title,
  result_meta_description,
  LENGTH(result_content_markdown) as content_length,
  LENGTH(result_faq_raw) as faq_length,
  result_pages
FROM jobs
WHERE id = 'job_YOUR_JOB_ID';
```

**Expected**:
- `status` = 'completed'
- `result_meta_title` = some text (50-60 chars)
- `content_length` = 3000-10000 (depending on target length)
- `faq_length` = 500-2000
- `result_pages` = JSON array with page info

**If these are NULL**:
- Worker completed but didn't save results
- Check worker logs for errors during `completeJob` call

## Common Issues & Solutions

### Issue 1: Database Shows NULL Result Fields

**Symptoms**:
- Supabase shows `result_meta_title` = NULL
- Debug endpoint shows all `has*` = false
- Worker logs show success

**Cause**: `completeJob` function failed silently or database write error

**Solution**:
1. Check worker logs for database errors
2. Verify Supabase service role key is correct
3. Check RLS policies on jobs table

### Issue 2: Frontend Shows "Job completed but no result returned"

**Symptoms**:
- Browser console shows error
- Debug endpoint shows data EXISTS in database
- Database shows result fields are populated

**Cause**: `rowToJob` function not detecting result data

**Root Cause Analysis**:
The function checks `row.result_meta_title` to determine if result exists:

```typescript
result: row.result_meta_title
  ? { /* populate result */ }
  : undefined
```

**Possible Causes**:
1. `result_meta_title` is empty string (not NULL)
2. Field name mismatch in Supabase schema
3. Data type conversion issue

**Solution**:
1. Check debug endpoint `rawData.result_meta_title` value
2. If it's empty string, check parser output
3. Verify Supabase column names match code

### Issue 3: Timeout Before Completion

**Symptoms**:
- Job actually completes in database
- Frontend shows timeout error
- Content exists but user never sees it

**Cause**: Frontend polling timeout (6 minutes) expires before job completes

**Solution**:
1. Check worker duration in logs
2. If > 5 minutes consistently:
   - Reduce `SCRAPE_MAX_PAGES` (default 5)
   - Reduce target word count
   - Simplify prompts
3. If < 5 minutes:
   - Issue is with polling or caching
   - Check for cache-control headers
   - Verify no CDN caching on `/api/jobs/[jobId]`

### Issue 4: Cache Serving Stale Status

**Symptoms**:
- Job completes quickly (2-3 min)
- Frontend keeps showing "pending" or old status
- Eventually times out

**Cause**: Browser or CDN caching job status responses

**Solution** (already implemented):
```typescript
fetch(`/api/jobs/${jobId}`, {
  cache: 'no-store',
  headers: { 'Cache-Control': 'no-cache' },
})
```

**Verify**:
1. Check Network tab in browser dev tools
2. Look for `/api/jobs/[jobId]` requests
3. Verify response headers include `Cache-Control: no-cache`
4. Check that status actually changes over time

## Testing Checklist

After applying fixes, test with these steps:

### ✅ Test 1: Simple Job
```
URL: https://example.com
Topic: About our services
Keywords: services, solutions, expertise
Length: 1500
```

**Expected**:
- Completes in 2-4 minutes
- Browser console shows progress logs
- Results display in UI
- All sections populated

### ✅ Test 2: Check Debug Endpoint
After job completes, access:
```
/api/debug/[jobId]
```

**Expected**:
- All `has*` fields are `true`
- `metaTitleLength` > 0
- `contentLength` > 1000
- `pagesCount` > 0

### ✅ Test 3: Check Vercel Logs
Go to Vercel → Logs → Filter by `/api/worker`

**Expected**:
```
[Worker] Job {id}: Completing with result data: { hasMetaTitle: true, hasMetaDescription: true, hasContentMarkdown: true, hasFaqRaw: true, hasSchemaJsonString: true, pagesCount: 5, metaTitleLength: 58, contentLength: 4523 }
[Queue] completeJob called for {id}: { hasResult: true, hasMetaTitle: true, hasMetaDescription: true, hasContentMarkdown: true, hasFaqRaw: true, hasSchemaJsonString: true, pagesCount: 5 }
[Queue] Job {id} marked as completed in database
```

### ✅ Test 4: Database Verification
Run SQL query in Supabase:

```sql
SELECT status, result_meta_title, LENGTH(result_content_markdown)
FROM jobs
WHERE status = 'completed'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected**:
- Status = 'completed'
- result_meta_title = actual title text
- LENGTH() = large number (3000+)

## Troubleshooting Workflow

```
1. Submit test job
   ↓
2. Open browser console (F12)
   ↓
3. Watch for [Form] logs
   ↓
4. Job completes?
   ├─ YES: Does frontend show results?
   │   ├─ YES: ✅ Working!
   │   └─ NO: Check console for errors
   │       ↓
   │       Check debug endpoint
   │       ↓
   │       Data in database?
   │       ├─ YES: rowToJob issue
   │       └─ NO: completeJob issue
   │
   └─ NO: Check Vercel logs
       ↓
       Worker completed?
       ├─ YES: Check if result saved
       └─ NO: Check worker error logs
```

## Next Steps After Diagnosis

Once you identify the issue using these tools:

1. **Share the logs** with the exact error location
2. **Include debug endpoint output** for failed job
3. **Copy browser console logs** showing the issue
4. **Note which step in the workflow fails**

This will help pinpoint whether the issue is:
- ✅ **Worker** (content generation)
- ✅ **Database** (result storage)
- ✅ **API** (result retrieval)
- ✅ **Frontend** (result display)

## Advanced Debugging: Enable Verbose Logging

For even more detailed logs, add this to worker:

```typescript
// Before completeJob call
console.log('[Worker] Full parsed data:', JSON.stringify(parsed, null, 2));
```

This will show the complete content in logs (may be very large).

## Getting Help

When reporting issues, please include:

1. **Job ID** from browser console or Vercel logs
2. **Debug endpoint output**: `/api/debug/[jobId]`
3. **Browser console logs**: Copy all `[Form]` and `[Queue]` messages
4. **Vercel function logs**: Copy all `[Worker]` and `[Queue]` messages
5. **Supabase query result**: The SELECT query from Step 5 above

---

Built: 2025-01-06
Purpose: Comprehensive debugging for "completed but no results" issue
