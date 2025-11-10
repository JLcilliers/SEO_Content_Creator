/**
 * Job Queue Management with Supabase PostgreSQL
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Job status enum
export enum JobStatus {
  PENDING = 'pending',
  CRAWLING = 'crawling',
  GENERATING = 'generating',
  PARSING = 'parsing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Job data structure
export interface Job {
  id: string;
  status: JobStatus;
  progress: number; // 0-100
  message: string;
  createdAt: number;
  updatedAt: number;
  attempts: number; // Number of processing attempts
  lastAttemptAt?: number; // Timestamp of last attempt
  input: {
    url: string;
    topic: string;
    keywords: string[];
    length: number;
  };
  result?: {
    metaTitle: string;
    metaDescription: string;
    contentMarkdown: string;
    faqRaw: string;
    schemaJsonString: string;
    pages: Array<{ title: string; url: string }>;
  };
  error?: string;
}

// Database row type (matches SQL schema)
interface JobRow {
  id: string;
  status: string;
  progress: number;
  message: string;
  created_at: number;
  updated_at: number;
  attempts: number;
  last_attempt_at: number | null;
  input_url: string;
  input_topic: string;
  input_keywords: any; // JSONB
  input_length: number;
  result_meta_title: string | null;
  result_meta_description: string | null;
  result_content_markdown: string | null;
  result_faq_raw: string | null;
  result_schema_json_string: string | null;
  result_pages: any | null; // JSONB
  error: string | null;
}

let supabase: SupabaseClient | null = null;

/**
 * Get or create Supabase client
 * IMPORTANT: Creates a fresh client each time to avoid caching issues in serverless
 */
export function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables'
    );
  }

  // Always create a fresh client to avoid stale cache in serverless environment
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  });
}

/**
 * Convert database row to Job object
 */
function rowToJob(row: JobRow): Job {
  const hasResult = !!row.result_meta_title;

  console.log(`[Queue] rowToJob for ${row.id}:`, {
    status: row.status,
    hasResult,
    hasMetaTitle: !!row.result_meta_title,
    hasMetaDescription: !!row.result_meta_description,
    hasContentMarkdown: !!row.result_content_markdown,
    hasFaqRaw: !!row.result_faq_raw,
    hasSchemaJsonString: !!row.result_schema_json_string,
    hasPages: !!row.result_pages,
  });

  return {
    id: row.id,
    status: row.status as JobStatus,
    progress: row.progress,
    message: row.message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attempts: row.attempts || 0,
    lastAttemptAt: row.last_attempt_at || undefined,
    input: {
      url: row.input_url,
      topic: row.input_topic,
      keywords: row.input_keywords,
      length: row.input_length,
    },
    result: hasResult
      ? {
          metaTitle: row.result_meta_title!,
          metaDescription: row.result_meta_description!,
          contentMarkdown: row.result_content_markdown!,
          faqRaw: row.result_faq_raw!,
          schemaJsonString: row.result_schema_json_string!,
          pages: row.result_pages!,
        }
      : undefined,
    error: row.error || undefined,
  };
}

/**
 * Convert Job object to database row
 */
function jobToRow(job: Job): Partial<JobRow> {
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    message: job.message,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
    attempts: job.attempts || 0,
    last_attempt_at: job.lastAttemptAt || null,
    input_url: job.input.url,
    input_topic: job.input.topic,
    input_keywords: job.input.keywords,
    input_length: job.input.length,
    result_meta_title: job.result?.metaTitle || null,
    result_meta_description: job.result?.metaDescription || null,
    result_content_markdown: job.result?.contentMarkdown || null,
    result_faq_raw: job.result?.faqRaw || null,
    result_schema_json_string: job.result?.schemaJsonString || null,
    result_pages: job.result?.pages || null,
    error: job.error || null,
  };
}

/**
 * Generate unique job ID
 */
export function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new job
 */
