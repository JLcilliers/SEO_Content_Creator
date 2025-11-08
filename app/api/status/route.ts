/**
 * System status endpoint - shows queue health and worker status
 * Access at: /api/status
 */

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/queue';

export async function GET() {
  try {
    const client = getSupabase();
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hour

    // Get job statistics for the last hour
    const { data: recentJobs, error } = await client
      .from('jobs')
      .select('id, status, created_at, updated_at, attempts')
      .gte('created_at', oneHourAgo);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch job statistics', details: error.message },
        { status: 500 }
      );
    }

    // Group jobs by status
    const statusCounts = recentJobs?.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Find stuck jobs (processing for more than 10 minutes)
    const stuckThreshold = now - 600000; // 10 minutes
    const stuckJobs = recentJobs?.filter(job =>
      ['crawling', 'generating', 'parsing'].includes(job.status) &&
      job.updated_at < stuckThreshold
    ) || [];

    // Find failed jobs
    const failedJobs = recentJobs?.filter(job => job.status === 'failed') || [];

    // Environment check
    const envCheck = {
      hasVercelUrl: !!process.env.VERCEL_URL,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercelUrlSet: process.env.VERCEL_URL ? 'configured' : 'not set',
    };

    // Calculate average processing time for completed jobs
    const completedJobs = recentJobs?.filter(job => job.status === 'completed') || [];
    const avgProcessingTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, job) => sum + (job.updated_at - job.created_at), 0) / completedJobs.length
      : 0;

    return NextResponse.json({
      timestamp: now,
      lastHourStats: {
        total: recentJobs?.length || 0,
        byStatus: statusCounts,
        pending: statusCounts['pending'] || 0,
        processing: (statusCounts['crawling'] || 0) + (statusCounts['generating'] || 0) + (statusCounts['parsing'] || 0),
        completed: statusCounts['completed'] || 0,
        failed: statusCounts['failed'] || 0,
      },
      health: {
        stuckJobs: stuckJobs.length,
        stuckJobIds: stuckJobs.map(j => j.id),
        failedJobs: failedJobs.length,
        failedJobIds: failedJobs.map(j => j.id).slice(0, 5), // Show first 5
        avgProcessingTimeMs: Math.round(avgProcessingTime),
        avgProcessingTimeSec: Math.round(avgProcessingTime / 1000),
      },
      environment: envCheck,
      worker: {
        cronSchedule: '* * * * * (every minute)',
        maxDuration: '300s (5 minutes)',
        recommendation: stuckJobs.length > 0
          ? 'Stuck jobs detected - check worker logs'
          : failedJobs.length > 3
          ? 'Multiple failures - check API keys and Supabase connection'
          : 'System healthy'
      }
    });
  } catch (error) {
    console.error('[Status] Error fetching system status:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch system status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
