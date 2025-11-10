# 🚀 Complete SEO Content Creator Rebuild Guide

**Version 2.0 - Modern Architecture Edition**

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Phase 1: Project Setup](#phase-1-project-setup--architecture)
3. [Phase 2: Database Setup](#phase-2-database-setup-with-supabase-queues)
4. [Phase 3: Web Scraping](#phase-3-modern-web-scraping-with-playwright)
5. [Phase 4: Background Jobs](#phase-4-background-job-processing-with-inngest)
6. [Phase 5: AI Generation](#phase-5-ai-content-generation)
7. [Phase 6: API & Frontend](#phase-6-api-routes--frontend)
8. [Phase 7: Deployment](#phase-7-deployment--monitoring)
9. [Testing & Validation](#testing--validation)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Executive Summary

### Problems with Original Implementation

Your original SEO Content Creator faced critical issues:

1. **Database Schema Mismatches** - Silent failures from column mismatches
2. **Race Conditions** - 47-second delays between job creation and worker processing
3. **Frontend Timeouts** - 6-minute timeouts while jobs completed successfully
4. **Deployment Pipeline Issues** - Fixes couldn't reach production
5. **Poor Observability** - Difficult to debug issues in production

### New Architecture Benefits

This rebuild uses modern best practices:

✅ **Native Queue System** (Supabase pgmq) - No custom implementations
✅ **Proper Job Orchestration** (Inngest) - Built-in retries and monitoring
✅ **Reliable Web Scraping** (Playwright) - Handles JavaScript-heavy sites
✅ **Type Safety** (TypeScript) - Catch errors at compile time
✅ **Real-time Updates** (React Query) - No polling issues
✅ **Comprehensive Monitoring** - Know exactly what's happening

### Technology Stack

```
Frontend:    Next.js 14 (App Router), React Query, TypeScript
Backend:     Next.js API Routes, Inngest Functions
Database:    Supabase (PostgreSQL + pgmq Queues)
Scraping:    Playwright
AI:          Anthropic Claude Sonnet 4.5
Deployment:  Vercel
Monitoring:  Inngest Dashboard + Custom Health Checks
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface (Next.js)                 │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Job Creator  │  │ Status View  │  │ Dashboard    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ↓                  ↓                  ↓
┌─────────────────────────────────────────────────────────────┐
│                      API Routes (Next.js)                    │
│                                                               │
│  POST /api/jobs     GET /api/jobs/:id    GET /api/health    │
└─────────┬───────────────────┬────────────────────────────────┘
          │                   │
          ↓                   ↓
┌─────────────────┐  ┌────────────────────┐
│  Supabase DB    │  │  Inngest Queue     │
│                 │  │                    │
│  • job_metadata │  │  • Job Scheduling  │
│  • pgmq queue   │  │  • Retry Logic     │
│  • RLS policies │  │  • Step Functions  │
└────────┬────────┘  └────────┬───────────┘
         │                    │
         └────────┬───────────┘
                  ↓
         ┌────────────────────┐
         │  Worker Functions  │
         │                    │
         │  1. Scrape Website │
         │  2. Generate AI    │
         │  3. Save Results   │
         └────────┬───────────┘
                  │
        ┌─────────┴──────────┐
        ↓                    ↓
┌──────────────┐    ┌────────────────┐
│  Playwright  │    │  Claude API    │
│  Scraper     │    │  Content Gen   │
└──────────────┘    └────────────────┘
```

---

## 📋 Phase 1: Project Setup & Architecture

**Estimated Time:** 2-3 hours

### 1.1 Initialize Project

```bash
# Create new Next.js project
npx create-next-app@latest seo-creator-v2 \
  --typescript \
  --tailwind \
  --app \
  --src-dir=false \
  --import-alias="@/*"

cd seo-creator-v2
```

### 1.2 Install Dependencies

```bash
# Core dependencies
npm install @supabase/supabase-js@latest
npm install @anthropic-ai/sdk@latest
npm install playwright
npm install zod
npm install react-hook-form
npm install @tanstack/react-query
npm install react-hot-toast
npm install inngest

# Development dependencies
npm install -D @types/node
npm install -D prettier
npm install -D eslint-config-prettier
```

### 1.3 Project Structure

Create this folder structure:

```
seo-creator-v2/
├── app/
│   ├── api/
│   │   ├── jobs/
│   │   │   ├── route.ts              # Job creation
│   │   │   └── [id]/route.ts         # Job status
│   │   ├── inngest/
│   │   │   └── route.ts              # Inngest webhook
│   │   └── health/
│   │       └── route.ts              # Health checks
│   ├── page.tsx                       # Main UI
│   └── layout.tsx                     # Root layout
├── lib/
│   ├── supabase/
│   │   └── client.ts                  # Supabase clients
│   ├── inngest/
│   │   ├── client.ts                  # Inngest config
│   │   └── functions.ts               # Background jobs
│   ├── scraper/
│   │   └── playwright-scraper.ts      # Web scraper
│   └── ai/
│       └── content-generator.ts       # Claude integration
├── components/
│   ├── JobCreator.tsx                 # Job creation form
│   ├── JobStatus.tsx                  # Status display
│   └── monitoring/
│       └── JobsDashboard.tsx          # Admin dashboard
├── types/
│   └── database.ts                    # Database types
├── .env.local                         # Environment variables
├── vercel.json                        # Deployment config
└── package.json
```

### 1.4 Environment Configuration

Create `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Anthropic Configuration
ANTHROPIC_API_KEY=your_claude_api_key

# Inngest Configuration
INNGEST_APP_ID=seo-creator-v2
INNGEST_EVENT_KEY=your_event_key
INNGEST_SIGNING_KEY=your_signing_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 1.5 TypeScript Configuration

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## 📋 Phase 2: Database Setup with Supabase Queues

**Estimated Time:** 1-2 hours

### 2.1 Enable Supabase Queues

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Database → Extensions**
4. Search for and enable `pgmq` extension
5. Go to **Integrations → Queues**
6. Toggle on "Expose Queues via PostgREST"

### 2.2 Create Database Schema

In Supabase SQL Editor, run:

```sql
-- Create the queue for SEO jobs
SELECT pgmq.create('seo-jobs');

-- Create jobs metadata table
CREATE TABLE job_metadata (
  -- Primary key
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Queue reference
  queue_message_id BIGINT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,

  -- Input fields
  url TEXT NOT NULL,
  topic TEXT NOT NULL,
  keywords TEXT[] NOT NULL,
  target_length INTEGER NOT NULL,

  -- Result fields
  result JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Error handling
  error TEXT,
  attempts INTEGER DEFAULT 0,

  -- Constraints
  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'crawling', 'generating', 'completed', 'failed')
  ),
  CONSTRAINT valid_progress CHECK (progress >= 0 AND progress <= 100),
  CONSTRAINT valid_url CHECK (url ~ '^https?://'),
  CONSTRAINT valid_target_length CHECK (target_length BETWEEN 300 AND 5000)
);

-- Create indexes for performance
CREATE INDEX idx_job_metadata_status ON job_metadata(status);
CREATE INDEX idx_job_metadata_created_at ON job_metadata(created_at DESC);
CREATE INDEX idx_job_metadata_completed_at ON job_metadata(completed_at DESC) WHERE completed_at IS NOT NULL;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_job_metadata_updated_at
  BEFORE UPDATE ON job_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE job_metadata ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public read access" ON job_metadata
  FOR SELECT
  USING (true);

CREATE POLICY "Service role full access" ON job_metadata
  FOR ALL
  USING (auth.role() = 'service_role');
```

### 2.3 Generate TypeScript Types

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Generate types:
```bash
supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

### 2.4 Create Supabase Client Utilities

Create `lib/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// Browser client (public operations)
export const createBrowserClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false
      }
    }
  )
}

// Server client with service role (admin operations)
export const createServerClient = () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Queue client (pgmq operations)
export const createQueueClient = () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: {
        schema: 'pgmq_public'
      }
    }
  )
}
```

### 2.5 Verify Database Setup

Create a test script `scripts/test-db.ts`:

```typescript
import { createServerClient, createQueueClient } from '../lib/supabase/client'

async function testDatabase() {
  console.log('Testing database connection...')

  try {
    // Test basic connection
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('job_metadata')
      .select('count')
      .limit(1)

    if (error) throw error
    console.log('✅ Database connection successful')

    // Test queue
    const queue = createQueueClient()
    const { data: queueData, error: queueError } = await queue
      .rpc('metrics', { queue_name: 'seo-jobs' })

    if (queueError) throw queueError
    console.log('✅ Queue system working')
    console.log('Queue metrics:', queueData)

  } catch (error) {
    console.error('❌ Database test failed:', error)
    process.exit(1)
  }
}

testDatabase()
```

Run with: `npx tsx scripts/test-db.ts`

---

## 📋 Phase 3: Modern Web Scraping with Playwright

**Estimated Time:** 2-3 hours

### 3.1 Install Playwright

```bash
npm install playwright
npx playwright install chromium
```

### 3.2 Create Playwright Scraper

Create `lib/scraper/playwright-scraper.ts`:

```typescript
import { chromium, Browser, Page, BrowserContext } from 'playwright'

interface ScrapedPage {
  url: string
  title: string
  content: string
  headings: string[]
  images: Array<{ src: string; alt: string }>
  metadata: {
    description?: string
    keywords?: string
  }
}

interface ScrapeOptions {
  maxPages?: number
  timeout?: number
  waitForSelector?: string
  userAgent?: string
}

export class PlaywrightScraper {
  private browser: Browser | null = null
  private context: BrowserContext | null = null

  /**
   * Initialize browser instance
   */
  async initialize() {
    if (this.browser) return

    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    })

    this.context = await this.browser.newContext({
      userAgent: 'SEO-Content-Creator/2.0 (Educational Purpose)',
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true
    })
  }

  /**
   * Scrape a website starting from a URL
   */
  async scrapeWebsite(
    startUrl: string,
    options: ScrapeOptions = {}
  ): Promise<ScrapedPage[]> {
    const {
      maxPages = 5,
      timeout = 10000,
      waitForSelector = 'body'
    } = options

    if (!this.context) {
      await this.initialize()
    }

    const pages: ScrapedPage[] = []
    const visited = new Set<string>()
    const toVisit = [startUrl]
    const baseHost = new URL(startUrl).hostname

    while (toVisit.length > 0 && pages.length < maxPages) {
      const url = toVisit.shift()!

      if (visited.has(url)) continue
      visited.add(url)

      const page = await this.context!.newPage()

      try {
        console.log(`Scraping: ${url}`)

        // Navigate with timeout
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout
        })

        // Wait for main content
        await page.waitForSelector(waitForSelector, {
          timeout: 5000
        }).catch(() => {
          console.warn(`Selector ${waitForSelector} not found on ${url}`)
        })

        // Extract page data
        const pageData = await page.evaluate(() => {
          // Remove unwanted elements
          const selectorsToRemove = [
            'script',
            'style',
            'nav',
            'header',
            'footer',
            'aside',
            '.cookie-banner',
            '.popup',
            '.modal'
          ]

          selectorsToRemove.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => el.remove())
          })

          // Extract text content
          const getTextContent = (selector: string) => {
            return Array.from(document.querySelectorAll(selector))
              .map(el => el.textContent?.trim())
              .filter(Boolean)
              .join(' ')
          }

          // Extract metadata
          const getMetaContent = (name: string) => {
            const meta = document.querySelector(`meta[name="${name}"]`) ||
                        document.querySelector(`meta[property="og:${name}"]`)
            return meta?.getAttribute('content') || undefined
          }

          // Extract images
          const images = Array.from(document.querySelectorAll('img'))
            .map(img => ({
              src: img.src,
              alt: img.alt || ''
            }))
            .filter(img => img.src && !img.src.startsWith('data:'))
            .slice(0, 10) // Limit to 10 images

          return {
            title: document.title,
            content: getTextContent('p, li, blockquote, article, section'),
            headings: Array.from(document.querySelectorAll('h1, h2, h3'))
              .map(el => el.textContent?.trim())
              .filter(Boolean) as string[],
            images,
            metadata: {
              description: getMetaContent('description'),
              keywords: getMetaContent('keywords')
            }
          }
        })

        // Only add page if it has substantial content
        if (pageData.content.length > 100) {
          pages.push({
            url,
            ...pageData
          })
        }

        // Find internal links
        const links = await page.evaluate((currentBaseHost) => {
          return Array.from(document.querySelectorAll('a[href]'))
            .map(a => {
              try {
                const href = (a as HTMLAnchorElement).href
                const url = new URL(href)
                return url.hostname === currentBaseHost ? href : null
              } catch {
                return null
              }
            })
            .filter(Boolean) as string[]
        }, baseHost)

        // Add new links to queue
        links.forEach(link => {
          if (!visited.has(link) && !toVisit.includes(link)) {
            toVisit.push(link)
          }
        })

      } catch (error) {
        console.error(`Failed to scrape ${url}:`, error)
      } finally {
        await page.close()
      }
    }

    return pages
  }

  /**
   * Clean up resources
   */
  async close() {
    if (this.context) {
      await this.context.close()
      this.context = null
    }

    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}
```

### 3.3 Create Scraper Utilities

Create `lib/scraper/utils.ts`:

```typescript
import { ScrapedPage } from './playwright-scraper'

/**
 * Clean and normalize scraped content
 */
export function cleanScrapedContent(content: string): string {
  return content
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove special characters
    .replace(/[^\w\s.,!?-]/g, '')
    // Trim
    .trim()
}

/**
 * Extract keywords from scraped content
 */
export function extractKeywords(pages: ScrapedPage[]): string[] {
  const allText = pages
    .map(p => `${p.title} ${p.headings.join(' ')} ${p.content}`)
    .join(' ')
    .toLowerCase()

  // Simple keyword extraction (you can use NLP libraries for better results)
  const words = allText
    .split(/\s+/)
    .filter(word => word.length > 4)

  const wordFreq = new Map<string, number>()
  words.forEach(word => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
  })

  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word)
}

/**
 * Generate context summary from scraped pages
 */
export function generateContextSummary(pages: ScrapedPage[]): string {
  return pages
    .map(page => {
      const preview = page.content.slice(0, 500)
      return `
URL: ${page.url}
Title: ${page.title}
Headings: ${page.headings.slice(0, 5).join(', ')}
Content Preview: ${preview}...
---
      `.trim()
    })
    .join('\n\n')
}
```

### 3.4 Test Scraper

Create `scripts/test-scraper.ts`:

```typescript
import { PlaywrightScraper } from '../lib/scraper/playwright-scraper'
import { generateContextSummary } from '../lib/scraper/utils'

async function testScraper() {
  const scraper = new PlaywrightScraper()

  try {
    console.log('Starting scrape test...')

    const pages = await scraper.scrapeWebsite('https://example.com', {
      maxPages: 3,
      timeout: 10000
    })

    console.log(`\nScraped ${pages.length} pages:`)
    pages.forEach((page, i) => {
      console.log(`\n${i + 1}. ${page.title}`)
      console.log(`   URL: ${page.url}`)
      console.log(`   Content length: ${page.content.length}`)
      console.log(`   Headings: ${page.headings.length}`)
      console.log(`   Images: ${page.images.length}`)
    })

    console.log('\n--- Context Summary ---')
    console.log(generateContextSummary(pages))

  } catch (error) {
    console.error('Scraper test failed:', error)
  } finally {
    await scraper.close()
  }
}

testScraper()
```

Run with: `npx tsx scripts/test-scraper.ts`

---

## 📋 Phase 4: Background Job Processing with Inngest

**Estimated Time:** 2-3 hours

### 4.1 Install and Configure Inngest

```bash
npm install inngest
```

Create `lib/inngest/client.ts`:

```typescript
import { Inngest, EventSchemas } from 'inngest'

// Types for our events
export type Events = {
  'seo/job.created': {
    data: {
      jobId: string
      url: string
      topic: string
      keywords: string[]
      targetLength: number
    }
  }
  'seo/job.progress': {
    data: {
      jobId: string
      progress: number
      status: string
      message?: string
    }
  }
  'seo/job.completed': {
    data: {
      jobId: string
      result: any
    }
  }
  'seo/job.failed': {
    data: {
      jobId: string
      error: string
    }
  }
}

export const inngest = new Inngest({
  id: 'seo-creator',
  schemas: new EventSchemas().fromRecord<Events>()
})
```

### 4.2 Create Background Functions

Create `lib/inngest/functions.ts`:

```typescript
import { inngest } from './client'
import { PlaywrightScraper } from '@/lib/scraper/playwright-scraper'
import { generateContent } from '@/lib/ai/content-generator'
import { createServerClient } from '@/lib/supabase/client'
import { generateContextSummary } from '@/lib/scraper/utils'

/**
 * Main SEO job processing function
 */
export const processSeoJob = inngest.createFunction(
  {
    id: 'process-seo-job',
    name: 'Process SEO Content Generation Job',
    concurrency: {
      limit: 5 // Process max 5 jobs simultaneously
    },
    retries: 3,
    throttle: {
      limit: 10,
      period: '1m'
    }
  },
  { event: 'seo/job.created' },
  async ({ event, step }) => {
    const { jobId, url, topic, keywords, targetLength } = event.data

    // Step 1: Update status to crawling
    await step.run('update-status-crawling', async () => {
      const supabase = createServerClient()
      const { error } = await supabase
        .from('job_metadata')
        .update({
          status: 'crawling',
          progress: 10,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)

      if (error) throw error

      // Send progress event
      await inngest.send({
        name: 'seo/job.progress',
        data: {
          jobId,
          progress: 10,
          status: 'crawling',
          message: 'Starting website crawl'
        }
      })
    })

    // Step 2: Scrape website
    const scrapedPages = await step.run('scrape-website', async () => {
      const scraper = new PlaywrightScraper()

      try {
        console.log(`Scraping ${url}...`)
        const pages = await scraper.scrapeWebsite(url, {
          maxPages: 5,
          timeout: 10000
        })

        if (pages.length === 0) {
          throw new Error('No pages could be scraped from the website')
        }

        console.log(`Successfully scraped ${pages.length} pages`)
        return pages
      } finally {
        await scraper.close()
      }
    })

    // Step 3: Update status to generating
    await step.run('update-status-generating', async () => {
      const supabase = createServerClient()
      const { error } = await supabase
        .from('job_metadata')
        .update({
          status: 'generating',
          progress: 40,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)

      if (error) throw error

      await inngest.send({
        name: 'seo/job.progress',
        data: {
          jobId,
          progress: 40,
          status: 'generating',
          message: 'Generating content with AI'
        }
      })
    })

    // Step 4: Generate content with AI
    const generatedContent = await step.run('generate-content', async () => {
      console.log(`Generating content for topic: ${topic}`)

      const result = await generateContent({
        context: scrapedPages,
        topic,
        keywords,
        targetLength
      })

      return result
    })

    // Step 5: Save results and mark complete
    await step.run('save-results', async () => {
      const supabase = createServerClient()
      const { error } = await supabase
        .from('job_metadata')
        .update({
          status: 'completed',
          progress: 100,
          result: generatedContent,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)

      if (error) throw error

      await inngest.send({
        name: 'seo/job.completed',
        data: {
          jobId,
          result: generatedContent
        }
      })
    })

    return {
      jobId,
      success: true,
      pagesScraped: scrapedPages.length,
      contentGenerated: true
    }
  }
)

/**
 * Error handler function
 */
export const handleJobFailure = inngest.createFunction(
  {
    id: 'handle-job-failure',
    name: 'Handle SEO Job Failure'
  },
  { event: 'seo/job.failed' },
  async ({ event }) => {
    const { jobId, error } = event.data

    const supabase = createServerClient()
    await supabase
      .from('job_metadata')
      .update({
        status: 'failed',
        error,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    console.error(`Job ${jobId} failed:`, error)
  }
)

// Export all functions
export const functions = [
  processSeoJob,
  handleJobFailure
]
```

### 4.3 Create Inngest API Route

Create `app/api/inngest/route.ts`:

```typescript
import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { functions } from '@/lib/inngest/functions'

// Serve the Inngest API route
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
  // Verify webhook signature in production
  signingKey: process.env.INNGEST_SIGNING_KEY,
  // Enable streaming for long-running functions
  streaming: 'allow'
})
```

### 4.4 Setup Inngest Dev Server

Add to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "inngest": "npx inngest-cli@latest dev",
    "dev:full": "concurrently \"npm run dev\" \"npm run inngest\""
  }
}
```

Install concurrently:
```bash
npm install -D concurrently
```

---

## 📋 Phase 5: AI Content Generation

**Estimated Time:** 2-3 hours

### 5.1 Install Anthropic SDK

Already installed in Phase 1, but verify:
```bash
npm list @anthropic-ai/sdk
```

### 5.2 Create Content Generator

Create `lib/ai/content-generator.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

interface ScrapedPage {
  url: string
  title: string
  content: string
  headings: string[]
  images?: Array<{ src: string; alt: string }>
  metadata?: {
    description?: string
    keywords?: string
  }
}

interface GenerateContentParams {
  context: ScrapedPage[]
  topic: string
  keywords: string[]
  targetLength: number
}

interface GeneratedContent {
  metaTitle: string
  metaDescription: string
  content: string
  faq: Array<{
    question: string
    answer: string
  }>
  schema: Record<string, any>
  wordCount: number
  keywordDensity: Record<string, number>
}

/**
 * Generate SEO-optimized content using Claude
 */
export async function generateContent(
  params: GenerateContentParams
): Promise<GeneratedContent> {
  const { context, topic, keywords, targetLength } = params

  // Build context string from scraped pages
  const contextString = context
    .map(page => {
      const preview = page.content.slice(0, 1500)
      return `
## Source: ${page.url}

**Title:** ${page.title}

**Headings:** ${page.headings.slice(0, 5).join(', ')}

**Content Preview:**
${preview}

---
      `.trim()
    })
    .join('\n\n')

  const prompt = `
You are an expert SEO content writer specializing in creating high-quality, search engine optimized content. Generate comprehensive, factually accurate SEO content based on the provided website information.

# WEBSITE CONTEXT

${contextString}

# CONTENT REQUIREMENTS

**Topic:** ${topic}
**Target Keywords:** ${keywords.join(', ')}
**Target Length:** ${targetLength} words (±10%)

# IMPORTANT RULES

1. **Factual Accuracy:** ONLY use information from the provided website context. Do not invent statistics, dates, prices, or testimonials.

2. **Keyword Usage:**
   - Include all target keywords naturally in the content
   - Maintain 0.5-1.5% keyword density for primary keyword
   - Use variations and LSI keywords
   - Place keywords in title, headings, meta description, and first paragraph

3. **E-E-A-T Principles:**
   - Demonstrate Experience through practical examples
   - Show Expertise with detailed, accurate information
   - Build Authority by citing the source website appropriately
   - Establish Trustworthiness with factual, verifiable content

4. **Content Structure:**
   - Use clear H1 → H2 → H3 hierarchy
   - Write scannable content with short paragraphs (2-3 sentences)
   - Include lists and bullet points for readability
   - Add relevant subheadings every 200-300 words

5. **SEO Best Practices:**
   - Write compelling meta title (50-60 characters)
   - Create engaging meta description (150-160 characters)
   - Use semantic HTML structure
   - Include FAQ section for featured snippets
   - Add proper schema markup

# OUTPUT FORMAT

Return ONLY valid JSON in this exact format (no markdown, no code blocks):

{
  "metaTitle": "Compelling 50-60 character SEO title with primary keyword",
  "metaDescription": "Engaging 150-160 character meta description with call-to-action",
  "content": "Full article content in Markdown format with proper heading structure (H2, H3 only - no H1 as it will be the title). Include:\n- Introduction paragraph with primary keyword\n- Main content sections with subheadings\n- Practical examples and actionable tips\n- Natural keyword placement\n- Conclusion with summary and call-to-action",
  "faq": [
    {
      "question": "Question optimized for featured snippets",
      "answer": "Concise, direct answer (2-3 sentences)"
    }
  ],
  "schema": {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Article headline",
    "description": "Article description",
    "author": {
      "@type": "Organization",
      "name": "Based on website context"
    },
    "datePublished": "${new Date().toISOString()}",
    "dateModified": "${new Date().toISOString()}"
  }
}

Generate the SEO-optimized content now. Remember: Output ONLY the JSON object, nothing else.
`

  try {
    console.log('Generating content with Claude...')

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 12000,
      temperature: 0.2, // Lower temperature for more focused, factual output
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response format from Claude')
    }

    // Parse the JSON response
    let jsonResponse: any
    try {
      // Try to extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = content.text.match(/```json\n([\s\S]*?)\n```/) ||
                       content.text.match(/```\n([\s\S]*?)\n```/)

      const jsonText = jsonMatch ? jsonMatch[1] : content.text
      jsonResponse = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Failed to parse Claude response:', content.text)
      throw new Error('Claude returned invalid JSON')
    }

    // Calculate word count
    const wordCount = jsonResponse.content.split(/\s+/).length

    // Calculate keyword density
    const contentLower = jsonResponse.content.toLowerCase()
    const keywordDensity: Record<string, number> = {}

    keywords.forEach(keyword => {
      const regex = new RegExp(keyword.toLowerCase(), 'g')
      const matches = contentLower.match(regex) || []
      keywordDensity[keyword] = (matches.length / wordCount) * 100
    })

    console.log(`Content generated: ${wordCount} words`)
    console.log('Keyword density:', keywordDensity)

    return {
      ...jsonResponse,
      wordCount,
      keywordDensity
    }

  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error('Anthropic API error:', {
        status: error.status,
        message: error.message,
        type: error.type
      })
      throw new Error(`Claude API error: ${error.message}`)
    }

    console.error('Content generation error:', error)
    throw error
  }
}

/**
 * Validate generated content quality
 */
export function validateContentQuality(
  content: GeneratedContent,
  params: GenerateContentParams
): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  // Check word count
  const targetRange = {
    min: params.targetLength * 0.9,
    max: params.targetLength * 1.1
  }

  if (content.wordCount < targetRange.min) {
    issues.push(`Content too short: ${content.wordCount} words (target: ${params.targetLength})`)
  } else if (content.wordCount > targetRange.max) {
    issues.push(`Content too long: ${content.wordCount} words (target: ${params.targetLength})`)
  }

  // Check meta title length
  if (content.metaTitle.length < 50 || content.metaTitle.length > 60) {
    issues.push(`Meta title length ${content.metaTitle.length} (should be 50-60 chars)`)
  }

  // Check meta description length
  if (content.metaDescription.length < 150 || content.metaDescription.length > 160) {
    issues.push(`Meta description length ${content.metaDescription.length} (should be 150-160 chars)`)
  }

  // Check keyword density
  params.keywords.forEach(keyword => {
    const density = content.keywordDensity[keyword]
    if (density < 0.5) {
      issues.push(`Keyword "${keyword}" density too low: ${density.toFixed(2)}%`)
    } else if (density > 2.5) {
      issues.push(`Keyword "${keyword}" density too high: ${density.toFixed(2)}% (keyword stuffing risk)`)
    }
  })

  // Check FAQ section
  if (!content.faq || content.faq.length < 3) {
    issues.push('FAQ section should have at least 3 questions')
  }

  return {
    valid: issues.length === 0,
    issues
  }
}
```

### 5.3 Test Content Generator

Create `scripts/test-content-gen.ts`:

```typescript
import { generateContent, validateContentQuality } from '../lib/ai/content-generator'

async function testContentGeneration() {
  // Mock scraped pages
  const mockContext = [
    {
      url: 'https://example.com',
      title: 'Example Website',
      content: `
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        This is example content about web development and SEO best practices.
        We help businesses improve their online presence through modern web technologies.
      `,
      headings: ['Web Development', 'SEO Services', 'Digital Marketing'],
      images: [],
      metadata: {
        description: 'Example website for testing',
        keywords: 'web development, SEO'
      }
    }
  ]

  try {
    console.log('Testing content generation...\n')

    const result = await generateContent({
      context: mockContext,
      topic: 'Benefits of Modern Web Development',
      keywords: ['web development', 'SEO', 'digital marketing'],
      targetLength: 1500
    })

    console.log('✅ Content generated successfully!\n')
    console.log('Meta Title:', result.metaTitle)
    console.log('Meta Description:', result.metaDescription)
    console.log('Word Count:', result.wordCount)
    console.log('Keyword Density:', result.keywordDensity)
    console.log('\nFAQ Questions:')
    result.faq.forEach((item, i) => {
      console.log(`${i + 1}. ${item.question}`)
    })

    // Validate quality
    const validation = validateContentQuality(result, {
      context: mockContext,
      topic: 'Benefits of Modern Web Development',
      keywords: ['web development', 'SEO', 'digital marketing'],
      targetLength: 1500
    })

    if (!validation.valid) {
      console.log('\n⚠️  Quality issues found:')
      validation.issues.forEach(issue => console.log(`  - ${issue}`))
    } else {
      console.log('\n✅ Content quality validation passed!')
    }

  } catch (error) {
    console.error('❌ Content generation test failed:', error)
    process.exit(1)
  }
}

testContentGeneration()
```

Run with: `npx tsx scripts/test-content-gen.ts`

---

