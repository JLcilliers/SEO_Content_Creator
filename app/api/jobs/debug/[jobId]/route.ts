import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/queue';

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;

  console.log(`[Debug] Fetching details for job: ${jobId}`);

  try {
    const supabase = getSupabase();
    const { data: job, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      console.error('[Debug] Error fetching job:', error);
      return NextResponse.json({
        error: error.message,
        details: error
      }, { status: 500 });
    }

    if (!job) {
      return NextResponse.json({
        error: 'Job not found',
        jobId
      }, { status: 404 });
    }

    const now = Date.now();
    const createdAt = new Date(job.created_at).getTime();
    const updatedAt = new Date(job.updated_at).getTime();

    const timeSinceCreation = now - createdAt;
    const timeSinceUpdate = now - updatedAt;

    const isStuck =
      (job.status === 'pending' || job.status === 'crawling') &&
      timeSinceUpdate > 300000; // 5 minutes

    const shouldRetry = job.attempts < 3;

    return NextResponse.json({
      job: {
        ...job,
        created_at_formatted: new Date(job.created_at).toISOString(),
        updated_at_formatted: new Date(job.updated_at).toISOString(),
      },
      timing: {
        now: new Date(now).toISOString(),
        nowMs: now,
        timeSinceCreationMs: timeSinceCreation,
        timeSinceCreationMin: Math.floor(timeSinceCreation / 60000),
        timeSinceUpdateMs: timeSinceUpdate,
        timeSinceUpdateMin: Math.floor(timeSinceUpdate / 60000),
      },
      analysis: {
        isStuck,
        shouldRetry,
        stuckReason: isStuck
          ? `Job has been in '${job.status}' status for ${Math.floor(timeSinceUpdate / 60000)} minutes without updates`
          : null,
        recommendation: isStuck && shouldRetry
          ? 'Use force-process endpoint to manually trigger this job'
          : isStuck && !shouldRetry
          ? 'Job has exhausted retry attempts. Consider resetting or manual intervention.'
          : 'Job appears to be processing normally',
      },
      actions: {
        forceProcessUrl: `/api/jobs/force-process/${jobId}`,
        resetJobUrl: `/api/jobs/reset/${jobId}`,
      }
    });
  } catch (error) {
    console.error('[Debug] Unexpected error:', error);
    return NextResponse.json({
      error: 'Unexpected error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
