# 🚀 Complete SEO Content Creator Rebuild Guide - Part 2

**Continuation of COMPLETE_REBUILD_GUIDE_V2.md**

---

## 📋 Phase 6: API Routes & Frontend

**Estimated Time:** 3-4 hours

### 6.1 Job Creation API

Create `app/api/jobs/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient, createQueueClient } from '@/lib/supabase/client'
import { inngest } from '@/lib/inngest/client'

// Validation schema for job creation
const createJobSchema = z.object({
  url: z.string()
    .url()
    .startsWith('https://', { message: 'URL must use HTTPS' }),
  topic: z.string()
    .min(3, { message: 'Topic must be at least 3 characters' })
    .max(140, { message: 'Topic must be less than 140 characters' }),
  keywords: z.string()
    .transform(str => str.split(',').map(k => k.trim()).filter(Boolean))
    .refine(arr => arr.length > 0, { message: 'At least one keyword required' })
    .refine(arr => arr.length <= 10, { message: 'Maximum 10 keywords allowed' }),
  targetLength: z.number()
    .int()
    .min(300, { message: 'Minimum length is 300 words' })
    .max(5000, { message: 'Maximum length is 5000 words' })
})

/**
 * POST /api/jobs - Create a new SEO content generation job
 */
export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json()
    const validated = createJobSchema.parse(body)

    // Create job metadata in database
    const supabase = createServerClient()
    const { data: job, error: jobError } = await supabase
      .from('job_metadata')
      .insert({
        url: validated.url,
        topic: validated.topic,
        keywords: validated.keywords,
        target_length: validated.targetLength,
        status: 'pending',
        progress: 0
      })
      .select()
      .single()

    if (jobError) {
      console.error('Failed to create job:', jobError)
      throw new Error('Failed to create job in database')
    }

    // Add to queue (optional with Inngest, but good for tracking)
    try {
      const queue = createQueueClient()
      await queue.rpc('send', {
        queue_name: 'seo-jobs',
        message: {
          jobId: job.id,
          ...validated
        }
      })
    } catch (queueError) {
      console.warn('Queue addition failed (non-fatal):', queueError)
      // Continue anyway since Inngest will handle the job
    }

    // Trigger Inngest function to process the job
    await inngest.send({
      name: 'seo/job.created',
      data: {
        jobId: job.id,
        url: validated.url,
        topic: validated.topic,
        keywords: validated.keywords,
        targetLength: validated.targetLength
      }
    })

    console.log(`Job ${job.id} created and queued successfully`)

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Job created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Job creation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to create job',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/jobs - List all jobs with pagination
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')

    const supabase = createServerClient()
    let query = supabase
      .from('job_metadata')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    const { data: jobs, error, count } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      jobs,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Job listing error:', error)
    return NextResponse.json({
      error: 'Failed to list jobs'
    }, { status: 500 })
  }
}
```

### 6.2 Job Status API

Create `app/api/jobs/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

/**
 * GET /api/jobs/[id] - Get job status and results
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json({
        error: 'Invalid job ID format'
      }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: job, error } = await supabase
      .from('job_metadata')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !job) {
      return NextResponse.json({
        error: 'Job not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      job
    })

  } catch (error) {
    console.error('Job fetch error:', error)
    return NextResponse.json({
      error: 'Failed to fetch job'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/jobs/[id] - Cancel a job
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const supabase = createServerClient()

    // Check if job can be cancelled
    const { data: job } = await supabase
      .from('job_metadata')
      .select('status')
      .eq('id', id)
      .single()

    if (!job) {
      return NextResponse.json({
        error: 'Job not found'
      }, { status: 404 })
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return NextResponse.json({
        error: 'Cannot cancel completed or failed job'
      }, { status: 400 })
    }

    // Update job status to failed with cancellation message
    const { error } = await supabase
      .from('job_metadata')
      .update({
        status: 'failed',
        error: 'Job cancelled by user',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully'
    })

  } catch (error) {
    console.error('Job cancellation error:', error)
    return NextResponse.json({
      error: 'Failed to cancel job'
    }, { status: 500 })
  }
}
```

### 6.3 Health Check API

