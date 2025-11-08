import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const now = Date.now();

  try {
    // Get pending jobs
    const { data: pendingJobs, error: pendingError } = await supabase
      .from('jobs')
      .select('id, created_at, updated_at, attempts, status')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (pendingError) {
      console.error('[Health] Error fetching pending jobs:', pendingError);
    }

    // Get recent jobs (last 10)
    const { data: recentJobs, error: recentError } = await supabase
      .from('jobs')
      .select('id, status, created_at, updated_at, attempts')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('[Health] Error fetching recent jobs:', recentError);
    }

    // Get stuck jobs (pending or crawling for >5 mins)
    const fiveMinutesAgo = new Date(now - 5 * 60 * 1000).toISOString();
    const { data: stuckJobs, error: stuckError } = await supabase
      .from('jobs')
      .select('id, status, created_at, updated_at, attempts')
      .in('status', ['pending', 'crawling'])
      .lt('updated_at', fiveMinutesAgo);

    if (stuckError) {
      console.error('[Health] Error fetching stuck jobs:', stuckError);
    }

    // Get jobs by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('jobs')
      .select('status');

    const statusDistribution: Record<string, number> = {};
    if (statusCounts && !statusError) {
      statusCounts.forEach((job) => {
        statusDistribution[job.status] = (statusDistribution[job.status] || 0) + 1;
      });
    }

    const lastRunTime = recentJobs?.[0]?.updated_at
      ? new Date(recentJobs[0].updated_at).toISOString()
      : null;

    const oldestPendingJob = pendingJobs?.[0];
    const oldestPendingAge = oldestPendingJob
      ? now - new Date(oldestPendingJob.created_at).getTime()
      : null;

    return NextResponse.json({
      health: {
        status: (stuckJobs?.length || 0) > 0 ? '⚠️ WARNING' : '✅ HEALTHY',
        timestamp: new Date(now).toISOString(),
      },
      queue: {
        pendingCount: pendingJobs?.length || 0,
        stuckCount: stuckJobs?.length || 0,
        oldestPendingJob: oldestPendingJob
          ? {
              id: oldestPendingJob.id,
              createdAt: new Date(oldestPendingJob.created_at).toISOString(),
              ageMinutes: Math.floor((oldestPendingAge || 0) / 60000),
              attempts: oldestPendingJob.attempts,
            }
          : null,
      },
      jobs: {
        pending: pendingJobs?.map((job) => ({
          id: job.id,
          createdAt: new Date(job.created_at).toISOString(),
          updatedAt: new Date(job.updated_at).toISOString(),
          ageMinutes: Math.floor((now - new Date(job.created_at).getTime()) / 60000),
          attempts: job.attempts,
        })),
        stuck: stuckJobs?.map((job) => ({
          id: job.id,
          status: job.status,
          createdAt: new Date(job.created_at).toISOString(),
          updatedAt: new Date(job.updated_at).toISOString(),
          stuckForMinutes: Math.floor(
            (now - new Date(job.updated_at).getTime()) / 60000
          ),
          attempts: job.attempts,
        })),
        recent: recentJobs?.slice(0, 5).map((job) => ({
          id: job.id,
          status: job.status,
          updatedAt: new Date(job.updated_at).toISOString(),
          attempts: job.attempts,
        })),
      },
      statistics: {
        statusDistribution,
        lastRun: lastRunTime,
      },
      actions: {
        triggerWorker: '/api/worker',
        viewAllJobs: '/api/jobs/list',
      },
    });
  } catch (error) {
    console.error('[Health] Unexpected error:', error);
    return NextResponse.json(
      {
        health: {
          status: '❌ ERROR',
          timestamp: new Date(now).toISOString(),
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
