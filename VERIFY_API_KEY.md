# 🔑 Verify ANTHROPIC_API_KEY in Vercel

## Current Situation

We confirmed that `ANTHROPIC_API_KEY` exists in Vercel (last updated Nov 4), but we need to verify it's **valid and not expired**.

## Quick Verification

### Option 1: Test Via API (Easiest)

After fixing the database schema, create a test job. If it generates content, your API key is working!

```bash
# Create job
curl -X POST https://seo-content-creator-nine.vercel.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","topic":"Test","keywords":"test","length":500}'

# Wait 3 minutes, then check (replace JOB_ID):
curl https://seo-content-creator-nine.vercel.app/api/jobs/JOB_ID
```

**If you see `result.contentMarkdown` with actual content** → API key is valid ✅

**If you see an error about "invalid API key"** → Need to update it ❌

### Option 2: Check in Vercel Dashboard

1. Go to: https://vercel.com/johan-cilliers-projects/seo-content-creator/settings/environment-variables
2. Find `ANTHROPIC_API_KEY` in the list
3. Click the "..." menu button
4. Click "Edit"
5. The value field will show: `sk-ant-api03-...`
6. Copy the FULL value

### Option 3: Get Fresh API Key from Anthropic

If you need a new key:

1. Go to: https://console.anthropic.com/settings/keys
2. Create a new API key
3. Copy it (starts with `sk-ant-api03-`)
4. Add it to Vercel:
   - Go to Vercel env vars
   - Click "..." on ANTHROPIC_API_KEY
   - Click "Edit"
   - Paste new key
   - Save
5. Redeploy:
   ```bash
   git commit --allow-empty -m "Redeploy with new API key"
   git push
   ```

## How to Tell If API Key is the Problem

### Signs of Working API Key:
- ✅ Jobs generate content (check `result_content_markdown`)
- ✅ No Anthropic-related errors in Vercel logs
- ✅ Worker processes complete successfully

### Signs of Broken API Key:
- ❌ Error in logs: "invalid api key"
- ❌ Error in logs: "authentication failed"
- ❌ Jobs complete but `result_content_markdown` is null
- ❌ Worker errors mentioning Anthropic

## Check Vercel Logs

1. Go to: https://vercel.com/johan-cilliers-projects/seo-content-creator/logs
2. Filter by Function: `/api/worker`
3. Look for recent executions
4. Search for errors mentioning "anthropic" or "api key"

**No errors = API key is working fine!** ✅

## Current Assessment

Based on our investigation:
- ✅ ANTHROPIC_API_KEY exists in Vercel
- ✅ Updated recently (Nov 4)
- ✅ Same format as your local key (`sk-ant-api03-...`)

**Likely conclusion**: The API key is fine. The real issue is the database schema.

## Action Plan

1. ✅ **First**: Fix database schema (see QUICK_FIX.md)
2. ⏳ **Then**: Test with a job
3. 🔍 **If fails**: Check Vercel logs for API key errors
4. 🔑 **Only if needed**: Update API key in Vercel

Don't waste time updating the API key until you've fixed the database and tested!

---

**99% chance** the API key is fine and the database schema is the only issue. Fix that first! 🚀
