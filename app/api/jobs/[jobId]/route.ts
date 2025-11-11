/**
 * API route for checking job status
 * Disables all Next.js caching to ensure fresh data from database
 */

// Force dynamic rendering - disable Next.js Full Route Cache
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { unstable_noStore as noStore } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/queue';

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
  'Pragma': 'no-cache',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  // Opt out of Next.js Data Cache
  noStore();
  try {
    const { jobId } = params;

    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404, headers: noStoreHeaders }
      );
    }

    return NextResponse.json(job, { headers: noStoreHeaders });
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
