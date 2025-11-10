/**
 * Manual worker trigger endpoint for debugging
 * This endpoint allows you to manually trigger the worker and see the response
 */

import { NextResponse } from 'next/server';

export async function GET() {
  console.log('[Manual Trigger] Starting manual worker trigger at', new Date().toISOString());

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                    'http://localhost:3000';

    const workerUrl = `${baseUrl}/api/worker`;

    console.log('[Manual Trigger] Calling worker at:', workerUrl);

    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-trigger-source': 'manual-trigger-endpoint',
      },
      body: JSON.stringify({ source: 'manual-trigger-endpoint' }),
    });

    const text = await response.text();
    let parsedBody;

    try {
      parsedBody = JSON.parse(text);
    } catch {
      parsedBody = { rawText: text };
    }

    console.log('[Manual Trigger] Worker response:', {
      status: response.status,
      statusText: response.statusText,
      body: parsedBody,
    });

    return NextResponse.json({
      success: true,
      workerUrl,
      response: {
        status: response.status,
        statusText: response.statusText,
        body: parsedBody,
      },
      triggered: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Manual Trigger] Error triggering worker:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      triggered: false,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
