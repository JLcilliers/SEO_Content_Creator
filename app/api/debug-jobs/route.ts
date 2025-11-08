/**
 * DEBUG ENDPOINT - Shows all jobs directly from Supabase
 * Use this to bypass any caching and see what's actually in the database
 */

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/queue';

export async function GET() {
  try {
    const client = getSupabase();

    // Get ALL jobs (not filtered) to see what exists
    const { data: allJobs, error: allError } = await client
      .from('jobs')
      .select('id, status, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (allError) {
      return NextResponse.json({ error: allError.message }, { status: 500 });
    }

    // Get pending jobs specifically
    const { data: pendingJobs, error: pendingError } = await client
      .from('jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (pendingError) {
      return NextResponse.json({ error: pendingError.message }, { status: 500 });
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      allJobsCount: allJobs?.length || 0,
      pendingJobsCount: pendingJobs?.length || 0,
      recentJobs: allJobs,
      pendingJobs: pendingJobs,
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
