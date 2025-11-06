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
 */
export function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables'
      );
    }

    supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabase;
}

/**
 * Convert database row to Job object
 */
function rowToJob(row: JobRow): Job {
  return {
    id: row.id,
    status: row.status as JobStatus,
    progress: row.progress,
    message: row.message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    input: {
      url: row.input_url,
      topic: row.input_topic,
      keywords: row.input_keywords,
      length: row.input_length,
    },
    result: row.result_meta_title
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
 */
export async function getJob(jobId: string): Promise<Job | null> {
  const client = getSupabase();

  const { data, error } = await client
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('[Queue] Failed to get job:', error);
    throw new Error(`Failed to get job: ${error.message}`);
  }

  return rowToJob(data as JobRow);
}

/**
 * Update job status and progress
 */
export async function updateJob(
  jobId: string,
  updates: Partial<Omit<Job, 'id' | 'createdAt' | 'input'>>
): Promise<void> {
  const client = getSupabase();
  const job = await getJob(jobId);

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  const updatedJob: Job = {
    ...job,
    ...updates,
    updatedAt: Date.now(),
  };

  const row = jobToRow(updatedJob);

  const { error } = await client
    .from('jobs')
    .update(row)
    .eq('id', jobId);

  if (error) {
    console.error('[Queue] Failed to update job:', error);
    throw new Error(`Failed to update job: ${error.message}`);
  }

  console.log(`[Queue] Updated job ${jobId}: ${updates.status || 'progress'} ${updates.progress || ''}%`);
}

/**
 * Get next pending job
 */
export async function getNextPendingJob(): Promise<string | null> {
  const client = getSupabase();

  // Get oldest pending job and mark it as processing
  const { data, error } = await client
    .from('jobs')
    .select('id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No pending jobs
      return null;
    }
    console.error('[Queue] Failed to get next pending job:', error);
    return null;
  }

  return data.id;
}

/**
 * Mark job as completed with result
 */
export async function completeJob(jobId: string, result: Job['result']): Promise<void> {
  await updateJob(jobId, {
    status: JobStatus.COMPLETED,
    progress: 100,
    message: 'Content generation completed successfully',
    result,
  });
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
