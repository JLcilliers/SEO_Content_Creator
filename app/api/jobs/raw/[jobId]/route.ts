/**
 * Raw job data endpoint - bypasses all caching
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/queue';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;

  try {
    const supabase = getSupabase();

    // Force fresh query with timestamp cache-busting
    const now = Date.now();
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .lt('created_at', now + 1000)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        {
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Job not found' },
        {
          status: 404,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        }
      );
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('[Raw Job API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  }
}