Create `app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createServerClient, createQueueClient } from '@/lib/supabase/client'

interface HealthStatus {
  healthy: boolean
  timestamp: string
  checks: {
    database: boolean
    queue: boolean
    anthropic: boolean
  }
  version: string
}

/**
 * GET /api/health - Health check endpoint
 */
export async function GET() {
  const status: HealthStatus = {
    healthy: false,
    timestamp: new Date().toISOString(),
    checks: {
      database: false,
      queue: false,
      anthropic: false
    },
    version: process.env.npm_package_version || '2.0.0'
  }

  try {
    // Check database connection
    const supabase = createServerClient()
    const { error: dbError } = await supabase
      .from('job_metadata')
      .select('count')
      .limit(1)

    status.checks.database = !dbError

    // Check queue system
    const queue = createQueueClient()
    const { error: queueError } = await queue
      .rpc('metrics', { queue_name: 'seo-jobs' })
      .catch(() => ({ error: 'Queue check failed' }))

    status.checks.queue = !queueError

    // Check Anthropic API key presence
    status.checks.anthropic = !!process.env.ANTHROPIC_API_KEY

    // Overall health
    status.healthy = Object.values(status.checks).every(check => check)

  } catch (error) {
    console.error('Health check error:', error)
  }

  return NextResponse.json(
    status,
    { status: status.healthy ? 200 : 503 }
  )
}
```

### 6.4 App Layout

Create `app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SEO Content Creator v2',
  description: 'Generate high-quality SEO content using AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### 6.5 React Query Provider

Create `app/providers.tsx`:

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </QueryClientProvider>
  )
}
```

### 6.6 Main Page Component

