/**
 * Comprehensive system health check endpoint
 * Shows environment status, database connectivity, and job queue state
 */

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/queue';

export async function GET() {
  const now = Date.now();
  const diagnostics: any = {
    timestamp: new Date(now).toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      vercelUrl: process.env.VERCEL_URL || 'not-set',
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'not-set',
    },
    database: {
      connected: false,
      error: null as string | null,
    },
    queue: {
      pending: 0,
      crawling: 0,
      generating: 0,
      parsing: 0,
      completed: 0,
      failed: 0,
      total: 0,
    },
    jobs: {
      recent: [] as any[],
      stuck: [] as any[],
      oldestPending: null as any,
    },
    worker: {
      cronSchedule: '* * * * *',
      maxDuration: 300,
      expectedTriggerInterval: '1 minute',
    },
  };

  try {
    const supabase = getSupabase();

    // Test database connectivity by fetching recent jobs
    // Use timestamp filter to bust Supabase query cache
    const { data: recentJobs, error: recentError } = await supabase
      .from('jobs')
      .select('id, status, created_at, updated_at, attempts, progress, message, input_url, input_topic')
      .lt('created_at', now + 1000) // Cache-busting: will match all jobs created before now+1s
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      diagnostics.database.error = recentError.message;
      diagnostics.database.connected = false;
    } else {
      diagnostics.database.connected = true;

      // Get status counts
      const statusCounts: Record<string, number> = {};
      recentJobs?.forEach((job) => {
        statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
      });

      // Get all jobs count and status distribution
      // Cache-busting: use timestamp filter
      const { data: allJobs, error: allJobsError } = await supabase
        .from('jobs')
        .select('status')
        .lt('created_at', now + 1000);

      if (!allJobsError && allJobs) {
        const fullStatusCounts: Record<string, number> = {};
        allJobs.forEach((job) => {
          fullStatusCounts[job.status] = (fullStatusCounts[job.status] || 0) + 1;
        });

        diagnostics.queue.pending = fullStatusCounts.pending || 0;
        diagnostics.queue.crawling = fullStatusCounts.crawling || 0;
        diagnostics.queue.generating = fullStatusCounts.generating || 0;
        diagnostics.queue.parsing = fullStatusCounts.parsing || 0;
        diagnostics.queue.completed = fullStatusCounts.completed || 0;
        diagnostics.queue.failed = fullStatusCounts.failed || 0;
        diagnostics.queue.total = allJobs.length;
      }

      // Find stuck jobs (in progress states for >5 minutes)
      // Cache-busting: the .lt('updated_at', fiveMinutesAgo) already provides dynamic filtering
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      const { data: stuckJobs, error: stuckError } = await supabase
        .from('jobs')
        .select('id, status, created_at, updated_at, attempts, progress, message')
        .in('status', ['pending', 'crawling', 'generating', 'parsing'])
        .lt('updated_at', fiveMinutesAgo)
        .lt('created_at', now + 1000); // Additional cache-busting

      if (!stuckError && stuckJobs) {
        diagnostics.jobs.stuck = stuckJobs.map((job) => ({
          id: job.id,
          status: job.status,
          progress: job.progress,
          message: job.message,
          stuckForMinutes: Math.floor((now - job.updated_at) / 60000),
          attempts: job.attempts,
          createdAt: new Date(job.created_at).toISOString(),
          updatedAt: new Date(job.updated_at).toISOString(),
        }));
      }

      // Get oldest pending job
      // Cache-busting: use timestamp filter
      const { data: oldestPending, error: oldestError } = await supabase
        .from('jobs')
        .select('id, created_at, updated_at, attempts, input_url')
        .eq('status', 'pending')
        .lt('created_at', now + 1000)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!oldestError && oldestPending) {
        diagnostics.jobs.oldestPending = {
          id: oldestPending.id,
          createdAt: new Date(oldestPending.created_at).toISOString(),
          waitingForMinutes: Math.floor((now - oldestPending.created_at) / 60000),
          attempts: oldestPending.attempts,
          url: oldestPending.input_url,
        };
      }

      // Format recent jobs
      diagnostics.jobs.recent = recentJobs?.slice(0, 5).map((job) => ({
        id: job.id,
        status: job.status,
        progress: job.progress,
        message: job.message,
        ageMinutes: Math.floor((now - job.created_at) / 60000),
        attempts: job.attempts,
        url: job.input_url,
        createdAt: new Date(job.created_at).toISOString(),
        updatedAt: new Date(job.updated_at).toISOString(),
      })) || [];
    }
  } catch (error) {
    diagnostics.database.error = error instanceof Error ? error.message : 'Unknown error';
    diagnostics.database.connected = false;
  }

  // Determine overall health status
  const isHealthy =
    diagnostics.database.connected &&
    diagnostics.environment.hasSupabaseUrl &&
    diagnostics.environment.hasSupabaseKey &&
    diagnostics.environment.hasAnthropicKey &&
    diagnostics.jobs.stuck.length === 0;

  const warnings: string[] = [];

  if (!diagnostics.database.connected) {
    warnings.push('Database connection failed');
  }
  if (!diagnostics.environment.hasAnthropicKey) {
    warnings.push('ANTHROPIC_API_KEY not set');
  }
  if (diagnostics.jobs.stuck.length > 0) {
    warnings.push(`${diagnostics.jobs.stuck.length} stuck jobs detected`);
  }
  if (diagnostics.queue.pending > 10) {
    warnings.push(`Large pending queue: ${diagnostics.queue.pending} jobs`);
  }

  return NextResponse.json({
    status: isHealthy ? '✅ HEALTHY' : '⚠️ WARNING',
    warnings,
    ...diagnostics,
    actions: {
      manualTriggerWorker: '/api/worker/manual',
      viewWorkerHealth: '/api/worker/health',
      viewAllJobs: '/api/jobs/list',
      resetStuckJob: '/api/jobs/reset/[jobId]',
      forceProcessJob: '/api/jobs/force-process/[jobId]',
      debugJob: '/api/jobs/debug/[jobId]',
    },
  });
}
