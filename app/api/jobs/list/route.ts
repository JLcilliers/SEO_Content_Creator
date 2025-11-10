import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/queue';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    const supabase = getSupabase();

    // Use timestamp filter to bust Supabase query cache
    // PostgREST caches queries with identical parameters, so adding a dynamic timestamp ensures fresh results
    const now = Date.now();

    let query = supabase
      .from('jobs')
      .select('id, status, created_at, updated_at, attempts, input_url, input_topic')
      .lt('created_at', now + 1000) // Cache-busting: will match all jobs created before now+1s
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: jobs, error } = await query;

    if (error) {
      console.error('[List] Error fetching jobs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const jobsWithDetails = jobs?.map((job) => ({
      id: job.id,
      status: job.status,
      createdAt: new Date(job.created_at).toISOString(),
      updatedAt: new Date(job.updated_at).toISOString(),
      ageMinutes: Math.floor((now - new Date(job.created_at).getTime()) / 60000),
      lastUpdateMinutes: Math.floor(
        (now - new Date(job.updated_at).getTime()) / 60000
      ),
      attempts: job.attempts,
      url: job.input_url,
      topic: job.input_topic,
    }));

    return NextResponse.json({
      jobs: jobsWithDetails,
      count: jobsWithDetails?.length || 0,
      total: jobsWithDetails?.length || 0, // Alias for count
      filter: status || 'all',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[List] Unexpected error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