Create `app/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'

interface FormData {
  url: string
  topic: string
  keywords: string
  targetLength: number
}

interface Job {
  id: string
  status: string
  progress: number
  url: string
  topic: string
  keywords: string[]
  target_length: number
  result?: any
  error?: string
  created_at: string
  updated_at: string
  completed_at?: string
}

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>()

  // Create job mutation
  const createJob = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: data.url,
          topic: data.topic,
          keywords: data.keywords,
          targetLength: parseInt(data.targetLength.toString())
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create job')
      }

      return response.json()
    },
    onSuccess: (data) => {
      setJobId(data.jobId)
      toast.success('Job created successfully!')
      reset()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create job')
    }
  })

  // Poll job status
  const { data: jobData, isLoading: jobLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const response = await fetch(`/api/jobs/${jobId}`)
      if (!response.ok) throw new Error('Failed to fetch job')
      const data = await response.json()
      return data.job as Job
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const job = query.state.data
      // Stop polling if job is completed or failed
      if (job?.status === 'completed' || job?.status === 'failed') {
        return false
      }
      return 2000 // Poll every 2 seconds
    }
  })

  const onSubmit = (data: FormData) => {
    createJob.mutate(data)
  }

  const handleReset = () => {
    setJobId(null)
    reset()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            SEO Content Creator
            <span className="text-blue-600"> v2.0</span>
          </h1>
          <p className="text-xl text-gray-600">
            Generate high-quality, SEO-optimized content using AI
          </p>
        </div>

        {/* Main Content */}
        {!jobId ? (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* URL Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Website URL <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('url', { required: 'URL is required' })}
                  type="url"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="https://example.com"
                />
                {errors.url && (
                  <p className="mt-1 text-sm text-red-600">{errors.url.message}</p>
                )}
              </div>

              {/* Topic Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Topic <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('topic', {
                    required: 'Topic is required',
                    minLength: { value: 3, message: 'Topic must be at least 3 characters' }
                  })}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="e.g., Benefits of Cloud Computing"
                />
                {errors.topic && (
                  <p className="mt-1 text-sm text-red-600">{errors.topic.message}</p>
                )}
              </div>

              {/* Keywords Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Keywords <span className="text-red-500">*</span>
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (comma-separated, max 10)
                  </span>
                </label>
                <input
                  {...register('keywords', { required: 'At least one keyword is required' })}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="cloud computing, AWS, infrastructure"
                />
                {errors.keywords && (
                  <p className="mt-1 text-sm text-red-600">{errors.keywords.message}</p>
                )}
              </div>

              {/* Target Length Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Target Length (words)
                </label>
                <input
                  {...register('targetLength', {
                    required: 'Target length is required',
                    min: { value: 300, message: 'Minimum length is 300 words' },
                    max: { value: 5000, message: 'Maximum length is 5000 words' }
                  })}
                  type="number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="1500"
                  defaultValue={1500}
                />
                {errors.targetLength && (
                  <p className="mt-1 text-sm text-red-600">{errors.targetLength.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={createJob.isPending}
                className="w-full bg-blue-600 text-white font-semibold py-4 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-[1.02]"
              >
                {createJob.isPending ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Job...
                  </span>
                ) : (
                  'Generate Content'
                )}
              </button>
            </form>
          </div>
        ) : (
          <JobStatus job={jobData} isLoading={jobLoading} onReset={handleReset} />
        )}
      </div>
    </div>
  )
}

// Job Status Component
function JobStatus({ job, isLoading, onReset }: { job?: Job; isLoading: boolean; onReset: () => void }) {
  if (isLoading || !job) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
        <p className="mt-6 text-lg text-gray-600">Loading job status...</p>
      </div>
    )
  }

  if (job.status === 'failed') {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg mb-6">
          <div className="flex items-center">
            <svg className="h-8 w-8 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h2 className="text-xl font-bold text-red-800">Job Failed</h2>
              <p className="text-red-700 mt-1">{job.error || 'Unknown error occurred'}</p>
            </div>
          </div>
        </div>
        <button
          onClick={onReset}
          className="w-full bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-700 transition"
        >
          Create New Job
        </button>
      </div>
    )
  }

  if (job.status === 'completed') {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
        {/* Success Header */}
        <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
          <div className="flex items-center">
            <svg className="h-8 w-8 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h2 className="text-2xl font-bold text-green-800">Content Generated!</h2>
              <p className="text-green-700 mt-1">Your SEO-optimized content is ready</p>
            </div>
          </div>
        </div>

        {/* Meta Information */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="font-bold text-gray-700 mb-2 flex items-center">
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Meta Title
            </h3>
            <p className="text-gray-800">{job.result?.metaTitle}</p>
            <p className="text-sm text-gray-500 mt-1">{job.result?.metaTitle.length} characters</p>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="font-bold text-gray-700 mb-2 flex items-center">
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Word Count
            </h3>
            <p className="text-2xl font-bold text-blue-600">{job.result?.wordCount}</p>
            <p className="text-sm text-gray-500 mt-1">words</p>
          </div>
        </div>

        {/* Meta Description */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="font-bold text-gray-700 mb-2 flex items-center">
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            Meta Description
          </h3>
          <p className="text-gray-800">{job.result?.metaDescription}</p>
          <p className="text-sm text-gray-500 mt-1">{job.result?.metaDescription.length} characters</p>
        </div>

        {/* Content Preview */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center">
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generated Content
          </h3>
          <div className="prose max-w-none">
            <div className="bg-white p-6 rounded border border-gray-200 max-h-96 overflow-y-auto">
              <div dangerouslySetInnerHTML={{
                __html: job.result?.content.replace(/\n/g, '<br/>')
              }} />
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        {job.result?.faq && job.result.faq.length > 0 && (
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="font-bold text-gray-700 mb-4 flex items-center">
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              FAQ Section
            </h3>
            <div className="space-y-4">
              {job.result.faq.map((item: any, i: number) => (
                <div key={i} className="bg-white p-4 rounded border border-gray-200">
                  <p className="font-semibold text-gray-800 mb-2">Q: {item.question}</p>
                  <p className="text-gray-700">A: {item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Keyword Density */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center">
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Keyword Density
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(job.result?.keywordDensity || {}).map(([keyword, density]: [string, any]) => (
              <div key={keyword} className="bg-white p-4 rounded border border-gray-200">
                <p className="font-semibold text-gray-800">{keyword}</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {density.toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => {
              const blob = new Blob([job.result?.content], { type: 'text/markdown' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `${job.topic.replace(/\s+/g, '-')}.md`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="flex-1 bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition"
          >
            Download Content
          </button>
          <button
            onClick={onReset}
            className="flex-1 bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-700 transition"
          >
            Create New Job
          </button>
        </div>
      </div>
    )
  }

  // Processing status
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-4"></div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-blue-800">Processing Job</h2>
            <p className="text-blue-700 mt-1 capitalize">{job.status.replace(/-/g, ' ')}</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{job.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${job.progress}%` }}
          />
        </div>
      </div>

      {/* Job Details */}
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <div className="bg-gray-50 p-4 rounded">
          <p className="text-gray-600">URL</p>
          <p className="font-semibold text-gray-800 truncate">{job.url}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <p className="text-gray-600">Topic</p>
          <p className="font-semibold text-gray-800">{job.topic}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <p className="text-gray-600">Keywords</p>
          <p className="font-semibold text-gray-800">{job.keywords.join(', ')}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <p className="text-gray-600">Target Length</p>
          <p className="font-semibold text-gray-800">{job.target_length} words</p>
        </div>
      </div>
    </div>
  )
}
```

---

