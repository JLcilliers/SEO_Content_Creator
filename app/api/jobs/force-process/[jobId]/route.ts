import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;

  console.log('='.repeat(50));
  console.log(`[FORCE] Manual force-process triggered for job: ${jobId}`);
  console.log(`[FORCE] Timestamp: ${new Date().toISOString()}`);
  console.log('='.repeat(50));

  try {
    // Determine worker URL
    const workerUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/worker`
      : process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/worker`
      : 'http://localhost:3000/api/worker';

    console.log(`[FORCE] Calling worker at: ${workerUrl}`);
    console.log(`[FORCE] Force job ID: ${jobId}`);

    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-force-job-id': jobId,
        'x-trigger-source': 'manual-force-process',
      },
      body: JSON.stringify({
        forceJobId: jobId,
        source: 'manual-force-process',
        timestamp: Date.now(),
      }),
    });

    const responseText = await response.text();

    console.log(`[FORCE] Worker response status: ${response.status}`);
    console.log(`[FORCE] Worker response: ${responseText.substring(0, 500)}`);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      jobId,
      workerUrl,
      response: responseData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[FORCE] Error triggering worker:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
