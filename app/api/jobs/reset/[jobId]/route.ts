import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;

  console.log(`[Reset] Resetting job: ${jobId}`);

  try {
    // First, check if job exists
    const { data: job, error: fetchError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) {
      return NextResponse.json(
        {
          error: 'Job not found',
          jobId,
        },
        { status: 404 }
      );
    }

    // Reset the job to pending status
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        status: 'pending',
        progress: 0,
        message: 'Job reset - queued for retry',
        attempts: 0, // Reset attempts counter
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('[Reset] Error resetting job:', updateError);
      return NextResponse.json(
        {
          error: updateError.message,
          jobId,
        },
        { status: 500 }
      );
    }

    console.log(`[Reset] Successfully reset job: ${jobId}`);

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Job reset to pending status',
      previousStatus: job.status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Reset] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId,
      },
      { status: 500 }
    );
  }
}
