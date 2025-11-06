/**
 * Background worker endpoint - processes jobs from the queue
 * Can be called manually or via cron job
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNextPendingJob, updateJob, completeJob, failJob, JobStatus } from '@/lib/queue';
import { crawl } from '@/lib/scrape';
import { generateWithRefinement } from '@/lib/ai';
import { parseSections } from '@/lib/parse';

export const maxDuration = 300; // 5 minutes for worker

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get next job from queue
    const jobId = await getNextPendingJob();

    if (!jobId) {
      return NextResponse.json({ message: 'No pending jobs' });
    }

    console.log(`[Worker] Processing job ${jobId}`);

    // Get job details
    const { getJob } = await import('@/lib/queue');
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const { url, topic, keywords, length } = job.input;

    try {
      // Stage 1: Crawling
      await updateJob(jobId, {
        status: JobStatus.CRAWLING,
        progress: 10,
        message: `Crawling ${url}...`,
      });

      const maxPages = parseInt(process.env.SCRAPE_MAX_PAGES || '5', 10);
      const concurrency = parseInt(process.env.SCRAPE_CONCURRENCY || '3', 10);
      const timeoutMs = parseInt(process.env.SCRAPE_TIMEOUT_MS || '8000', 10);

      const crawlResult = await crawl(url, maxPages, concurrency, timeoutMs);
      const crawlDuration = Date.now() - startTime;

      console.log(`[Worker] Job ${jobId}: Crawled ${crawlResult.pages.length} pages in ${crawlDuration}ms`);

      await updateJob(jobId, {
        status: JobStatus.CRAWLING,
        progress: 30,
        message: `Crawled ${crawlResult.pages.length} pages`,
      });

      // Stage 2: AI Generation
      await updateJob(jobId, {
        status: JobStatus.GENERATING,
        progress: 40,
        message: 'Generating SEO content with AI...',
      });

      const finalText = await generateWithRefinement(
        crawlResult.context,
        topic,
        keywords,
        length
      );

      const genDuration = Date.now() - startTime;
      console.log(`[Worker] Job ${jobId}: AI generation completed in ${genDuration}ms`);

      await updateJob(jobId, {
        status: JobStatus.GENERATING,
        progress: 80,
        message: 'Content generated successfully',
      });

      // Stage 3: Parsing
      await updateJob(jobId, {
        status: JobStatus.PARSING,
        progress: 90,
        message: 'Parsing and formatting content...',
      });

      const parsed = parseSections(finalText);

      // Complete job
      await completeJob(jobId, {
        metaTitle: parsed.metaTitle,
        metaDescription: parsed.metaDescription,
        contentMarkdown: parsed.contentMarkdown,
        faqRaw: parsed.faqRaw,
        schemaJsonString: parsed.schemaJsonString,
        pages: crawlResult.pages,
      });

      const totalDuration = Date.now() - startTime;
      console.log(`[Worker] Job ${jobId}: Completed in ${totalDuration}ms`);

      return NextResponse.json({
        success: true,
        jobId,
        duration: totalDuration,
      });
    } catch (error) {
      console.error(`[Worker] Job ${jobId} failed:`, error);
      await failJob(
        jobId,
        error instanceof Error ? error.message : 'Unknown error occurred'
      );

      return NextResponse.json(
        {
          success: false,
          jobId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Worker] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Allow GET for manual triggering
export async function GET(request: NextRequest) {
  return POST(request);
}
