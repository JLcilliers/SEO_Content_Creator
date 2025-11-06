/**
 * Job Queue Management with Upstash Redis
 */

import { Redis } from '@upstash/redis';

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

let redis: Redis | null = null;

/**
 * Get or create Redis client
 */
export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error(
        'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in environment variables'
      );
    }

    redis = new Redis({
      url,
      token,
    });
  }
  return redis;
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
  const client = getRedis();
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

  // Store job with 24-hour expiration
  await client.setex(`job:${jobId}`, 86400, JSON.stringify(job));

  // Add to pending queue
  await client.lpush('queue:pending', jobId);

  console.log(`[Queue] Created job ${jobId}`);
  return jobId;
}

/**
 * Get job by ID
 */
export async function getJob(jobId: string): Promise<Job | null> {
  const client = getRedis();
  const data = await client.get<string>(`job:${jobId}`);

  if (!data) {
    return null;
  }

  return JSON.parse(data);
}

/**
 * Update job status and progress
 */
export async function updateJob(
  jobId: string,
  updates: Partial<Omit<Job, 'id' | 'createdAt' | 'input'>>
): Promise<void> {
  const client = getRedis();
  const job = await getJob(jobId);

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  const updatedJob: Job = {
    ...job,
    ...updates,
    updatedAt: Date.now(),
  };

  await client.setex(`job:${jobId}`, 86400, JSON.stringify(updatedJob));
  console.log(`[Queue] Updated job ${jobId}: ${updates.status || 'progress'} ${updates.progress || ''}%`);
}

/**
 * Get next pending job
 */
export async function getNextPendingJob(): Promise<string | null> {
  const client = getRedis();
  const jobId = await client.rpop('queue:pending');
  return jobId;
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
