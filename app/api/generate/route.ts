/**
 * API route for creating content generation jobs
 * Returns job ID immediately for polling
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createJob } from '@/lib/queue';
import { normalizeUrl, splitKeywords } from '@/lib/normalize';

// Input validation schema
const GenerateSchema = z.object({
  url: z.string().url().startsWith('https'),
  topic: z.string().min(3).max(140),
  keywords: z.string().min(1),
  length: z.number().int().min(300).max(3000),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate input
    const body = await request.json();
    const validation = GenerateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    const { url, topic, keywords: keywordsRaw, length } = validation.data;

    // Normalize inputs
    const normalizedUrl = normalizeUrl(url);
    const keywords = splitKeywords(keywordsRaw);

    if (keywords.length === 0) {
      return NextResponse.json({ error: 'At least one keyword is required' }, { status: 400 });
    }

    if (keywords.length > 12) {
      return NextResponse.json(
        { error: 'Maximum 12 keywords allowed' },
        { status: 400 }
      );
    }

    // Validate each keyword length
    for (const keyword of keywords) {
      if (keyword.length < 1 || keyword.length > 60) {
        return NextResponse.json(
          { error: `Keyword "${keyword}" must be between 1 and 60 characters` },
          { status: 400 }
        );
      }
    }

    // Create job in queue
    const jobId = await createJob({
      url: normalizedUrl,
      topic,
      keywords,
      length,
    });

    console.log(`[API] Created job ${jobId} for ${normalizedUrl}`);

    // Return job ID immediately
    return NextResponse.json({
      jobId,
      message: 'Job created successfully. Use /api/jobs/[jobId] to check status.',
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'An unexpected error occurred. Please try again.',
      },
      { status: 500 }
    );
  }
}

// Only allow POST
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
