# Vercel Deployment Troubleshooting Guide

## Current Status

✅ **Git Commits**: Successfully pushed to GitHub
- Commit `4920c66`: "Improve frontend polling reliability and extend timeout"
- Commit `c862cf3`: "Fix timeout issues and add comprehensive reliability features"

✅ **Repository**: `JLcilliers/SEO_Content_Creator`

❓ **Issue**: Deployments not showing in Vercel dashboard

---

## Step-by-Step Troubleshooting

### Option 1: Check Vercel Dashboard (Recommended First Step)

1. **Go to Vercel Dashboard**:
   - Visit: https://vercel.com/dashboard
   - Select your project: `SEO_Content_Creator`

2. **Check Deployments Tab**:
   - Look for any deployments in the last hour
   - Check if there are failed deployments (red status)
   - Look for warning icons or error messages

3. **Check Git Integration**:
   - Go to: **Project Settings** → **Git**
   - Verify GitHub repository is connected: `JLcilliers/SEO_Content_Creator`
   - Check if branch is set to: `main`
   - Look for any webhook errors or warnings

4. **Check Build & Development Settings**:
   - Go to: **Project Settings** → **General**
   - Verify:
     - Framework Preset: `Next.js`
     - Build Command: (should be auto-detected or `npm run build`)
     - Output Directory: (should be auto-detected or `.next`)
     - Install Command: (should be auto-detected or `npm install`)

5. **Check Environment Variables**:
   - Go to: **Project Settings** → **Environment Variables**
   - Verify all required variables are present:
     - `ANTHROPIC_API_KEY`
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`

---

### Option 2: Manual Deployment Trigger

If auto-deploy isn't working, trigger manually:

1. **From Vercel Dashboard**:
   - Go to your project
   - Click **"Deployments"** tab
   - Click **"Redeploy"** button on the latest deployment
   - Or click **"Deploy"** → **"Deploy Project"**

2. **From Git Integration**:
   - Click **"Visit Git Repository"** in Vercel dashboard
   - Make a trivial change (like adding a space to README.md)
   - Commit and push to trigger deployment

---

### Option 3: Using Vercel CLI (Alternative)

If dashboard deployment isn't working:

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from Local Machine**:
   ```bash
   cd "C:\Users\johan\Desktop\Created Software\SEO Content Creator"
   vercel --prod
   ```

4. **Follow the prompts**:
   - Confirm project linking
   - Confirm production deployment
   - Wait for deployment to complete

---

### Option 4: Re-link GitHub Repository

If webhook is broken, re-link the repository:

1. **Disconnect Current Integration**:
   - Go to: **Project Settings** → **Git**
   - Click **"Disconnect"** (if available)

2. **Reconnect Repository**:
   - Click **"Connect Git Repository"**
   - Select GitHub
   - Choose `JLcilliers/SEO_Content_Creator`
   - Select branch: `main`
   - Click **"Connect"**

3. **Verify Auto-Deploy**:
   - Check that "Automatically deploy new commits" is enabled
   - Trigger a new deployment by pushing a trivial change

---

## Common Issues & Solutions

### Issue 1: Build Failures

**Symptoms**: Deployments show but fail with build errors

**Solution**:
1. Check deployment logs in Vercel dashboard
2. Verify all dependencies are in `package.json`
3. Run `npm install && npm run build` locally to test
4. Check for TypeScript errors or missing environment variables

### Issue 2: Environment Variables Not Set

**Symptoms**: Build succeeds but runtime errors occur

**Solution**:
1. Go to: **Project Settings** → **Environment Variables**
2. Add missing variables:
   - `ANTHROPIC_API_KEY` (Required)
   - `NEXT_PUBLIC_SUPABASE_URL` (Required)
   - `SUPABASE_SERVICE_ROLE_KEY` (Required)
3. Redeploy after adding variables

### Issue 3: Webhook Not Triggering

**Symptoms**: No new deployments appear after pushing to GitHub

**Solution**:
1. Check GitHub webhook status:
   - Go to your GitHub repo: Settings → Webhooks
   - Look for Vercel webhook
   - Check recent deliveries for errors
2. Re-link repository in Vercel (see Option 4 above)

### Issue 4: Branch Mismatch

**Symptoms**: Pushing to `main` but Vercel watching different branch

**Solution**:
1. Go to: **Project Settings** → **Git**
2. Change "Production Branch" to: `main`
3. Ensure your local branch is `main`:
   ```bash
   git branch --show-current
   ```
4. If not on `main`, switch:
   ```bash
   git checkout main
   ```

---

## Verification Steps (After Deployment)

1. **Check Deployment Status**:
   - Go to Vercel dashboard → Deployments
   - Wait for "Ready" status (building can take 2-5 minutes)
   - Click on deployment to see details and logs

2. **Verify Live Site**:
   - Visit your production URL
   - Open browser console (F12)
   - Look for `[Worker Trigger]` messages when submitting a job
   - Test content generation end-to-end

3. **Check Worker Logs**:
   - In Vercel dashboard, go to **Logs** tab
   - Filter by function: `/api/worker`
   - Look for successful job processing messages

4. **Verify Database Migration**:
   - Ensure Supabase migration was run (you already did this)
   - Check that jobs table has `attempts` and `last_attempt_at` columns

---

## Expected Behavior After Deployment

✅ **Immediate Job Processing**: Worker triggers within 2 seconds of job creation
✅ **No More Timeouts**: Jobs complete in 2-4 minutes (well under 6-minute limit)
✅ **Automatic Retry**: Failed jobs retry up to 3 times automatically
✅ **Stuck Job Recovery**: Jobs stuck for 10+ minutes are automatically reset
✅ **Database Cleanup**: Old jobs (24+ hours) are automatically removed

---

## Need More Help?

### Check Vercel Logs
```bash
vercel logs <your-project-url> --follow
```

### Check GitHub Actions (if enabled)
- Go to your GitHub repo
- Click **Actions** tab
- Check for any workflow runs

### Vercel Status
- Check: https://www.vercel-status.com/
- Ensure no ongoing incidents

---

## Quick Manual Deployment Command

Run this in your project directory:
```bash
vercel --prod
```

This will deploy directly from your local machine, bypassing GitHub integration.

---

## Contact Points

- **Vercel Support**: https://vercel.com/support
- **Vercel Discord**: https://vercel.com/discord
- **GitHub Webhook Issues**: Check repo Settings → Webhooks

---

Built: 2025-01-06
Status: Troubleshooting auto-deploy from GitHub to Vercel