export async function createJob(input: Job['input']): Promise<string> {
  const client = getSupabase();
  const jobId = generateJobId();

  const job: Job = {
    id: jobId,
    status: JobStatus.PENDING,
    progress: 0,
    message: 'Job created, waiting to start...',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    attempts: 0,
    input,
  };

  const row = jobToRow(job);

  const { error } = await client.from('jobs').insert(row);

  if (error) {
    console.error('[Queue] Failed to create job:', error);
    throw new Error(`Failed to create job: ${error.message}`);
  }

  console.log(`[Queue] Created job ${jobId}`);
  return jobId;
}

/**
 * Get job by ID
 * IMPORTANT: Uses timestamp filter to bust Supabase query cache
 * Even though we filter by specific ID, PostgREST can still cache the response
 */
export async function getJob(jobId: string): Promise<Job | null> {
  const client = getSupabase();

  // Add timestamp filter to bust cache - will match the job if created before now+1s
  const now = Date.now();
  const { data, error } = await client
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .lt('created_at', now + 1000)
    .maybeSingle();

  if (error) {
    console.error('[Queue] Failed to get job:', error);
    throw new Error(`Failed to get job: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return rowToJob(data as JobRow);
}

/**
 * Update job status and progress
 * IMPORTANT: Does NOT read existing job to avoid cache issues - directly updates fields
 */
export async function updateJob(
  jobId: string,
  updates: Partial<Omit<Job, 'id' | 'createdAt' | 'input'>>
): Promise<void> {
  const client = getSupabase();

  // Build partial row update directly without reading existing job
  // This avoids cache issues and race conditions
  const rowUpdates: Partial<JobRow> = {
    updated_at: Date.now(),
  };

  // Map Job updates to database row format
  if (updates.status !== undefined) rowUpdates.status = updates.status;
  if (updates.progress !== undefined) rowUpdates.progress = updates.progress;
  if (updates.message !== undefined) rowUpdates.message = updates.message;
  if (updates.attempts !== undefined) rowUpdates.attempts = updates.attempts;
  if (updates.lastAttemptAt !== undefined) rowUpdates.last_attempt_at = updates.lastAttemptAt;
  if (updates.error !== undefined) rowUpdates.error = updates.error;

  // Handle result object fields
  if (updates.result !== undefined) {
    rowUpdates.result_meta_title = updates.result.metaTitle;
    rowUpdates.result_meta_description = updates.result.metaDescription;
    rowUpdates.result_content_markdown = updates.result.contentMarkdown;
    rowUpdates.result_faq_raw = updates.result.faqRaw;
    rowUpdates.result_schema_json_string = updates.result.schemaJsonString;
    rowUpdates.result_pages = updates.result.pages;
  }

  const { error } = await client
    .from('jobs')
    .update(rowUpdates)
    .eq('id', jobId);

  if (error) {
    console.error('[Queue] Failed to update job:', error);
    throw new Error(`Failed to update job: ${error.message}`);
  }

  console.log(`[Queue] Updated job ${jobId}: ${updates.status || 'progress'} ${updates.progress || ''}%`);
}

/**
 * Get next pending job
 * IMPORTANT: Uses RPC or timestamp filter to avoid PostgREST query caching
 */
export async function getNextPendingJob(): Promise<string | null> {
  const client = getSupabase();

  // Use timestamp filter to prevent query caching - queries with different parameters aren't cached together
  const now = Date.now();
  const { data, error } = await client
    .from('jobs')
    .select('id')
    .eq('status', 'pending')
    .lt('created_at', now + 1000) // Add timestamp filter to bust cache (will match all jobs created before now+1s)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Queue] Failed to get next pending job:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return data.id;
}

/**
 * Mark job as completed with result
 */
export async function completeJob(jobId: string, result: Job['result']): Promise<void> {
  console.log(`[Queue] completeJob called for ${jobId}:`, {
    hasResult: !!result,
    hasMetaTitle: !!result?.metaTitle,
    hasMetaDescription: !!result?.metaDescription,
    hasContentMarkdown: !!result?.contentMarkdown,
    hasFaqRaw: !!result?.faqRaw,
    hasSchemaJsonString: !!result?.schemaJsonString,
    pagesCount: result?.pages?.length || 0,
  });

  await updateJob(jobId, {
    status: JobStatus.COMPLETED,
    progress: 100,
    message: 'Content generation completed successfully',
    result,
  });

  console.log(`[Queue] Job ${jobId} marked as completed in database`);
}

/**
 * Mark job as failed with error
 */
export async function failJob(jobId: string, error: string): Promise<void> {
  await updateJob(jobId, {
    status: JobStatus.FAILED,
    progress: 0,
    message: 'Job failed',
    error,
  });
}

/**
 * Increment job attempt counter and update last attempt timestamp
 */
export async function incrementJobAttempt(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  await updateJob(jobId, {
    attempts: job.attempts + 1,
    lastAttemptAt: Date.now(),
  });
}

/**
 * Reset stuck jobs (jobs that are processing but haven't been updated in a while)
 * This handles cases where worker crashed or was killed
 */
export async function resetStuckJobs(stuckThresholdMs: number = 600000): Promise<number> {
  const client = getSupabase();
  const cutoffTime = Date.now() - stuckThresholdMs;

  // Find jobs that are "in progress" but haven't been updated recently
  const { data, error } = await client
    .from('jobs')
    .select('id, attempts')
    .in('status', ['crawling', 'generating', 'parsing'])
    .lt('updated_at', cutoffTime);

  if (error) {
    console.error('[Queue] Failed to find stuck jobs:', error);
    return 0;
  }

  if (!data || data.length === 0) {
    return 0;
  }

  console.log(`[Queue] Found ${data.length} stuck jobs, resetting...`);

  // Reset each stuck job
  let resetCount = 0;
  for (const row of data) {
    const MAX_RETRIES = 3;

    if (row.attempts >= MAX_RETRIES) {
      // Max retries reached, mark as failed
      await failJob(
        row.id,
        `Job exceeded maximum retry attempts (${MAX_RETRIES}). Last known status: processing.`
      );
    } else {
      // Reset to pending for retry
      await updateJob(row.id, {
        status: JobStatus.PENDING,
        progress: 0,
        message: `Retry attempt ${row.attempts + 1}/${MAX_RETRIES} - Previous attempt timed out`,
      });
    }
    resetCount++;
  }

  console.log(`[Queue] Reset ${resetCount} stuck jobs`);
  return resetCount;
}

/**
 * Clean up old completed and failed jobs
 */
export async function cleanupOldJobs(maxAgeMs: number = 86400000): Promise<number> {
  const client = getSupabase();
  const cutoffTime = Date.now() - maxAgeMs;

  const { error, count } = await client
    .from('jobs')
    .delete()
    .in('status', ['completed', 'failed'])
    .lt('updated_at', cutoffTime);

  if (error) {
    console.error('[Queue] Failed to cleanup old jobs:', error);
    return 0;
  }

  if (count && count > 0) {
    console.log(`[Queue] Cleaned up ${count} old jobs`);
  }

  return count || 0;
}

/**
 * Check if there are any pending jobs in the queue
 * IMPORTANT: Uses timestamp filter to avoid PostgREST query caching
 */
export async function hasPendingJobs(): Promise<boolean> {
  const client = getSupabase();

  // Use timestamp filter to prevent query caching - queries with different parameters aren't cached together
  const now = Date.now();
  const { data, error} = await client
    .from('jobs')
    .select('id')
    .eq('status', 'pending')
    .lt('created_at', now + 1000) // Add timestamp filter to bust cache (will match all jobs created before now+1s)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Queue] Failed to check for pending jobs:', error);
    return false;
  }

  return !!data;
}
